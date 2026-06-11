# ai-note 项目技术深度解析

> 更新时间：2026-05-29（第二版：补充代码走读）

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

---

## 10. 代码走读：核心文件逐行理解

> 本节是面试准备的核心。每个模块从入口开始，逐步拆解关键代码，标注行号，解释"这行在做什么"和"为什么要这样做"。

### 10.1 BlockRenderer.tsx — 编辑器的大脑

**文件**：`src/components/editor/BlockRenderer.tsx`（569 行）
**职责**：管理所有区块的状态、保存、回滚、拖拽、插入

#### 核心状态（第 87-101 行）

```
第 87 行  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
第 88 行  const blocksRef = useRef<Block[]>(initialBlocks);
第 89 行  const [safeSnapshot, setSafeSnapshot] = useState<Block[]>(initialBlocks);
第 90 行  const safeSnapshotRef = useRef<Block[]>(initialBlocks);
```

**理解要点**：
- `blocks` 是"前缓冲"——用户看到的 UI，每次按键立即更新
- `safeSnapshot` 是"后缓冲"——最后一次服务端确认的状态，用于失败回滚
- 每个 state 都有一个对应的 ref（第 88、90 行）。**为什么要 ref？** 因为 setTimeout 的闭包和事件回调中读不到最新的 state（React 的 state 是快照），ref 永远指向最新值

```
第 98 行  const requestSeqRef = useRef(0);
第 100 行 const lastResolvedVersionRef = useRef<Record<string, number>>({});
```

**理解要点**：
- `requestSeqRef` 是"发号器"——每次发请求前 +1，生成一个递增的序列号
- `lastResolvedVersionRef` 是"记录本"——记录每个 block 最后一次成功保存的序列号
- 这两个配合实现乱序防护：如果收到的响应序列号比记录的小，说明是过期响应，丢弃

#### 上下文同步（第 103-119 行）

```
第 103 行 useEffect(() => {
第 104 行   const contextText = blocks.map((b) => {
第 105 行     const text = stripHtml(b.content || '');
第 106 行     if (b.type === 'todo')
第 107 行       return `[${b.attributes?.checked ? 'x' : ' '}] ${text}`;
           // ... 其他类型的格式化
第 118 行   setNoteContext(`当前文档内容如下：\n\n${contextText}`);
第 119 行 }, [blocks, setNoteContext]);
```

