# ai-note 面试题库与参考答案

> 更新时间：2026-05-29
> 定位：27 届实习生（前端开发方向）

使用建议：答案控制在 1-2 分钟口述长度，展示理解深度但不过度包装。遇到不会的追问，诚实说"这块我还没深入研究，但我的理解是……"比硬编更好。

---

## 一、项目概述类

### Q1：介绍一下你的项目？

**参考答案**：

ai-note 是一个 AI 原生的块编辑知识库，类似 Notion 但集成了 AI 能力。核心功能有三个：

第一是块编辑器，支持段落、标题、代码块、待办事项和 AI 生成组件五种区块类型，支持拖拽排序和斜杠指令插入。

第二是 AI 能力，包括侧边栏聊天（带 RAG 语义检索和引用溯源）、选中文本局部重写、以及 Generative UI —— AI 可以直接生成可交互的组件比如任务看板和流程图，而不只是文本。

第三是知识图谱，用 `[[双括号]]` 语法创建笔记间的双向链接，然后用力导向图可视化整个知识网络。

技术栈是 Next.js 16 + React 19 + TypeScript，数据层用 SQLite + Drizzle ORM，AI 用 DeepSeek 通过 Vercel AI SDK 接入。

**追问点**：
- "为什么选择 Next.js 而不是纯 React + Vite？" → SSR 对首屏加载有利，Server Components 减少客户端 JS 体积，Server Actions 简化全栈开发
- "项目有多少代码量？" → 大约 6000-7000 行 TypeScript（不含测试和文档）

---

### Q2：为什么要做这个项目？

**参考答案**：

两个原因。第一是我自己有记笔记的习惯，但传统笔记工具是"死的"——记了之后很难检索和关联。我想做一个能理解笔记内容、自动建立知识关联的工具。

第二是想深入实践 AI 工程化。很多 demo 只是简单调一下 ChatGPT API，但真正把 AI 能力融入到产品交互中（比如 Generative UI、流式替换、引用溯源）需要解决很多工程问题。这个项目让我完整走通了从"调 API"到"做产品"的全链路。

**追问点**：
- "和 Notion、Obsidian 比有什么区别？" → 定位不同，这是个人项目重在技术实现，核心差异是 AI-native 设计——AI 不是附加功能而是融入编辑体验

---

### Q3：这个项目你做了多久？遇到了什么困难？

**参考答案**：

核心开发大约两周，从零到完整的块编辑器 + AI 集成 + 知识图谱。

最大的困难是编辑器的状态管理。一开始我用 React 的 `useOptimistic` hook，但在连续打字场景下它的 Transition 时序和防抖窗口会错位，导致 UI 回跳。后来我改成双缓冲策略——一个"前缓冲"给用户即时反馈，一个"后缓冲"保存服务端确认的状态，失败时从后缓冲恢复。这个方案更可控，但实现起来需要处理很多边界情况，比如请求乱序、批量插入顺序、IME 合成期间的防抖暂停等。

另一个困难是 RAG 的引用溯源。一开始我想让 AI 输出结构化 JSON 格式的引用，但它经常格式不对。后来改成让 AI 在文本中用 `[1]`、`[2]` 标记，引用数据通过流式响应的自定义数据 part 单独发送，客户端做匹配。这样更稳定。

**追问点**：
- "双缓冲具体怎么实现的？" → 参见编辑器架构章节
- "useOptimistic 为什么会回跳？" → 它依赖 startTransition，但防抖保存不在 Transition 内，两者时序不同步

---

## 二、架构设计类

### Q4：你的项目是怎么组织代码的？

**参考答案**：

按职责分离，主要分六层：

- `src/actions/` 是 Server Actions，前端组件通过它调用服务端逻辑，不需要写 fetch
- `src/app/` 是 Next.js App Router，包含页面、布局和 API Routes
- `src/components/` 是 React 组件，按功能分为 editor（编辑器）、ai（AI 相关）、knowledge（知识图谱）、layout（布局）、ui（通用 UI）
- `src/db/` 是数据库层，包括 schema 定义、连接管理、数据访问函数和种子数据
- `src/lib/` 是工具函数，比如认证、embedding、搜索、解析器
- `src/store/` 是 Zustand 全局状态

渲染边界的原则是：默认用 Server Component，只有需要交互（事件、Hooks、浏览器 API）的组件才标记 `"use client"`。

---

### Q5：状态管理为什么选 Zustand？怎么用的？

**参考答案**：

