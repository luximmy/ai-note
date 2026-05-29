# ai-note 项目技术深度解析

> 更新时间：2026-05-29

## 1. 项目概览

ai-note 是一个 AI-Native 的块编辑知识库，目标是将个人笔记转化为"可计算、可交互的第二大脑"。项目采用 Next.js 16 (App Router) + React 19 全栈架构，集成了 RAG 语义检索、Generative UI、知识图谱三大 AI 能力。

**核心数据**：
- 6 张数据库表（users, documents, blocks, block_embeddings, chat_sessions, chat_messages）
- 5 种区块类型（paragraph, heading, code, todo, generative_ui）
- 4 种 AI 组件（TaskBoard, DataTable, MermaidDiagram, Timeline）
- 10 个 Server Actions + 14 个 API Routes
- 110 个单元测试用例

**技术栈**：Next.js 16 + React 19 + TypeScript + Tiptap + Zustand + Tailwind CSS + shadcn/ui + SQLite (Drizzle ORM) + Vercel AI SDK + DeepSeek + DashScope Qwen3 Embedding

---

## 2. 架构设计

项目采用三层架构，职责清晰分离：

```
┌─────────────────────────────────────────────────┐
│  视图层 (Components)                              │
│  BlockRenderer / ChatPanel / GraphView / AppShell │
├─────────────────────────────────────────────────┤
│  逻辑层 (Actions + API Routes + Lib)              │
│  Server Actions / /api/chat / /api/rewrite        │
│  embedding-store / wikilink-parser / auth          │
├─────────────────────────────────────────────────┤
│  数据层 (DB)                                      │
│  SQLite + Drizzle ORM + 6 张表                    │
└─────────────────────────────────────────────────┘
```

**渲染边界**：
- **Server Components**（默认）：`layout.tsx`、`page.tsx` 负责从 DB 加载数据，传递给子组件
- **Client Components**（`"use client"`）：`BlockRenderer`、`ChatPanel`、`GraphView` 等需要交互的组件
- 规则：只有涉及 DOM 事件、React Hooks、浏览器 API 的组件才标记为 Client Component

**数据流**：
1. Server Component 通过 `queries.ts` 从 SQLite 读取数据
2. Client Component 通过 Server Actions 修改数据（无需 fetch）
3. 乐观更新 → 防抖提交 → 服务端确认 → 失败回滚
4. AI 功能走独立 API Routes（`/api/chat`、`/api/rewrite`、`/api/generate-ui`）

---

## 3. 块编辑器架构

### 3.1 类型系统：辨析联合类型

```ts
type Block = ParagraphBlock | HeadingBlock | CodeBlock | TodoBlock | GenerativeUIBlock;
```

每种区块通过 `type` 字段区分，`attributes` 字段承载类型专属数据。这种设计的好处：
- TypeScript 的类型收窄（narrowing）确保渲染时只能访问当前类型的 attributes
- 新增区块类型只需：定义接口 → 注册到 BlockRegistry → 实现渲染组件
- 消除了"不可能的状态"（如 heading 没有 level）

### 3.2 渲染分发：注册表模式

```ts
const BlockRegistry: Record<string, React.FC<BlockComponentProps>> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  code: CodeBlock,
  todo: TodoBlock,
  generative_ui: GenerativeUIBlock,
};
```

相比 switch-case，注册表模式的优势：
- 新增类型无需修改分发逻辑
- 支持动态注册（未来可扩展插件系统）
- 类型安全：注册表的 key 与 BlockType 联动

### 3.3 乐观更新：双缓冲策略

这是编辑器最核心的设计，解决的问题是：**如何让用户在编辑时感觉不到网络延迟，同时保证数据不丢失？**

**两块缓冲区**：
- `blocks`（前缓冲）：用户看到的 UI 状态，每次按键立即更新
- `safeSnapshot`（后缓冲）：最后一次服务端确认的状态，用于失败回滚

**保存流程**：
```
用户按键 → 立即更新 blocks（前缓冲）
         → 合并到 pendingUpdatesRef
         → 重置 800ms 防抖定时器
         → 800ms 无操作后 → 生成序列号 → 发送到服务端
         → 成功：更新 safeSnapshot（后缓冲）
         → 失败：从 safeSnapshot 恢复 blocks + toast 提示 + router.refresh()
```

**为什么不用 React 的 `useOptimistic`？** 在连续编辑场景下，`useOptimistic` 的 Transition 时序与防抖窗口容易错位，导致 UI 回跳。双缓冲策略更可控。

### 3.4 请求序号乱序防护

快速打字时，可能有多个防抖保存请求同时在飞。如果较早的请求比晚的请求晚到，会用旧数据覆盖新数据。

**解决方案**：
- `requestSeqRef`：全局递增的序列号生成器
- `lastResolvedVersionRef`：每个 block 最后确认的序列号