**理解要点**：
- 每次 blocks 变化，把所有区块内容序列化成纯文本，写入 Zustand 的 `noteContext`
- AI 聊天时会读取 `noteContext` 注入到 System Prompt，让 AI 知道用户当前在看什么
- 不同类型有不同格式：todo 显示 `[x]`/`[ ]`，heading 显示 `#`，code 显示 ` ``` `

#### 保存流程：updateBlockData（第 225-277 行）

```
第 225 行 const updateBlockData = useCallback((id: string, updates: Partial<Block>) => {
第 227 行   // 第一步：立即更新前缓冲（用户立刻看到变化）
第 227 行   setBlocks((prevBlocks) =>
第 228 行     prevBlocks.map((block) => {
第 229 行       if (block.id === id) {
第 230 行         return { ...block, ...updates,
第 233 行           attributes: { ...(block.attributes || {}), ...(updates.attributes || {}) }
第 235 行         } as Block;
             }
             return block;
           }),
         );
```

**理解要点**：
- 这是用户每次按键的入口。比如用户在段落中打了一个字，ParagraphBlock 的 Tiptap 触发 `onUpdate`，调用这个函数
- 第一步是立即更新 `blocks`（前缓冲），用户立刻看到新内容
- attributes 用展开运算符合并，保留旧属性只更新变化的部分

```
第 243 行   // 第二步：合并到 pendingUpdates（防抖缓冲区）
第 243 行   const currentPending = pendingUpdatesRef.current[id] || {};
第 249 行   pendingUpdatesRef.current[id] = {
              ...currentPending, ...updates,
              ...(Object.keys(mergedAttributes).length > 0 ? { attributes: mergedAttributes } : {}),
            } as Partial<Block>;
```

**理解要点**：
- `pendingUpdatesRef` 是一个"待发送缓冲区"，每次按键把更新合并进去
- 如果用户快速打了 5 个字，5 次更新会被合并成一个，只发一次请求

```
第 257 行   // 第三步：重置防抖定时器
第 257 行   if (timersRef.current[id]) {
第 258 行     clearTimeout(timersRef.current[id]);
            }
第 261 行   timersRef.current[id] = setTimeout(() => {
第 262 行     const finalUpdates = pendingUpdatesRef.current[id];
第 263 行     if (finalUpdates) {
第 265 行       requestSeqRef.current += 1;      // 发号器 +1
第 266 行       const currentSeq = requestSeqRef.current; // 捕获到闭包中
第 269 行       commitBlockUpdate(id, finalUpdates, currentSeq); // 发送请求
              }
              delete timersRef.current[id];
              delete pendingUpdatesRef.current[id];
第 274 行   }, 800); // 800ms 防抖
```

**理解要点**：
- 每次按键都清除旧定时器、设置新定时器。只有停止打字 800ms 后才真正发请求
- 第 265-266 行是关键：在发请求前生成序列号，并捕获在闭包中。这样即使后续有更新的请求先完成，这个旧请求的回调仍然能用自己当时的序列号做比较

#### 保存结果处理：commitBlockUpdate（第 144-223 行）

```
第 144 行 const commitBlockUpdate = useCallback(
            async (blockId: string, updates: Partial<Block>, currentSeq: number) => {
第 147 行   const result = await updateBlockAction(noteId, blockId, updates);
第 149 行   if (result.success) {
第 151 行     const lastResolved = lastResolvedVersionRef.current[blockId] || 0;
第 153 行     if (currentSeq < lastResolved) {
                // 过期响应！丢弃
                emitSaveEvent({ type: 'out_of_order', ... });
                return;
              }
第 166 行     lastResolvedVersionRef.current[blockId] = currentSeq; // 更新记录本
第 169 行     setSafeSnapshot((prev) =>                   // 推进安全快照
                prev.map((b) => b.id === blockId ? { ...b, ...updates } : b)
              );
              }
```

**理解要点**：
- 第 153 行是乱序防护的核心：`currentSeq < lastResolved` 意味着"在我等待网络响应的这段时间里，已经有更新的请求成功了，所以我这个响应是过期的"
- 如果不是过期的，更新记录本（第 166 行）并推进安全快照（第 169 行）
- **类比**：就像排队叫号，你拿到的是 5 号，但叫到你的时候发现 6 号已经处理完了，说明你的号过期了

#### 失败回滚（第 192-220 行）

```
第 192 行 } catch (err) {
第 202 行   toast.error('区块保存失败', {
              description: '网络抖动，已自动恢复该部分内容。',
            });
第 207 行   setBlocks((prevBlocks) => {
              const safeBlock = safeSnapshotRef.current.find((b) => b.id === blockId);
              if (!safeBlock) return prevBlocks;
              return prevBlocks.map((b) => (b.id === blockId ? safeBlock : b));
            });
第 215 行   setForceSyncToken((prev) => prev + 1);
第 217 行   startTransition(() => { router.refresh(); });
```

**理解要点**：
- 网络失败时，从 `safeSnapshot` 中找到这个 block 的最后确认版本，替换回 `blocks`
- `forceSyncToken` +1 会传递给子组件，强制 Tiptap 编辑器重新同步内容（否则编辑器内部状态还是旧的）
- `router.refresh()` 在 `startTransition` 中调用，让 Next.js 重新从服务端获取数据，确保 UI 和服务端一致
- **关键细节**：只回滚失败的那个 block，不是回滚所有 block。其他 block 不受影响

#### 拖拽排序（第 393-451 行）

```
第 394 行 const sensors = useSensors(
            useSensor(PointerSensor, {
              activationConstraint: { distance: 5 },
            }),
            useSensor(KeyboardSensor, { ... }),
          );
```

**理解要点**：
- `distance: 5` 是关键：用户必须移动鼠标 5 像素才触发拖拽。如果没有这个，用户点击编辑器时光标稍微移动就会误触拖拽

```
第 411 行 const handleDragEnd = async (event: DragEndEvent) => {
第 416 行   const oldIndex = blocks.findIndex((b) => b.id === active.id);
第 417 行   const newIndex = blocks.findIndex((b) => b.id === over.id);
第 420 行   const newBlocks = arrayMove(blocks, oldIndex, newIndex);
第 421 行   setBlocks(newBlocks);           // 乐观更新
第 422 行   setSafeSnapshot(newBlocks);     // 结构性改变，同步推进快照
              // ... 服务端同步，失败回滚
```

**理解要点**：
- 拖拽和编辑不同：编辑是"先更新前缓冲，后推进后缓冲"，拖拽是"两个缓冲同时推进"
- 因为拖拽是原子操作（要么成功要么失败），不存在"部分保存"的情况

---

### 10.2 RichTextEditor.tsx — 富文本编辑器

**文件**：`src/components/editor/RichTextEditor.tsx`（347 行）
**职责**：基于 Tiptap 的单个区块的富文本编辑器，处理输入、斜杠菜单、AI 重写

#### Tiptap 初始化（第 79-197 行）

```
第 79 行 const editor = useEditor({
第 80 行   immediatelyRender: false,  // 不在 SSR 时渲染（ProseMirror 是纯浏览器端的）
第 81 行   autofocus: autoFocus ? 'end' : false,
第 82 行   extensions: [
第 83 行     StarterKit.configure({
第 84 行       heading: false,     // 禁用！标题在块级别处理
第 85 行       codeBlock: false,   // 禁用！代码块在块级别处理
            }),
第 87 行     Placeholder.configure({
              placeholder: '输入内容，或输入 "/" 唤起菜单...',
            }),
          ],
```

**理解要点**：
- `immediatelyRender: false`：Tiptap/ProseMirror 是浏览器端库，不能在服务端渲染。如果不加这个，Next.js SSR 会报错
- `heading: false, codeBlock: false`：为什么禁用？因为我们的编辑器是"一个 block 一个 Tiptap 实例"，标题和代码块由专门的 HeadingBlock 和 CodeBlock 组件处理，不需要 Tiptap 内联处理

#### IME 中文输入处理（第 131-141 行）

```
第 131 行 compositionstart: () => {
            isComposingRef.current = true;
            return false;
          },
第 135 行 compositionend: () => {
            isComposingRef.current = false;
            setTimeout(() => {
              if (editor) onUpdateRef.current(editor.getHTML());
            }, 0);
            return false;
          },
```

**理解要点**：
- 中文输入法打字时，比如打"你好"，会先输入拼音 "nihao"，每输入一个字母都会触发 onUpdate
- 如果每次都触发保存，会导致：保存了 "n"、"ni"、"nih"、"niha"、"nihao" 这些中间态
- `compositionstart` 时设标志位，`onUpdate` 里检查标志位直接 return（第 194 行）
- `compositionend` 时用 `setTimeout(0)` 延迟同步，因为浏览器在 compositionend 触发时可能还没把最终字符写入 DOM

#### 斜杠菜单触发（第 143-188 行）

```
第 143 行 keydown: (view, event) => {
第 145 行   if (isSlashMenuOpenRef.current) {
              // 菜单开着时，上下键和回车被菜单接管
              if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
                return true; // 告诉 Tiptap：我处理了，你别管
              }
            }
第 161 行   if (event.key === '/' && !isComposingRef.current) {
第 169 行     const isAtStartOfLine = $from.parentOffset === 0;
              // 获取 / 前面的字符
第 172 行     const charBefore = $from.parent.textContent.slice(
                $from.parentOffset - 1, $from.parentOffset
              );
              // 行首或前面是空格才触发
第 180 行     if (isAtStartOfLine || charBefore === ' ') {
                // 打开菜单
              }
            }
```

**理解要点**：
- 斜杠菜单不是 Tiptap 扩展，而是 DOM 级别的 keydown 事件拦截
- 为什么要用 ref（`isSlashMenuOpenRef`）而不是直接读 state？因为 DOM 事件处理器是同步执行的，读不到同一个渲染周期内更新的 React state
- `return true` 表示"我处理了这个事件"，Tiptap 就不会处理（不会移动光标）
- `return false` 表示"我没处理"，Tiptap 正常处理（"/" 字符会被输入到编辑器中）

#### AI 重写的两阶段插入（第 234-306 行）

```
第 260 行 let isFirstChunk = true;
第 261 行 let fullText = '';

第 269 行 while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

第 279 行   if (isFirstChunk) {
              editor.chain().focus().deleteRange({ from, to }).run(); // 删旧文字
              isFirstChunk = false;
            }

第 286 行   const displayHtml = chunk.replace(/\n/g, '<br>');
            editor.chain().focus().insertContent(displayHtml).run(); // 流式插入
          }

第 291 行 if (fullText) {
            // 流结束后：把所有内容替换为正确的 <p> HTML
            const endPos = editor.state.doc.content.size;
            editor.chain().focus()
              .deleteRange({ from, to: endPos })
              .insertContentAt(from, toHtml(fullText))
              .run();
          }
```

**理解要点**：
- **第一阶段**（流式接收中）：逐 chunk 插入，换行用 `<br>`。为什么不用 `<p>`？因为 ProseMirror 在流式插入 `<p>` 标签时会创建新的段落节点，导致光标跳动
- **第二阶段**（流结束后）：把之前插入的所有内容删掉，替换为正确的 `<p>` HTML 段落
- **类比**：就像先用铅笔快速写草稿（`<br>`），最后再用钢笔誊写一遍（`<p>`）

---

### 10.3 api/chat/route.ts — RAG + 流式对话

**文件**：`src/app/api/chat/route.ts`（154 行）
**职责**：AI 聊天的后端入口，负责 RAG 检索、System Prompt 构建、流式响应

#### RAG 检索（第 32-41 行）

```
第 32 行 const lastUserMessage = [...messages].reverse()
            .find((m) => m.role === 'user');
第 35 行 const query = lastUserMessage?.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join(' ') || '';

第 41 行 const sources = await searchNotes(query, 5);
```

**理解要点**：
- 只用最后一条用户消息作为检索 query，不用整个对话历史
- `searchNotes(query, 5)` 内部：query → Embedding 向量 → 和所有 block 向量算余弦相似度 → 取 Top 5

#### System Prompt 构建（第 44-128 行）

```
第 44 行 const sourcesContext = sources.length > 0
            ? `\n\n【检索到的相关知识片段】\n...`
            : '';

第 49 行 const citationRules = `\n【引用规则】
            当你参考了检索到的知识片段时，请使用 [数字] 标记...`;

第 55 行 const systemPrompt = `你是一个名为 Insight Note 的 AI Copilot。
            ${sourcesContext}
            ${citationRules}
            【重要能力：生成交互式组件】...
            ${noteContext ? `\n用户当前正在查看的笔记内容：\n${noteContext}` : ''}`;
```

**理解要点**：
- System Prompt 由三部分拼接：RAG 检索结果 + 引用规则 + 当前笔记内容
- 检索结果告诉 AI "你有这些知识可以用"，引用规则告诉 AI "用 [1] [2] 标记来源"，笔记内容告诉 AI "用户在看什么"
- `noteContext` 来自 BlockRenderer 实时同步到 Zustand 的内容

#### 流式响应（第 133-146 行）

```
第 133 行 const stream = createUIMessageStream({
            execute: async ({ writer }) => {
第 135 行     const result = streamText({
                model: deepseek.chat('deepseek-v4-flash'),
                system: systemPrompt,
                messages: modelMessages,
              });
第 141 行     writer.merge(result.toUIMessageStream());
              writer.write({ type: 'data-citations', data: sources });
            },
          });

第 146 行 return createUIMessageStreamResponse({ stream });
```

**理解要点**：
- `streamText` 调用 DeepSeek API，返回一个流式对象
- `writer.merge(...)` 把 LLM 的文本流接入 UI 消息流
- `writer.write({ type: 'data-citations', data: sources })` 在文本流结束后追加引用数据
- 引用数据不是 LLM 生成的，是我们手动注入的。客户端解析 LLM 文本中的 `[1]` 标记，匹配这些引用数据

---

### 10.4 embedding-store.ts — 向量存储与搜索

**文件**：`src/lib/embedding-store.ts`（161 行）
**职责**：向量存储、余弦相似度计算、语义搜索

#### 余弦相似度（第 11-20 行）

```
第 11 行 function cosine(a: Float32Array, b: Float32Array): number {
          let dot = 0, normA = 0, normB = 0;
          for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];      // 点积
            normA += a[i] * a[i];    // a 的模的平方
            normB += b[i] * b[i];    // b 的模的平方
          }
          const denom = Math.sqrt(normA) * Math.sqrt(normB);
          return denom === 0 ? 0 : dot / denom;
        }
```

**理解要点**：
- 余弦相似度 = 两个向量的点积 / (它们的模的乘积)
- 结果范围 [-1, 1]：1 表示方向完全一致（语义相同），0 表示正交（无关），-1 表示相反
- `denom === 0` 是零向量保护：如果有一个向量全是 0，除法会得到 NaN，这里返回 0
- 为什么手写？1024 维的循环在 V8 中执行很快（微秒级），不需要引入额外依赖

#### 向量 ↔ Buffer 转换（第 24-29 行）

```
第 24 行 function vecToBuffer(vec: Float32Array): Buffer {
          return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
        }
第 28 行 function bufferToVec(buf: Buffer): Float32Array {
          return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        }
```

**理解要点**：
- `Float32Array` 是 JS 的类型化数组，每个元素占 4 字节（32 位浮点数）
- `vecToBuffer` 是零拷贝：`Buffer.from(vec.buffer, ...)` 直接引用同一块内存，不复制
- `bufferToVec` 中 `byteLength / 4`：字节数除以 4 得到元素数
- 为什么存 Buffer 而不是 JSON？1024 个数字的 JSON 字符串很浪费空间，二进制 BLOB 只需 4KB

#### 语义搜索（第 104-161 行）

```
第 108 行 if (!query || !query.trim()) return [];
第 110 行 const queryVec = await embedText(query);  // 把问题转成向量

第 112 行 const rows = db.select({ ... }).from(blockEmbeddings).all(); // 全表扫描

第 122 行 const scored = rows.map((row) => ({
            blockId: row.blockId,
            score: cosine(queryVec, bufferToVec(row.embedding as Buffer)),
          }));
第 127 行 scored.sort((a, b) => b.score - a.score); // 按相似度降序
第 128 行 const topResults = scored.slice(0, topK);  // 取 Top-K

          // 关联 block 内容和文档标题
第 132 行 for (const result of topResults) {
            const blockRow = db.select().from(blocks)...get();
            const docRow = db.select().from(documents)...get();
            fragments.push({ blockId, noteId, score, content, noteTitle });
          }
```

**理解要点**：
- 流程：query → Embedding → 和所有向量算余弦 → 排序取 Top-K → 关联元数据
- 全表扫描是 O(N)，对于几百到几千个 block 的个人知识库，毫秒级完成
- 如果要支持百万级数据，需要换成 ANN（近似最近邻）索引，比如 HNSW

---

### 10.5 GenerativeUIBlock.tsx — AI 组件生成

**文件**：`src/components/editor/blocks/GenerativeUIBlock.tsx`
**职责**：流式生成可交互的 AI 组件（TaskBoard、DataTable 等）

#### 流式 JSON 提取（第 44-68 行）

```
第 44 行 function extractJsonFromStream(text: string): Record<string, unknown> | null {
            // 策略 1：从 ```json ... ``` 代码块中提取
第 46 行     const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
              try { return JSON.parse(codeBlockMatch[1].trim()); }
              catch { /* 降级到策略 2 */ }
            }

            // 策略 2：找第一个 { 到最后一个 }
第 57 行     const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace > firstBrace) {
              try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); }
              catch { /* JSON 还不完整 */ }
            }
            return null;
          }