选 Zustand 主要是因为轻量——不需要 Provider 包裹，一个 `create()` 调用就搞定，TypeScript 支持也很好。

项目里 Zustand 只管理跨组件的全局状态，主要是三类：
1. UI 开关：侧边栏折叠、AI 面板开关
2. 笔记上下文：编辑器实时同步当前笔记的纯文本内容，供 AI 聊天注入上下文
3. 事件总线：`pendingInsertBlocks` 用于从 AI 聊天向编辑器传递"插入内容"指令

高频的编辑状态（每个 block 的内容）不放在 Zustand 里，而是用 `useState` + `useRef` 的双缓冲管理在 BlockRenderer 内部。这样做是因为编辑器的更新频率太高（每次按键），放到全局 store 会导致不必要的组件重渲染。

**追问点**：
- "为什么不直接用 Context？" → Context 的 value 变化会导致所有消费者重渲染，Zustand 可以用 selector 精确订阅
- "事件总线模式是什么意思？" → ChatPanel 写入 `pendingInsertBlocks`，BlockRenderer 通过 `useEffect` 监听变化并执行插入，双方不直接引用对方

---

### Q6：Server Components 和 Client Components 是怎么划分的？

**参考答案**：

原则很简单：能用 Server Component 就用 Server Component。

具体来说：
- `layout.tsx` 和 `page.tsx` 是 Server Component，负责从数据库加载数据（文档列表、笔记详情），然后作为 props 传给 Client Component
- `BlockRenderer`、`ChatPanel`、`GraphView` 等需要用户交互的组件是 Client Component
- `AppShell` 是从 layout 中拆出来的 Client Component，因为它需要管理侧边栏状态和用户交互

这样做的好处是：数据库查询在服务端完成，客户端 JS bundle 更小，首屏加载更快。

**追问点**：
- "Server Component 和 Client Component 之间怎么传数据？" → 通过 props 传递序列化的数据，Server Component 可以直接调用 async 函数获取数据
- "遇到过 hydration 问题吗？" → 有，Tiptap 编辑器是纯浏览器端的，设置了 `immediatelyRender: false` 避免 SSR hydration mismatch

---

## 三、编辑器相关

### Q7：Tiptap 是怎么集成的？为什么选它？

**参考答案**：

Tiptap 是一个 headless 的富文本编辑器框架，底层是 ProseMirror。选它是因为：
1. Headless——不带 UI，完全自定义样式，和 shadcn/ui 风格一致
2. 可扩展——通过 Extension 和 Plugin 机制可以添加自定义功能
3. 社区活跃，文档完善

集成方式是：每个 block 类型有自己的 Tiptap 实例（`RichTextEditor` 组件），而不是整个文档一个编辑器。这样每个 block 是独立的编辑上下文，互不干扰。

配置上用了 `StarterKit`，但禁用了 `heading` 和 `codeBlock`——这两种类型在块级别由 `HeadingBlock` 和 `CodeBlock` 组件处理，不需要 Tiptap 内联处理。

**追问点**：
- "为什么不整个文档一个 Tiptap 实例？" → 块编辑器需要每个块独立管理状态（乐观更新、防抖保存），一个大编辑器很难做到块级别的精细控制
- "ProseMirror 了解多少？" → Tiptap 是 ProseMirror 的封装，ProseMirror 用 Transaction 模型管理文档状态变更，用 Decoration 做视觉装饰（比如 wikilink 高亮）

---

### Q8：IME（中文输入）是怎么处理的？

**参考答案**：

中文输入法在输入过程中会触发多次"中间态"更新事件，如果每次都触发保存，会导致数据混乱。

我的处理方式是监听 `compositionstart` 和 `compositionend` 事件，在合成期间设置一个 `isComposingRef` 标志。`onUpdate` 回调中检查这个标志，如果是合成状态就直接 return，不触发保存。

`compositionend` 之后用 `setTimeout(0)` 延迟一下再同步内容，因为浏览器在 `compositionend` 事件触发时可能还没把最终字符写入 DOM，需要等一个微任务周期。

这个模式是处理 CJK 输入的标准做法，不只我这么用，很多开源编辑器都有类似逻辑。

---

### Q9：拖拽排序是怎么实现的？

**参考答案**：

用的 `@dnd-kit` 库，它提供了 `DndContext` + `SortableContext` 的组合。