每次请求携带序列号，响应返回时检查：如果 `currentSeq < lastResolvedVersion`，说明这是过期响应，静默丢弃。这本质上是一个简化版的 Lamport 时间戳。

### 3.5 拖拽排序

使用 `@dnd-kit` 实现，关键细节：
- `PointerSensor` 设置 `distance: 5`，防止点击时误触拖拽
- `DragOverlay` 复制精确布局（含 grip handle 和 delete button 的占位 div），消除拖拽开始时的水平跳动
- 拖拽结束时乐观更新两个缓冲区，失败则回滚

---

## 4. RAG 语义检索链路

### 4.1 整体流程

```
用户提问 → 提取最后一条消息作为 query
        → DashScope Qwen3 Embedding 转为 1024 维向量
        → 与所有 block 的向量做余弦相似度
        → 取 Top-5 结果注入 System Prompt
        → DeepSeek 生成带 [N] 引用标记的回答
        → 客户端解析 [N] 渲染为可点击的引用气泡
```

### 4.2 向量存储

每个 block 的文本内容经过预处理（去除 HTML 标签、去除 wikilink 语法、截断到 8000 字符）后，通过 DashScope `text-embedding-v3` 模型转为 1024 维的 `Float32Array`，以二进制 BLOB 存储在 SQLite 的 `block_embeddings` 表中。

**为什么用 SQLite BLOB 而不是专用向量数据库？**
- 项目是个人知识库，数据量在几百到几千个 block，暴力搜索在毫秒级完成
- 零外部依赖，部署简单
- 如果未来数据量增长到 10 万+，可以迁移到 pgvector (HNSW 索引) 或 Qdrant

### 4.3 余弦相似度

手写实现，单次遍历：

```ts
function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
```

为什么手写而不引入 `ml-matrix`？1024 维的 Float32Array 循环在 V8 中执行很快（微秒级），不需要额外依赖。

### 4.4 引用溯源

引用不是让 LLM 输出结构化 JSON（容易出错），而是：
1. System Prompt 要求 LLM 用 `[1]`、`[2]` 标记引用
2. 检索结果作为 `data-citations` 数据 part 随流式响应一起发送
3. 客户端解析文本中的 `[N]` 标记，匹配对应的引用源

这种"内联标记 + 侧信道数据"的模式比结构化输出更可靠。

### 4.5 增量更新策略

- block 内容变更时，fire-and-forget 触发重新 embedding
- block 删除时，CASCADE 自动清理 embedding
- 服务端启动时，`backfillMissingEmbeddings()` 补全缺失的 embedding（最终一致性）

---

## 5. Generative UI 方案

### 5.1 设计理念

传统 AI 对话只能输出文本和 Markdown。Generative UI 让 AI 返回**可交互的 React 组件**，比如任务看板、数据表格、流程图、时间线。

### 5.2 实现流程

```
用户在 GenerativeUIBlock 中输入描述（如"帮我做一个项目进度表"）
  → POST /api/generate-ui，发送 prompt + 当前笔记上下文
  → DeepSeek 根据 System Prompt 中的组件规范，返回 JSON 代码块
  → 客户端流式接收，extractJsonFromStream() 实时解析
  → 解析成功后通过 AIComponentRegistry 动态渲染对应组件
  → 组件内部状态变更通过 onUpdateProps 回写到编辑器 attributes
```

### 5.3 组件注册表

```ts
const AIComponentRegistry = {
  TaskBoard: TaskBoard,
  DataTable: DataTable,
  MermaidDiagram: MermaidDiagram,
  Timeline: Timeline,
};
```

未知的 componentId 会显示降级 UI（amber 色块 + 原始 props），不会崩溃。

### 5.4 流式 JSON 提取

`extractJsonFromStream` 的解析策略：
1. 优先从 ` ```json ... ``` ` 代码块中提取
2. 降级：找第一个 `{` 到最后一个 `}`，尝试 `JSON.parse`
3. 都失败返回 `null`（继续等待更多 chunk）

### 5.5 双向状态同步

以 TaskBoard 为例：用户点击任务切换状态（todo → in-progress → done）→ `onUpdateProps` 回调 → `BlockRenderer` 更新 block 的 attributes → 触发防抖保存。这实现了"AI 生成的内容可以被用户交互修改"的效果。

---

## 6. 知识图谱

### 6.1 Wikilink 解析

`[[笔记标题]]` 语法的处理链路：
1. `wikilink-parser.ts`：从纯文本中提取所有 `[[title]]`，解析为 `Wikilink[]`
2. `wikilink-decoration.ts`：ProseMirror 插件，用 `Decoration.inline` 给 `[[...]]` 添加 CSS 类和点击事件
3. 点击时通过 `document.caretRangeFromPoint` 定位 DOM → 向上查找 `.wikilink` 祖先 → 用 TreeWalker 计算字符偏移 → 验证在 `[[...]]` 内 → 解析标题 → 跳转