```

**理解要点**：
- 流式接收时 JSON 逐渐完整，需要在每个 chunk 都尝试解析
- 策略 1 优先：从 ` ```json ``` ` 代码块中提取，更精确
- 策略 2 降级：找第一个 `{` 到最后一个 `}`，适用于 AI 没有正确使用代码块的情况
- 返回 `null` 表示 JSON 还不完整，等待下一个 chunk

#### 生成流程（handleGenerate 函数）

```
// 1. 调用 /api/generate-ui
const response = await fetch('/api/generate-ui', { body: JSON.stringify({ prompt }) });

// 2. 流式读取
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  accumulatedText += decoder.decode(value, { stream: true });

  // 3. 每个 chunk 都尝试解析 JSON
  const parsed = extractJsonFromStream(accumulatedText);
  if (parsed) {
    onUpdate({ ...block.attributes, props: parsed.props, status: 'completed' });
  }
}
```

**理解要点**：
- 和 AI 重写类似，都是流式接收
- 不同点：重写是逐 chunk 插入文本，这里是逐 chunk 尝试解析 JSON，解析成功才更新组件

---

### 10.6 数据库初始化流程

**文件**：`src/db/index.ts`

```
// 1. 打开数据库
const sqlite = new Database('data/ai-note.db');

// 2. 配置
sqlite.pragma('journal_mode = WAL');    // 读写并发
sqlite.pragma('foreign_keys = ON');     // 外键约束
sqlite.pragma('busy_timeout = 10000');  // 等待锁 10 秒