几个关键细节：
1. `PointerSensor` 设置了 `distance: 5`——用户必须移动 5 像素才触发拖拽，防止点击编辑时误触
2. `DragOverlay` 渲染一个浮动的拖拽副本，为了让它和原位置对齐，我在副本中用空 div 占住了 grip handle 和 delete button 的空间，消除拖拽开始时的水平跳动
3. 拖拽结束时先乐观更新 UI（用 `arrayMove` 交换数组位置），然后调用 `reorderBlocksAction` 同步到服务端。如果失败就从 `safeSnapshot` 回滚

---

### Q10：选中文本的 AI 重写是怎么做的？

**参考答案**：

用户选中文本后，`RichTextEditor` 检测到选区变化（300ms 防抖），在选区附近浮出一个 `RewriteToolbar`，提供"润色/扩写/精简/翻译"等快捷按钮和自定义指令输入框。

点击后调用 `/api/rewrite`（Edge Runtime），把选中文本、指令和当前笔记上下文发给 DeepSeek。流式返回的文本逐 chunk 插入编辑器替换原选区。

流式插入有个技巧：过程中用 `<br>` 代替 `<p>` 来换行，因为 ProseMirror 在流式插入 `<p>` 标签时会创建新的段落节点导致光标跳动。流结束后再统一把内容格式化为正确的 `<p>` HTML。

---

## 四、AI/RAG 相关

### Q11：RAG 是怎么工作的？

**参考答案**：

RAG（Retrieval-Augmented Generation）分三步：

**离线索引**：每个 block 的文本内容经过预处理（去 HTML、去 wikilink 语法、截断到 8000 字符）后，通过 DashScope Qwen3 Embedding 模型转成 1024 维的向量，以二进制格式存到 SQLite。

**在线检索**：用户提问时，同样把问题转成向量，然后和所有 block 的向量做余弦相似度计算，取最相似的 Top-5 结果。

**上下文注入**：把检索结果格式化后注入到 AI 的 System Prompt 中，让 AI 基于这些知识片段回答问题，并用 `[1]`、`[2]` 标记引用来源。

**追问点**：
- "为什么用暴力搜索不用向量数据库？" → 个人知识库数据量在几百到几千条，暴力搜索毫秒级完成，引入向量数据库增加了部署复杂度，收益不大
- "余弦相似度怎么算的？" → 两个向量的点积除以它们模的乘积，结果在 [-1, 1] 之间，1 表示完全相似
- "Embedding 模型为什么选 Qwen3？" → 国内访问快、支持中文、1024 维度在精度和性能之间平衡

---

### Q12：引用溯源（Citations）是怎么实现的？

**参考答案**：

一开始我想让 AI 输出结构化 JSON 格式的引用，但它经常格式不对或者漏掉引用。

最终方案是"内联标记 + 侧信道数据"：
1. System Prompt 告诉 AI 用 `[1]`、`[2]` 标记引用
2. 检索到的原始数据（标题、内容、相似度分数）通过 Vercel AI SDK 的自定义数据 part 随流式响应一起发送
3. 客户端 `ChatPanel` 解析文本中的 `[N]` 标记，替换为 `CitationChip` 组件（可点击的引用气泡，hover 显示来源预览）

这样即使 AI 生成的引用编号不准确，也不会导致解析崩溃——找不到对应编号的引用就跳过。

**追问点**：
- "如果 AI 幻觉出不存在的引用编号怎么办？" → 客户端做兜底，找不到匹配的就忽略那个标记
- "引用数据什么时候发？" → 在 LLM 文本流结束之后，所以引用气泡是文本渲染完才出现的

---

### Q13：Generative UI 是什么？怎么实现的？

**参考答案**：

Generative UI 让 AI 不只是输出文本，还能生成可交互的 React 组件。比如用户说"帮我做一个项目进度表"，AI 会返回一个 TaskBoard 组件的 JSON 配置，前端直接渲染出来，用户可以点击切换任务状态。

实现流程：
1. 用户在 `GenerativeUIBlock` 的输入框中描述需求
2. 调用 `/api/generate-ui`，System Prompt 中定义了 4 种组件的 JSON Schema
3. DeepSeek 流式返回 JSON，客户端 `extractJsonFromStream` 实时解析（先尝试从代码块提取，降级找大括号匹配）
4. 解析成功后通过 `AIComponentRegistry` 注册表找到对应组件并渲染
5. 组件内部的状态变更（比如点击任务切换状态）通过 `onUpdateProps` 回调写回编辑器的 block attributes