### 6.2 反向链接

`getBacklinksForNote(noteId)` 遍历所有文档的所有 block，用正则匹配 `[[title]]`，收集引用当前笔记的来源。结果在 `BacklinksPanel` 中展示，包含来源笔记标题和上下文预览。

### 6.3 力导向图谱

使用 `d3-force` 进行物理模拟：
- `forceLink`（距离 120px）：有 wikilink 引用关系的节点相连
- `forceManyBody`（斥力 -300）：节点互斥，自然分散
- `forceCollide`（半径 + 10px padding）：防止节点重叠

**节点大小**：`8 + Math.sqrt(backlinkCount) * 6`，平方根缩放防止高连接度节点过大。

### 6.4 Canvas 渲染

选择 Canvas 而非 SVG 的原因：知识图谱可能有上百个节点/边，SVG 会创建上百个 DOM 元素，Canvas 只有一个位图，DOM 开销 O(1)。

关键实现细节：
- DPI 适配：Canvas 尺寸设为 `width * devicePixelRatio`，`ctx.setTransform(dpr, ...)` 缩放
- 缩放/平移：手动维护 `scale`/`offsetX`/`offsetY`，滚轮缩放以鼠标位置为锚点
- 点击判定：`dx * dx + dy * dy < r * r`（距离平方比较，避免 Math.sqrt 开销）
- 模拟结束时 auto-fit：计算所有节点的包围盒，调整视口使其居中显示
- ResizeObserver + 100ms 防抖：窗口大小变化时重新绘制但不重启模拟

---

## 7. 认证系统

### 7.1 技术选型

- **JWT**（jose 库）：无状态 token，HS256 算法，7 天有效期
- **bcryptjs**：纯 JS 实现的密码哈希（salt rounds = 10），避免 native binding 问题
- **httpOnly cookie**：token 通过 cookie 传递，JS 无法读取，防 XSS 窃取

### 7.2 数据隔离

所有文档查询都带 `userId` 过滤：
```ts
// queries.ts
const doc = db.select().from(documents)
  .where(and(eq(documents.id, id), eq(documents.userId, userId)))
  .get();
```

Server Actions 通过 `requireAuth()` 统一验证：
```ts
async function requireAuth(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error('未登录');
  return session.userId;
}
```

### 7.3 路由保护

`middleware.ts` 拦截 `/app/*` 路由，未登录用户重定向到 `/login`。已登录用户访问 `/login`、`/register` 时重定向到 `/app`。

### 7.4 数据迁移

已有数据库的迁移策略：`migrate.ts` 为 `documents` 表添加 `user_id` 列，创建默认用户 `user_default`。首个注册用户通过 `migrateDefaultUserDocuments()` 自动接管种子文档。

---

## 8. 关键技术决策与取舍

| 决策 | 选择 | 原因 | 替代方案 |
|------|------|------|----------|
| 数据库 | SQLite | 零依赖，文件级部署，demo 足够 | PostgreSQL (生产级，但需要额外部署) |
| 向量存储 | SQLite BLOB + 暴力搜索 | 简单，数据量小够用 | Qdrant / pgvector (需额外基础设施) |
| 编辑器 | Tiptap | Headless、可扩展、社区活跃 | Slate (API 更底层，学习曲线陡) |
| 状态管理 | Zustand | 轻量、无 Provider、TypeScript 友好 | Redux (过重)、Jotai (原子化但不够直观) |
| AI 模型 | DeepSeek | 国内访问快、成本低、OpenAI 兼容 | OpenAI (贵)、Qwen (需要额外适配) |
| 认证 | JWT + bcryptjs | 纯 JS 实现，兼容 Edge Runtime | NextAuth (更重，黑盒) |
| 图谱渲染 | Canvas | DOM 开销 O(1)，适合大量节点 | SVG (每个节点一个 DOM，性能差) |

---

## 9. 性能优化清单

1. **编辑器防抖保存**：800ms 防抖合并高频按键，减少网络请求
2. **请求序号过滤**：过期响应直接丢弃，避免无意义的 state 更新
3. **向量搜索增量更新**：block 变更时 fire-and-forget 重新 embedding，不阻塞主流程
4. **启动时 backfill**：补全缺失 embedding，保证最终一致性
5. **Canvas 渲染**：图谱用 Canvas 而非 SVG，避免 DOM 节点爆炸
6. **模拟不重启**：窗口 resize 时只重绘，不重启 d3-force 模拟
7. **Mermaid 动态加载**：`import()` 按需加载，减少首屏 bundle
8. **Tiptap `immediatelyRender: false`**：避免 SSR hydration mismatch
9. **DecorationSet.map**：wikilink 装饰器增量更新，避免全文档重扫
10. **globalThis 单例**：SQLite 连接防多 worker 重复打开