// 3. 建表（幂等）
sqlite.exec(`CREATE TABLE IF NOT EXISTS users (...)`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS documents (...)`);
// ... 6 张表

// 4. 迁移（处理已有数据库的 schema 变更）
migrate(sqlite);

// 5. Seed（首次启动时填充种子数据）
ensureSeeded();

// 6. Backfill（补全缺失的 embedding）
backfillMissingEmbeddings();
```

**理解要点**：
- globalThis 单例确保同一进程只有一个连接
- WAL 模式允许读写并发（普通模式下写操作会阻塞读操作）
- `busy_timeout = 10000`：如果数据库被锁，等 10 秒再报错

---

### 10.7 认证流程

**文件**：`src/lib/auth.ts`

```
// 登录流程
1. 用户提交 email + password
2. getUserByEmail(email) 查找用户
3. bcrypt.compare(password, hash) 验证密码
4. signToken({ userId, email }) 生成 JWT
5. setSessionCookie(token) 写入 httpOnly cookie

// 请求验证流程
1. getSession() 从 cookie 读取 token
2. jwtVerify(token, secret) 验证签名和有效期
3. 返回 { userId, email } 或 null
```

**理解要点**：
- bcryptjs 的 `compare` 是常数时间比较，防时序攻击
- JWT 的 Payload 是 Base64 编码（不是加密），任何人可以解码读取。但签名确保内容不被篡改
- httpOnly cookie 的意义：JS 代码（包括 XSS 注入的脚本）无法读取这个 cookie，只有浏览器自动发送