**追问点**：
- "如果 AI 返回的 JSON 格式不对怎么办？" → `sanitizeProps` 做运行时防护（非对象类型返回空对象），未知 componentId 显示降级 UI
- "为什么不直接让 AI 生成代码？" → 安全风险（XSS），而且 JSON 配置比可执行代码更容易控制和验证

---

### Q14：流式输出是怎么实现的？

**参考答案**：

用的 Vercel AI SDK 的 `streamText` 函数，底层是 SSE（Server-Sent Events）。

服务端调用 `streamText({ model, system, prompt })`，它返回一个流式对象，通过 `toUIMessageStream()` 转换为 UI 消息流，再通过 `createUIMessageStreamResponse` 包装为 HTTP 响应。

客户端用 `@ai-sdk/react` 的 `useChat` hook 接收，它自动处理 SSE 解析、消息拼接和状态管理。

选择 DeepSeek 是因为它兼容 OpenAI API 格式，用 `createOpenAI` 指向 `https://api.deepseek.com` 就行，不需要额外适配。成本也比 OpenAI 低很多。

**追问点**：
- "SSE 和 WebSocket 有什么区别？" → SSE 是单向服务端推送，WebSocket 是双向通信。AI 场景只需要服务端向客户端推流式文本，SSE 更简单
- "Edge Runtime 和 Node.js Runtime 有什么区别？" → Edge Runtime 启动更快但 API 受限（不能用 native modules like better-sqlite3），`/api/chat` 用 Node.js（需要查 DB），`/api/rewrite` 用 Edge（不需要 DB）

---

## 五、知识图谱相关

### Q15：`[[wikilink]]` 语法是怎么解析和渲染的？

**参考答案**：

解析分两层：

**运行时解析**（`wikilink-parser.ts`）：用正则 `\[\[([^\]]+)\]\]` 从纯文本中提取所有 wikilink，然后遍历所有文档的标题做匹配，把标题转为文档 ID。这用于构建知识图谱的边和反向链接。

**编辑器内渲染**（`wikilink-decoration.ts`）：这是一个 ProseMirror 插件。用 `Decoration.inline` 给 `[[...]]` 范围添加 CSS 类（蓝色高亮 + 下划线），点击时通过 `document.caretRangeFromPoint` 定位 DOM → 向上找 `.wikilink` 祖先 → 用 TreeWalker 算字符偏移 → 验证在 wikilink 内 → 解析标题 → 跳转。

性能优化：`DecorationSet.map` 在文档没有变化时只映射已有装饰，不重扫全文。

**追问点**：
- "如果两个笔记同名怎么办？" → 目前取第一个匹配，这是个已知局限
- "wikilink 的正则不会和代码块冲突吗？" → 代码块的 content 存的是纯代码，wikilink 解析只在需要构建图谱时对文本内容做，不影响代码渲染

---

### Q16：知识图谱为什么用 Canvas 而不是 SVG？

**参考答案**：

SVG 的每个节点是一个 DOM 元素，当节点数量到几百个时，DOM 操作的性能开销会很明显。Canvas 把所有内容画在一个位图上，不管多少节点都只有一个 DOM 元素。

另外 Canvas 天然支持像素级操作，比如 DPI 适配（`devicePixelRatio` 缩放）和精确的鼠标点击判定（距离平方比较）。

缺点是 Canvas 不像 SVG 那样有内置的事件系统，点击、拖拽这些交互需要自己实现坐标转换和碰撞检测。

**追问点**：
- "d3-force 是怎么工作的？" → 每个 tick 施加各种力（引力、斥力、碰撞力）计算节点的新位置，直到系统达到平衡
- "为什么不重启模拟？" → 每次重启要重新跑物理计算，可能要几百毫秒。resize 时只重绘不重启，用户体验更流畅

---

### Q17：反向链接是怎么计算的？

**参考答案**：

`getBacklinksForNote(noteId)` 函数遍历当前用户所有文档的所有 block，用正则匹配 `[[title]]` 语法。如果某个 block 中的 wikilink 标题等于目标笔记的标题，就把这个文档记录为反向链接来源。

结果包含来源笔记 ID、标题、emoji，以及 wikilink 周围的上下文预览（前后各取一定字符数），方便用户快速了解引用的上下文。

这个计算是实时的，没有缓存。对于个人知识库的数据量（几十篇笔记、几百个 block），遍历一次很快。

---

## 六、工程化相关

### Q18：你的项目有测试吗？怎么测的？

**参考答案**：

有的，用 Vitest + @testing-library/react，目前有 9 个测试文件、110 个测试用例。

主要覆盖了四类：
1. **纯函数测试**（零 mock）：`stripHtml`、`markdownToHtml`、`ensureHtml`、`parseMarkdownToBlocks`、`wikilink-parser`、余弦相似度计算
2. **组件行为测试**：`BlockRenderer` 的乐观更新和失败回滚、`GenerativeUIBlock` 的多种状态渲染
3. **工具函数测试**：`sanitizeProps` 的类型防护、`extractJsonFromStream` 的流式 JSON 提取
4. **路由组件测试**：error boundary 和 loading skeleton

策略是优先测纯函数（ROI 最高、零 mock 成本），再测关键组件的核心行为。没有追求高覆盖率，而是确保核心链路有回归保障。

**追问点**：
- "BlockRenderer 怎么测的？" → 用 `vi.mock` 替换 Server Actions 和子组件，`vi.useFakeTimers` 模拟防抖延迟，验证乐观更新和回滚行为
- "有没有 E2E 测试？" → 目前没有，Playwright 已安装但还没写。时间成本比较高，面试前优先补单元测试

---

### Q19：数据库为什么选 SQLite？有什么局限？

**参考答案**：

选 SQLite 是因为零依赖——不需要安装数据库服务，就是一个文件。对于个人项目的 demo 和开发阶段足够了。

局限是：
1. **单写锁**：同一时刻只能有一个写操作，多进程并发写会 SQLITE_BUSY。我用 globalThis 单例模式避免 Next.js 多 worker 重复打开
2. **无状态部署**：Vercel 的 Serverless 环境每次冷启动都会丢失数据。生产环境应该用 Turso（libsql）或 PostgreSQL
3. **不支持向量索引**：目前是暴力扫描所有向量，数据量大了会慢。如果扩展到 10 万+ block 需要迁移到 pgvector

ORM 用的 Drizzle，选它是因为轻量、类型安全、SQL-like 的 API 比 Prisma 更直观。

**追问点**：
- "Drizzle 和 Prisma 有什么区别？" → Prisma 更重（有自己的 query engine），Drizzle 更轻（直接生成 SQL），Drizzle 的 API 更接近原生 SQL 写法
- "globalThis 单例是怎么回事？" → Next.js build 时开 10 个 worker，每个都会 import db 模块。用 globalThis 存数据库连接确保同一进程只有一个连接

---

### Q20：认证系统是怎么设计的？

**参考答案**：

用 JWT（jose 库）+ bcryptjs 实现，token 存在 httpOnly cookie 中，有效期 7 天。

密码用 bcryptjs 哈希（salt rounds = 10），不存明文。选 bcryptjs 而不是 bcrypt 是因为它是纯 JS 实现，没有 native binding，部署更方便。

数据隔离是通过所有文档查询都带 `userId` 过滤实现的。Server Actions 统一调用 `requireAuth()` 验证登录状态。

路由保护在 `middleware.ts` 中实现，拦截 `/app/*` 路由，未登录重定向到 `/login`。

**追问点**：
- "为什么不直接用 NextAuth？" → NextAuth 是黑盒，出了问题不好调试。自己实现更可控，也能学到 JWT 的原理
- "httpOnly cookie 和 localStorage 存 token 有什么区别？" → httpOnly cookie JS 读不到，防 XSS 窃取；localStorage 可以被 JS 访问，XSS 攻击可以直接拿到 token

---

## 七、综合/行为类

### Q21：这个项目中你遇到的最大技术挑战是什么？怎么解决的？

**参考答案**：

编辑器的状态一致性。

块编辑器需要同时处理：用户实时打字（每秒可能触发 10+ 次更新）、防抖保存（800ms 合并）、网络请求可能乱序、保存可能失败需要回滚、IME 输入法合成期间不能触发保存、拖拽排序要和编辑状态隔离。

一开始我用 React 的 `useOptimistic`，发现 Transition 时序和防抖窗口不同步会导致 UI 闪烁。后来改成双缓冲 + 请求序号 + 按块防抖的方案，每个问题逐个击破。

这个过程让我理解到：**复杂交互状态不能依赖单一抽象，需要根据场景组合多种策略**。乐观更新适合离散操作（点赞、勾选），但连续编辑需要更精细的控制。

---

### Q22：如果让你重新做这个项目，你会怎么改？

**参考答案**：

三个方向：

1. **数据库升级**：SQLite 换成 Turso（libsql）或 PostgreSQL，解决单写锁和无状态部署问题。向量存储用 pgvector 的 HNSW 索引替代暴力搜索。

2. **编辑器重构**：目前每个 block 是独立的 Tiptap 实例，跨 block 的操作（比如跨 block 选中删除）比较难做。如果重来会考虑用一个统一的 ProseMirror 文档，通过 Node spec 定义不同的 block 类型。

3. **测试先行**：这次是先写功能后补测试，有些边界情况是在写测试时才发现的。如果重来会为核心纯函数先写测试，TDD 的方式开发。

**追问点**：
- "为什么不一开始就用 PostgreSQL？" → 个人项目优先考虑开发效率和部署简单度，SQLite 零配置启动快。架构上已经做了抽象（Drizzle ORM），迁移成本可控
- "跨 block 选中你有尝试过吗？" → 有研究过，ProseMirror 原生支持跨 Node 选中，但需要把多个 block 合并成一个 Document，这会改变整个编辑器架构

---

### Q23：你从这个项目中学到了什么？

**参考答案**：

三个最重要的收获：

第一是**工程取舍的能力**。比如暴力搜索 vs 向量数据库、SQLite vs PostgreSQL、双缓冲 vs useOptimistic——每个决策都有 trade-off，关键是根据当前阶段的需求选择最合适的方案，而不是追求"最先进"的技术。

第二是**调试复杂交互的能力**。编辑器的 bug 很难复现——需要特定的打字速度、特定的网络延迟、特定的输入法状态才能触发。我学会了用 telemetry 埋点记录每个保存事件的序列号和时间戳，事后分析日志定位问题。

第三是**AI 工程化**的真实体验。AI 不是调一下 API 就完了——流式输出的解析、JSON 提取的容错、引用标记的匹配、组件配置的运行时校验，每个环节都需要工程保障。

---

### Q24：你的项目和市面上的笔记工具比，有什么优势和不足？

**参考答案**：

**优势**：
- AI 是核心能力而不是附加功能——Generative UI 让 AI 输出可交互组件而不只是文本
- 知识图谱可视化——很多工具有双向链接但没有图谱可视化
- 全栈技术深度——从编辑器底层到 AI 检索到数据库设计，不是简单拼凑

**不足**：
- 只有单用户，没有协作编辑
- 没有移动端适配
- 没有离线支持（依赖网络请求）
- 编辑器能力相比 Notion/Slate 还有差距（不支持表格、图片、嵌入等）

定位是技术展示项目，不是要和商业产品竞争。通过这个项目完整实践了全栈开发 + AI 工程化的全链路。

---

## 八、快速追问清单（面试官高频快问）

| 问题 | 一句话回答 |
|------|-----------|
| React 19 有什么新特性？ | `useOptimistic`、`useTransition` 改进、Server Components 稳定化 |
| SSR 和 CSR 的区别？ | SSR 服务端渲染 HTML 首屏快，CSR 客户端渲染交互快，Next.js 两者都支持 |
| Tiptap 和 Slate 的区别？ | Tiptap 基于 ProseMirror 更高层抽象，Slate 更底层灵活但学习曲线陡 |
| Zustand 和 Redux 的区别？ | Zustand 无 Provider、API 更简洁、支持 selector 精确订阅；Redux 生态更完善但 boilerplate 多 |
| JWT 的结构？ | Header.Payload.Signature，三段 Base64 编码，Payload 存用户信息，Signature 防篡改 |
| SSE 和 WebSocket？ | SSE 单向服务端推送，WebSocket 双向通信。AI 流式输出用 SSE 足够 |
| 什么是余弦相似度？ | 两个向量夹角的余弦值，范围 [-1,1]，1 表示方向完全一致 |
| Float32Array 和普通数组？ | Float32Array 是类型化数组，内存连续、固定精度，适合大量数值计算 |
| d3-force 的原理？ | 模拟物理系统，每 tick 计算引力/斥力/碰撞力，迭代直到系统平衡 |
| Canvas 和 SVG 的区别？ | Canvas 单位图、像素操作适合大量元素；SVG 每元素一个 DOM 节点，适合少量可交互元素 |
| 什么是 Debounce？ | 合并高频事件，只在最后一次触发后等待 N ms 才执行。用于编辑器防抖保存 |
| 什么是防抖和节流的区别？ | 防抖是等停下来再执行，节流是每隔 N ms 执行一次 |
| React key 的作用？ | 帮助 React 识别哪些元素变化了，用于最小化 DOM 操作。列表中用稳定 ID 而非 index |
