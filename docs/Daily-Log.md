# 2026-06-01 工作日志

## AI Rewrite 工具栏修复与增强 ✅

**目标**：修复自定义指令输入框不可用 + 点击外部不关闭弹窗两个 bug，并增强选中文本高亮与预览。

**实现内容**：

1. **Bug 修复：自定义指令输入框不可用**
   - `src/components/editor/RewriteToolbar.tsx` — 将 `onMouseDown={(e) => e.preventDefault()}` 从外层 div 移至快速操作按钮，解除对 input 焦点获取的阻断

2. **Bug 修复：点击外部不关闭弹窗**
   - `src/components/editor/RewriteToolbar.tsx` — 新增 `toolbarRef` + `mousedown` 事件监听，实现 click-outside 关闭

3. **选中文本预览**
   - `RewriteToolbar.tsx` — 新增 `selectedText` prop，在工具栏中显示当前选中文本的截断预览（「…」格式）
   - `RichTextEditor.tsx` — 透传 `rewriteMenuState.text` 给 `selectedText`

4. **选中文本持久高亮**
   - `src/components/editor/extensions/rewrite-highlight.ts`（新建）— ProseMirror 装饰器插件，通过 `Decoration.inline()` 实现不依赖浏览器选区的持久高亮
   - `RichTextEditor.tsx` — 注册插件 + `useEffect` 监听菜单开关状态，打开时设置高亮范围，关闭时清除
   - `src/app/globals.css` — 新增 `.rewrite-highlight` 样式（紫色半透明背景，亮/暗色模式自适应）

**技术决策**：
- 使用 ProseMirror `Decoration.inline()` 而非 CSS `::selection`，因为 `::selection` 在编辑器失焦时消失，而装饰器渲染为 `<mark>` DOM 元素，焦点切换到 toolbar 输入框后高亮依然可见
- `preventDefault` 从外层 div 移至按钮，而非完全移除——快速操作按钮仍需阻止 mousedown 以防止 Tiptap 编辑器失焦

---

# 2026-05-29 工作日志

## 用户认证 + 笔记管理 + AI 对话持久化 ✅

**目标**：实现用户认证系统、笔记增删改查、AI 对话历史管理。

**实现内容**：

1. **用户认证系统**
   - `src/lib/auth.ts`（新建）— 密码加密（bcryptjs）+ JWT 签发/验证（jose）+ httpOnly cookie session 管理
   - `src/db/schema.ts` — 新增 `users` 表 + `documents.userId` 外键
   - `src/db/migrate.ts`（新建）— 处理已有数据库迁移（ALTER TABLE + 默认用户分配）
   - `middleware.ts`（新建）— 路由保护，/app/* 未登录重定向到 /login
   - `src/app/api/auth/`（新建）— register/login/logout/me 四个 API
   - `src/app/(auth)/`（新建）— 登录/注册页面 + 演示账户自动填充按钮

2. **笔记增删改查**
   - `src/db/queries.ts` — 新增 createDocument/deleteDocument/updateDocument 函数
   - `src/actions/note.ts` — 新增 createNote/deleteNote/updateNote Server Actions
   - `src/components/layout/AppShell.tsx` — 侧边栏添加新建/删除按钮，乐观更新 UI
   - `src/components/note/NoteHeader.tsx`（新建）— 笔记标题和 emoji 图标编辑组件
   - `src/components/ui/confirm-dialog.tsx`（新建）— 美观的删除确认对话框

3. **AI 对话历史持久化**
   - `src/db/schema.ts` — 新增 `chat_sessions` 和 `chat_messages` 表
   - `src/app/api/chat/sessions/`（新建）— 对话 CRUD API
   - `src/components/ai/ChatPanel.tsx` — 集成对话列表、自动命名、编辑名称功能

4. **数据隔离**
   - 所有文档查询添加 userId 过滤
   - Server Actions 添加 requireAuth() 认证检查
   - /api/chat 和 /api/rewrite 添加认证保护

**技术决策**：
- 选择 JWT 无状态方案（jose 库），兼容 Edge Runtime
- 使用 bcryptjs 纯 JS 实现，避免 native binding 问题
- 对话自动命名取第一条消息前 30 字符
- 删除确认使用 shadcn Dialog 替代浏览器 confirm

## Generative UI 重构 + AI 组件库 + 插入预览 + Bug 修复 ✅

**目标**：让 AI 功能真正可用 — 修复 Generative UI 流程、扩展组件库、改进插入体验、修复已有 bug。

**实现内容**：

1. **Generative UI 流程修复**
   - `src/app/api/generate-ui/route.ts`（新建）— Generative UI 专用 API Route，接收 prompt + noteContext，流式返回结构化 JSON，支持 4 种组件类型
   - `src/components/editor/blocks/GenerativeUIBlock.tsx`（重写）— streaming + 空 props 时显示 prompt 输入框（含快捷按钮），调用 /api/generate-ui 流式生成，实时解析 JSON 并渲染组件，错误状态支持重试
   - `src/components/editor/blocks/GenerativeUIBlock.test.tsx`（更新）— 测试用例适配新行为（prompt 输入框替代永久加载动画）

2. **AI 组件库扩展**
   - `src/components/ai/DataTable.tsx`（新建）— 可排序、可筛选的数据表格
   - `src/components/ai/MermaidDiagram.tsx`（新建）— 流程图/思维导图，动态加载 mermaid 库
   - `src/components/ai/Timeline.tsx`（新建）— 可展开的时间线组件
   - 安装 `mermaid` 依赖

3. **系统提示词更新**
   - `src/app/api/chat/route.ts`（修改）— 教 AI 关于 4 种 componentId（TaskBoard、DataTable、MermaidDiagram、Timeline）及选择规则

4. **插入画布预览面板**
   - `src/lib/parse-markdown-to-blocks.ts`（新建）— 从 ChatPanel 提取为独立模块，逐行状态机解析
   - `src/components/ai/InsertPreview.tsx`（新建）— 弹出式预览面板，复选框选择性插入，全选/取消全选
   - `src/components/ai/ChatPanel.tsx`（修改）— "插入到画布"改为打开预览面板

5. **Markdown 解析引擎重写**
   - `src/lib/parse-markdown-to-blocks.ts` — 从按双换行分割改为逐行状态机，支持：JSON 代码块、代码块、标题、Todo、无序列表、有序列表、分割线、引用块、段落
   - `src/lib/strip-html.ts`（修改）— 新增 `markdownToHtml()` 函数，将内联 markdown 语法转为 HTML

6. **Bug 修复**
   - `src/components/layout/AppShell.tsx` — 修复笔记列表新建/删除不刷新（localDocuments 合并逻辑缺陷）
   - `src/components/editor/BlockRenderer.tsx` — 修复批量插入顺序反转（改为链式串行插入）

**技术决策**：
- Generative UI 使用独立 API Route 而非复用 /api/chat：system prompt 不同，隔离更清晰
- MermaidDiagram 使用动态 import：mermaid 库体积大（~1MB），按需加载减少首屏 bundle
- 插入预览面板用 createPortal 渲染：避免被编辑器 overflow 裁剪
- Markdown 解析改为逐行状态机：AI 回复经常用单换行，按双换行分割会导致所有内容降级为段落
- 批量插入改为串行链式：每个 block 引用前一个 block 的 ID，保证顺序正确

## 文档同步：5 篇文档与代码对齐 ✅

**目标**：将文档与阶段八（用户认证 + 笔记管理 + AI 对话持久化）和阶段八附加（Generative UI 重构）的代码变更同步。

**实现内容**：

1. **`docs/Database-Architecture.md`** — 表数 3→6（新增 users、chat_sessions、chat_messages）；documents 表补充 user_id FK；新增数据迁移章节；queries 函数表按用户/文档/聊天分组（7→21 个）
2. **`docs/API-Reference.md`** — Server Actions 7→10（新增 createNote/deleteNote/updateNote）；API Routes 2→14（新增 auth 系列 4 个、chat sessions 3 个、generate-ui 1 个）；queries 函数表完整更新
3. **`docs/Architecture-and-Rules.md`** — 目录树删除 mock/，新增 db/、auth/、generate-ui/、knowledge/；Mock-First 章节改为真实数据层说明；技术栈补充数据库和认证
4. **`docs/Development-Guide.md`** — 环境变量新增 AUTH_SECRET；自动建表 3→6；种子文档 5→9；项目结构树补充 auth.ts、migrate.ts、认证路由等
5. **`docs/Data-Schema.md`** — 日期更新至 5/29；新增认证类型（SessionPayload）；新增数据库 Schema 类型（6 张表的运行时接口）；落地状态补充认证和聊天相关说明

**技术决策**：
- 数据库 Schema 类型以 Drizzle 表定义为真源，文档中展示等效的 TypeScript 接口
- API Reference 按功能域分组（auth/chat/ai/editor），便于查阅
- 保留已有的文档格式和风格，仅补充缺失内容

## 核心 lib 层测试覆盖 ✅

**目标**：补充核心纯函数的单元测试，提升面试时"质量保障"的回答底气。

**实现内容**：

1. **`src/lib/__tests__/strip-html.test.ts`（新建）** — 29 个 case，覆盖 `stripHtml`（标签去除、br 多种写法、HTML 实体解码、换行折叠）、`markdownToHtml`（bold/italic/code/del/link、词边界保护、混合格式）、`ensureHtml`（HTML 检测、纯文本段落包裹）
2. **`src/lib/__tests__/parse-markdown-to-blocks.test.ts`（新建）** — 30 个 case，覆盖标题（H1-H3 + 四级降级）、代码块（带语言/无语言/未闭合）、JSON 代码块（generative_ui/code 降级/无效 JSON）、Todo 列表（checked/unchecked/大写 X）、无序/有序列表、分割线、引用块、段落内行内格式、Windows 行尾、混合内容
3. **`src/lib/__tests__/embedding-store.test.ts`（新建）** — 11 个 case，覆盖 `cosine` 相似度（自身/正交/反向/零向量保护/高维）、`vecToBuffer`/`bufferToVec` round-trip 精度（含 1024 维模拟）、cosine + buffer 集成验证
4. **`src/components/editor/blocks/__tests__/GenerativeUIBlock.utils.test.ts`（新建）** — 19 个 case，覆盖 `sanitizeProps`（null/undefined/array/string/number/object 防护）、`extractJsonFromStream`（代码块提取/裸 JSON/前后文字/无效 JSON/不完整 JSON/流式场景）
5. **`src/components/editor/blocks/GenerativeUIBlock.tsx`（修改）** — 导出 `sanitizeProps` 和 `extractJsonFromStream` 供独立测试

**技术决策**：
- 纯函数优先：零 mock 成本、高 ROI，是最适合面试展示的测试
- embedding-store 的 cosine/vecToBuffer/bufferToVec 是模块私有函数，采用"契约测试"策略（重新实现相同逻辑验证数学正确性），避免触发 DB 初始化
- 测试描述使用中文，与项目已有测试风格一致

## 项目文档 + 面试准备 ✅

**目标**：为 27 届实习面试准备项目深度文档和面试题库。

**实现内容**：

1. **`docs/Project-Deep-Dive.md`（新建）** — 项目技术深度解析，覆盖 9 个模块：架构设计、块编辑器（双缓冲/请求序号/拖拽排序）、RAG 语义检索（Embedding/余弦相似度/引用溯源）、Generative UI、知识图谱（wikilink/d3-force/Canvas）、认证系统、技术决策取舍、性能优化清单
2. **`docs/Interview-QA.md`（新建）** — 24 道面试题 + 参考答案，按 7 个分组：项目概述(3)、架构设计(3)、编辑器(4)、AI/RAG(4)、知识图谱(3)、工程化(3)、综合行为(4)；附 13 条快速追问清单

**技术决策**：
- 答案控制在实习生水平，展示理解深度但不过度包装
- 每个 Q&A 包含追问点，帮助准备面试官的连环追问
- 快速追问清单覆盖高频概念题（JWT/SSE/Debounce/Canvas vs SVG 等）

---

# 2026-05-28 工作日志

## 真实数据层：Mock → SQLite + Drizzle ORM ✅

**目标**：将硬编码 Mock 数据替换为 SQLite 文件数据库，实现笔记数据真正持久化。

**实现内容**：

1. **`src/db/schema.ts`（新建）** — Drizzle ORM 表定义，`documents` + `blocks` 两张表，blocks 通过 `document_id` 外键关联，`position` 字段保证排序，`attributes` 以 JSON 文本存储多态字段
2. **`src/db/index.ts`（新建）** — 数据库连接单例（globalThis 防止 Next.js build 多 worker 重复连接），WAL 模式 + busy_timeout，自动建表 + 懒 seed
3. **`src/db/queries.ts`（新建）** — 核心数据访问层，7 个函数：`getAllDocumentsMeta`、`getDocumentById`、`getAllDocumentsWithBlocks`、`updateBlock`、`addBlock`、`deleteBlock`、`reorderBlocks`；内部 `dbRowToBlock` 根据 type 列反序列化 attributes 构造正确的 Block 联合类型
4. **`src/db/seed.ts`（新建）** — 幂等 seed 脚本，检查 documents 表有数据则跳过，事务保证原子性
5. **`src/db/seed-data.ts`（从 mock/data.ts 迁移）** — 种子数据保留，仅 seed 脚本引用
6. **`src/actions/note.ts`（改写）** — 删除 `mockDocuments` import 和 `simulateNetwork()` 假延迟/失败，每个函数改为调用 `@/db/queries`
7. **`src/app/api/chat/route.ts`（改写）** — 删除 `export const runtime = 'edge'`（better-sqlite3 不兼容 Edge），改用 `getAllDocumentsWithBlocks()` 获取数据传给 `keywordSearch`
8. **`src/app/app/layout.tsx`（改写）** — 从 `'use client'` 改为 Server Component，调用 `getAllDocumentsMeta()` 获取文档列表传给 AppShell
9. **`src/components/layout/AppShell.tsx`（新建）** — 从 layout 拆出的 Client Component，接收 `documents` prop
10. **`src/components/editor/BlockRenderer.tsx`（改写）** — 删除 mock import，新增 `documents` prop，note page 传入 `getAllDocumentsMeta()` 结果
11. **`src/app/app/note/[id]/page.tsx`（改写）** — 新增 `getAllDocumentsMeta()` 调用，传 `documents` 给 BlockRenderer
12. **`src/lib/retrieval.ts`（改写）** — 删除 200ms mock 延迟
13. **`src/components/editor/extensions/wikilink-decoration.ts`（修复）** — `Node` 类型冲突改为 `globalThis.Node`
14. **tiptap 全家桶升级至 3.23.6** — 修复已有的 core/starter-kit 版本不匹配

**技术决策**：
- 选择 SQLite + Drizzle ORM：零基础设施依赖，文件数据库，Drizzle 轻量且类型安全
- better-sqlite3 优于 libsql：同步 API 性能最优，Node.js 原生支持
- 移除 Edge Runtime：better-sqlite3 需要 Node.js 原生模块，DeepSeek API 调用才是延迟瓶颈，Edge 收益可忽略
- globalThis 单例模式：防止 Next.js build 时 10 个 worker 各自打开数据库导致 SQLITE_BUSY
- backlinks 不存储：保持运行时 wikilink 扫描计算，避免数据冗余同步问题

## 修复段落持久化 bug ✅

**目标**：修复切换笔记后段落分隔消失、内容挤成一段的问题。

**实现内容**：

1. **`src/components/editor/RichTextEditor.tsx`（改写）**
   - 保存时 `editor.getText()` → `editor.getHTML()`：保留 `<p>` 标签，段落结构不再丢失
   - 加载时 `ensureHtml(initialContent)`：旧纯文本数据自动转为 HTML 段落（向后兼容）
   - AI rewrite 流式阶段：逐块 `insertContent` 保持实时反馈，流结束后用 `deleteRange` + `insertContentAt` 替换为正确 `<p>` HTML

2. **`src/lib/strip-html.ts`（新建）**
   - `stripHtml(html)` — HTML 转纯文本，用于 AI 上下文注入和 RAG 分词
   - `ensureHtml(content)` — 纯文本转 HTML 段落，用于加载时向后兼容

3. **`src/components/editor/BlockRenderer.tsx`（改写）** — AI 上下文注入用 `stripHtml()` 清理 HTML 标签
4. **`src/lib/retrieval.ts`（改写）** — RAG 分词前用 `stripHtml()` 清理
5. **`src/actions/note.ts`（改写）** — wikilink 解析和反向链接预览用 `stripHtml()` 清理

**技术决策**：
- `getHTML()` 而非 `getText()`：Tiptap 的 `getText()` 丢弃所有 HTML 结构，`getHTML()` 保留 `<p>` 标签
- `ensureHtml` 向后兼容：检测内容是否已有 HTML 标签，纯文本则按双换行拆分为 `<p>` 段落
- rewrite 流式 + 最终清理：流式阶段用 `<br>` 保持实时反馈，结束后替换为 `<p>` 段落确保持久化正确

## 语义向量检索：TF-IDF → Qwen3 Embedding ✅

**目标**：将 RAG 检索从 TF-IDF 关键词匹配升级为语义向量搜索，理解语义而非字面匹配。

**实现内容**：

1. **`src/db/schema.ts`（改写）** — 新增 `blockEmbeddings` 表（blockId PK, embedding BLOB, updatedAt），Drizzle `blob({ mode: 'buffer' })` 存储 Float32Array
2. **`src/db/index.ts`（改写）** — DDL 新增 `CREATE TABLE IF NOT EXISTS block_embeddings`
3. **`src/lib/embedding.ts`（新建）** — DashScope Qwen3 Embedding 客户端，`embedText(text)` 单条 embedding，`embedBatch(texts)` 分批并行（每批 6 个，200ms 间隔防限流），复用 `@ai-sdk/openai` + `ai` SDK 的 `embed()` 函数
4. **`src/lib/embedding-store.ts`（新建）** — 向量存储（`storeEmbedding`）、余弦相似度计算（`cosine`）、启动 backfill（`backfillMissingEmbeddings` 幂等补齐缺失 embedding）、语义搜索（`semanticSearch` embed query → 全量向量比对 → top-K）
5. **`src/lib/retrieval.ts`（改写）** — 删除 TF-IDF 逻辑，改名为 `searchNotes`，调用 `semanticSearch`，从 DB 查询 block/doc metadata 做结果补充
6. **`src/db/queries.ts`（改写）** — `updateBlock` / `addBlock` 后 fire-and-forget 调用 `embedAndStoreBlock`；`deleteBlock` 显式删除 embedding；启动时 `backfillMissingEmbeddings()`
7. **`src/app/api/chat/route.ts`（改写）** — import 改为 `searchNotes`，删除 `getAllDocumentsWithBlocks()` 全量加载（语义搜索直接从 DB 读）
8. **`.env.example`（新建）** — 文档化 `DEEPSEEK_API_KEY` + `DASHSCOPE_API_KEY`
9. **`src/components/editor/BlockRenderer.tsx`（改写）** — `DndContext` 添加 `id="note-blocks-dnd"` 修复 SSR hydration mismatch

**技术决策**：
- DashScope OpenAI 兼容 API：复用已有的 `@ai-sdk/openai` + `ai` SDK，无需新依赖
- SQLite BLOB 存储向量：1024 维 × 4 字节 = 4KB/行，500 blocks ≈ 2MB，零外部依赖
- JS 原生余弦相似度：500 blocks × 1024 维 < 5ms，无需向量数据库
- Fire-and-forget embedding：区块保存时不阻塞（200-500ms API 调用），失败下次启动 backfill 重试
- `cosineSimilarity` from `ai` SDK 要求 `number[]` 而非 `Float32Array`，自行实现 `cosine()` 更简洁

## 种子数据扩充 + 项目文档补全 ✅

**目标**：丰富数据库笔记内容，补全缺失的项目文档。

**实现内容**：

1. **`src/db/seed-data.ts`（改写）** — 种子数据从 5 篇扩充到 9 篇，区块从 21 增加到 60+。新增笔记：TypeScript 高级类型体操、语义向量检索原理与实践、SQLite 数据库架构、暗色模式实现笔记。现有笔记大幅扩充内容（更多段落、代码示例、wikilink 交叉引用）。
2. **`docs/Database-Architecture.md`（新建）** — SQLite + Drizzle ORM 架构文档（表结构、连接管理、数据访问层、Seed 机制）
3. **`docs/AI-RAG-Architecture.md`（新建）** — AI 与 RAG 架构文档（聊天链路、局部重写、语义检索、embedding 流程、增量更新策略）
4. **`docs/Development-Guide.md`（新建）** — 开发指南（环境准备、项目结构、常用命令、测试、数据库管理、部署、常见问题）
5. **`docs/API-Reference.md`（新建）** — API 参考（7 个 Server Actions、2 个 API Routes、数据访问层函数签名）

**技术决策**：
- 种子数据覆盖项目所有技术要点（架构、状态管理、容灾、TypeScript、RAG、数据库、暗色模式），通过 wikilink 互相引用形成丰富的知识图谱
- 文档按职责分离：Database（数据层）、AI-RAG（AI 能力线）、Development（开发流程）、API（接口参考）

---

# 2026-05-27 工作日志

# 2026-05-27 工作日志

## RAG 检索增强 + Citations 引用溯源 ✅

**目标**：实现跨笔记 RAG 检索，AI 回答附带可点击的引用来源标记。

**实现内容**：

1. **`src/lib/retrieval.ts`（新建）**
   - `tokenize(text)` — 中文逐字切分 + 英文按空格切分，去 wikilink 语法
   - `scoreBlock(queryTokens, blockTokens, idf)` — TF-IDF 评分
   - `keywordSearch(query, documents, topK)` — 跨所有文档检索相关区块，返回 `SearchResultFragment[]`
   - `simulateNetwork(200, 0)` — 200ms 延迟，0% 失败率
   - Edge Runtime 兼容：仅使用 RegExp、Map、Math.log

2. **`src/app/api/chat/route.ts`（修改）**
   - 从最后一条用户消息提取检索 query
   - 调用 `keywordSearch` 获取跨笔记相关区块
   - System prompt 追加「检索到的相关知识片段」+「引用规则」
   - `createUIMessageStream` 替代 `toUIMessageStreamResponse`，注入 `data-citations` part

3. **`src/components/ai/CitationChip.tsx`（新建）**
   - 内联引用标记：小圆形上标按钮，`bg-primary/10 text-primary`
   - Hover/Click popover 显示来源笔记标题 + 内容预览
   - `source === undefined` 时仅显示数字（处理模型幻觉编号）

4. **`src/components/ai/CitationSources.tsx`（新建）**
   - 底部来源卡片列表：编号圆标 + 笔记标题 + 内容预览
   - 点击跳转到源笔记 `/app/note/${noteId}`

5. **`src/components/ai/ChatPanel.tsx`（修改）**
   - `parseCitations(text)` 正则 `/\[(\d+)\]/g` 拆分文本为 `(string | {index})[]` 片段
   - 提取 `data-citations` part 中的 sources
   - 交替渲染 ReactMarkdown 片段和 CitationChip 组件
   - 消息底部渲染 CitationSources

6. **`src/types/index.ts`（修改）**
   - `SearchResultFragment` 新增 `noteId: string` 字段

**技术决策**：
- TF-IDF 而非向量搜索：Mock-First 策略，5 文档 21 区块规模下关键词搜索足够演示
- `createUIMessageStream` + `data-citations` 自定义 part：citations 按消息存储在 parts 中，无需全局状态
- 流式体验：文本流式到达时 `[N]` 作为纯文本显示，流结束后 citations part 到达触发重渲染变为可交互 chip
- `simulateNetwork(200, 0)`：检索添加 200ms 延迟模拟真实向量库，但不随机失败（检索应稳定可靠）

---

## 暗色模式全量实现 ✅

**目标**：为项目实现完整的暗色模式支持，包括主题切换 UI 和全量颜色迁移。

**实现内容**：

1. **主题基础设施（Phase 1）**
   - 安装 `next-themes`，配置 `ThemeProvider`（`attribute="class"` + `defaultTheme="system"` + `enableSystem`）
   - `src/app/layout.tsx`：`<html>` 加 `suppressHydrationWarning`，`<body>` 内包裹 `ThemeProvider`

2. **主题切换组件（Phase 2）**
   - 新建 `src/components/theme-toggle.tsx`：`useTheme()` + Sun/Moon 图标 + shadcn DropdownMenu（亮色/暗色/跟随系统）
   - 安装 shadcn `dropdown-menu` 组件
   - `src/app/app/layout.tsx`：侧边栏头部放置 `ThemeToggle`

3. **P0 颜色迁移（高可见度页面）**
   - `src/app/app/layout.tsx`：侧边栏 + 主区域，~13 处 `bg-white/text-zinc-*/bg-zinc-*` → `bg-background/text-foreground/bg-sidebar`
   - `src/components/ai/ChatPanel.tsx`：聊天面板，~18 处迁移（消息气泡、输入框、加载动画）
   - `src/app/app/note/[id]/page.tsx`：标题 `text-zinc-900` → `text-foreground`

4. **P1 颜色迁移（编辑器组件）**
   - `SlashMenu.tsx`：弹出菜单 `bg-white` → `bg-popover`，选中项 → `bg-accent`
   - `RewriteToolbar.tsx`：工具栏 + 快捷操作按钮颜色迁移
   - `TodoBlock.tsx`：复选框 + 文字颜色（checked/unchecked 两种状态）
   - `GenerativeUIBlock.tsx`：streaming 动画点 + 边框 → `bg-primary` 系列
   - `HeadingBlock.tsx`、`ParagraphBlock.tsx`：文字颜色 → `text-foreground`
   - `BlockRenderer.tsx`、`SortableBlockItem.tsx`、`RichTextEditor.tsx`：拖拽手柄 + 空态 + placeholder

5. **P2+P3 颜色迁移（辅助 UI + 状态页）**
   - `BacklinksPanel.tsx`：skeleton + 错误态 + 链接卡片全量迁移
   - `GraphView.tsx`：空态提示 + canvas 边框
   - `TaskBoard.tsx`：看板容器 + 任务项 + 计数徽章
   - `CodeBlock.tsx`：语言标签（保留 `bg-zinc-950` 深色代码块不变）
   - `loading.tsx`、`error.tsx`、`not-found.tsx`：骨架屏 + 错误/404 页面
   - `graph/page.tsx`、`page.tsx`：图谱页 + 仪表盘首页

6. **测试修复**
   - `loading.test.tsx`：断言 `.bg-zinc-100` → `.bg-muted`
   - `theme-toggle.tsx`：`useEffect` 加 `eslint-disable-line` 注释（hydration guard 模式）

**技术决策**：
- `next-themes` + `attribute="class"` 模式：利用 shadcn 已有的 `.dark` CSS 变量基础设施，零额外样式成本
- `defaultTheme="system"`：默认跟随系统偏好，用户可手动覆盖
- `disableTransitionOnChange`：切换主题时禁用 CSS transition，防止闪烁
- CodeBlock 保留 `bg-zinc-950`：代码块有意使用深色背景（类似 IDE 体验），不随主题变化
- shadcn 语义化 token 全量替代硬编码颜色：一处修改全局生效，未来新增主题变体零成本

**颜色映射规则**：
| 硬编码 | 语义化替代 | 场景 |
|--------|-----------|------|
| `bg-white` | `bg-background` / `bg-popover` / `bg-card` | 页面/弹窗/卡片 |
| `text-zinc-900/800/700` | `text-foreground` | 主文本 |
| `text-zinc-600/500/400` | `text-muted-foreground` | 次要文本 |
| `bg-zinc-50/100` | `bg-muted` | 浅背景 |
| `border-zinc-200/100` | `border-border` | 边框 |
| `bg-zinc-900 text-white` | `bg-primary text-primary-foreground` | 主按钮 |
| `hover:bg-indigo-50` | `hover:bg-accent` | 强调 hover |

---

## 阶段四收尾：测试 + Bug 修复 + UX 打磨 ✅

## 完成任务

### 任务 4.3：知识网络 ✅

**目标**：实现 `[[wikilink]]` 双向链接 + 力导向图谱可视化 + 反向链接面板。

**实现内容**：

1. **`src/lib/wikilink-parser.ts`（新建）**
   - `parseWikilinks(content)` — 正则 `/\[\[([^\]]+)\]\]/g` 提取 wikilink 目标标题
   - `resolveWikilinkTitle(title, documents)` — 按标题精确匹配解析为文档 ID
   - `extractContext(content, matchIndex, matchLength)` — 提取 wikilink 周围 ±40 字符的上下文预览

2. **`src/components/editor/extensions/wikilink-decoration.ts`（新建）**
   - ProseMirror Plugin，维护 `DecorationSet` 实时高亮 `[[...]]` 语法
   - 点击跳转：通过 `caretRangeFromPoint` + TreeWalker 精确检测点击字符偏移，验证是否落在 `[[...]]` 范围内，避免 ProseMirror `posAtCoords` 的坐标偏移问题

3. **`src/components/knowledge/GraphView.tsx`（新建）**
   - `d3-force` 力导向图谱（`forceLink` + `forceManyBody` + `forceCollide`）
   - Canvas 渲染：节点大小按反向链接数加权，标签显示 emoji + 截断标题
   - 交互：滚轮缩放、拖拽平移、点击节点跳转笔记页
   - Auto-fit：simulation 结束后一次性计算包围盒并调整 viewport，避免抽动

4. **`src/components/knowledge/BacklinksPanel.tsx`（新建）**
   - 展示当前笔记的所有反向链接（来源笔记 + 上下文预览）
   - Skeleton loading 状态，无引用时返回 null

5. **`src/app/app/graph/page.tsx`（新建）**
   - 全屏图谱页面，调用 `getGraphData()` server action 获取节点和边数据

6. **`src/actions/note.ts`（修改）**
   - 新增 `getGraphData()` — 扫描所有文档的 wikilink，构建 `{ nodes, edges }` 图数据
   - 新增 `getBacklinksForNote(noteId)` — 查询指定笔记的所有反向引用

7. **`src/app/app/layout.tsx`（修改）**
   - 侧边栏新增图谱入口（`/app/graph`）

8. **`src/mock/data.ts`（修改）**
   - 补充 5 篇文档间的 `[[wikilink]]` 交叉引用样例

**技术决策**：
- ProseMirror 插件而非 Tiptap Node Extension：wikilink 是装饰性语法，不改变文档结构，`Decoration.inline` 更轻量
- Canvas 而非 SVG 渲染图谱：节点数可扩展，性能更好
- `caretRangeFromPoint` + TreeWalker 检测点击：绕过 ProseMirror `posAtCoords` 在 inline decoration 下的坐标偏移问题
- Auto-fit 在 simulation `end` 事件中执行一次：避免在 tick 过程中持续调整 viewport 导致抽动

**踩坑记录**：

1. **ProseMirror `posAtCoords` 在 inline decoration 下的坐标偏移**
   - 现象：wikilink 高亮正常显示，但点击时 `posAtCoords` 返回的位置与实际点击字符不一致，导致偏移检测失败
   - 原因：ProseMirror 的 `posAtCoords` 基于文档模型坐标，但 inline decoration 不占文档位置，导致坐标映射出现偏差
   - 解决：放弃 `posAtCoords`，改用浏览器原生 `document.caretRangeFromPoint(event.clientX, event.clientY)` 获取点击处的 DOM 文本节点 + 偏移量，再通过 TreeWalker 向上遍历找 `.wikilink` 祖先元素，最后用字符偏移验证是否落在 `[[...]]` 范围内

2. **ProseMirror 插件注册时机与 React 渲染冲突**
   - 现象：在组件 render 阶段直接调用 `editor.registerPlugin()` 时报错或行为异常
   - 原因：Tiptap 的 Editor 实例在 React reconciler 完成前就初始化完毕，render 阶段注册插件会与 React 的调度冲突
   - 解决：用 `requestAnimationFrame` 包裹 `registerPlugin` 调用，将注册推迟到浏览器下一帧（React 渲染完成后）

3. **D3 force 图谱 auto-fit 导致视觉抽动**
   - 现象：图谱渲染时画面先在原点附近闪烁，再突然跳到正确位置
   - 原因：最初在每个 `tick` 事件中都重新计算包围盒并调整 viewport，但 simulation 早期节点位置剧烈变化，导致 viewport 不断跳动
   - 解决：只在 simulation `end` 事件中执行一次 auto-fit（计算所有节点的包围盒 → 算出合适的 scale 和 offset → 重绘），用 `finalFitDone` 标志防止重复执行

4. **Canvas 高 DPI 屏幕模糊**
   - 现象：Canvas 在 Retina/高分屏上渲染模糊
   - 原因：Canvas 的物理像素与 CSS 像素 1:1 对应，但高 DPI 屏幕的物理像素是 CSS 像素的 2-3 倍
   - 解决：读取 `window.devicePixelRatio`，将 `canvas.width/height` 设为 `容器宽高 × dpr`，再用 `canvas.style.width/height` 保持 CSS 尺寸不变，绘制时 `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` 做缩放补偿

5. **Canvas 拖拽平移与节点点击冲突**
   - 现象：想点击节点跳转时，微小的鼠标抖动被识别为拖拽，导致跳转失败
   - 解决：维护 `pointerMoved` 标志，在 `pointermove` 中检测位移超过 3px 才置为 true；`pointerup` 时只有 `pointerMoved === false` 才判定为点击，执行节点命中检测（坐标反变换 → 遍历节点 → 距离平方 < 半径平方）

6. **全局正则 `lastIndex` 状态残留**
   - 现象：wikilink 匹配偶数次正常，奇数次漏匹配
   - 原因：`/\[\[([^\]]+)\]\]/g` 是全局正则，`exec()` 会推进 `lastIndex`，下次调用从上次结束位置继续。如果不手动重置，循环外的二次调用会跳过开头
   - 解决：每次 `exec` 前手动 `WIKILINK_REGEX.lastIndex = 0`

---

## 阶段四收尾：测试 + Bug 修复 + UX 打磨 ✅

**目标**：补全测试覆盖、修复代码审查发现的 15 个问题（功能 bug、UX 缺陷、无障碍、暗色模式）。

**实现内容**：

1. **wikilink-parser 单元测试（新建 `src/lib/__tests__/wikilink-parser.test.ts`）**
   - 覆盖 `parseWikilinks`（单/多链接、无链接、空字符串、空格 trim、连续链接）
   - 覆盖 `resolveWikilinkTitle`（精确匹配、无匹配、空数组、大小写敏感）
   - 覆盖 `extractContext`（上下文提取、首尾边界、短文本）

2. **修复 wikilink-decoration 两个 bug（`wikilink-decoration.ts`）**
   - 多 wikilink 点击失效：`exec` 单次匹配改为 `while` 循环遍历所有匹配
   - 变量名遮蔽：`let node: Node` 改为 `domNode`，避免遮蔽 ProseMirror 的 `Node` 类型

3. **修复 RewriteToolbar 三个问题（`RewriteToolbar.tsx`）**
   - Escape 关闭：加 `useEffect` 监听 Escape 键调用 `onClose()`
   - 工具栏溢出顶部：检测 `position.y - 120 < 0` 时向下弹出
   - 自定义指令无提交按钮：表单内加 ArrowRight 图标按钮

4. **SortableBlockItem 删除确认 + 无障碍（`SortableBlockItem.tsx`）**
   - 二次确认删除：首次点击变红 + "确认删除"，3 秒超时自动恢复
   - 拖拽手柄加 `aria-label="拖拽排序"`，删除按钮加动态 `aria-label`

5. **BacklinksPanel 错误态 + 空态 + emoji（`BacklinksPanel.tsx` + `types/index.ts` + `actions/note.ts`）**
   - 错误态：加 `error` state + 重试按钮，不再静默吞掉错误
   - 空态：`backlinks.length === 0` 时显示"暂无反向链接"
   - emoji 修复：`Wikilink` 类型加 `sourceEmoji`，action 中填充，移除 `mockDocuments` 硬编码依赖

6. **GraphView 空态 + 图谱页错误重试 + 无障碍（`GraphView.tsx` + `graph/page.tsx`）**
   - 空图谱：`data.nodes.length === 0` 时渲染提示信息
   - 错误重试：错误状态加"重试"按钮
   - Canvas 无障碍：加 `role="img"`、`aria-label`、`tabIndex`、fallback `<p>`

7. **暗色模式颜色适配（`globals.css` + `GraphView.tsx`）**
   - wikilink 样式：颜色改为 CSS 变量 `--color-wikilink` / `--color-wikilink-hover`
   - 图谱 canvas：颜色改为 `--graph-edge`、`--graph-node`、`--graph-node-stroke`、`--graph-label` 变量
   - `:root` 和 `.dark` 中分别定义亮/暗色值

---

# 2026-05-15 工作日志

## 优化与修复

### AI 局部重写体验优化 ✅

**目标**：解决选区检测闪烁与改写时"空白等待"体验问题。

**实现内容**：

1. **选区防抖（`RichTextEditor.tsx`）**
   - 新增 `selectionTimerRef` + 300ms 防抖：选区变化时立即隐藏菜单（防止拖拽闪烁），300ms 后才检测选区并决定是否弹出
   - 替换原来的一次性检测逻辑，避免快速拖拽时菜单反复闪烁

2. **延迟删除 + Loading 态（`RichTextEditor.tsx`）**
   - `handleRewrite` 不再立即 `deleteRange` 删除原文，改为先弹出 `toast.loading('✨ AI 正在思考，请稍候...')`
   - 仅在收到第一波 chunk 数据时才删除旧文字并关闭 loading，用户不会看到空白闪烁
   - 错误路径同步 `toast.dismiss(toastId)` 清理 loading 状态

**技术决策**：
- 300ms 防抖时间：平衡响应速度与防抖效果，用户短暂停留即触发，快速拖拽不会误触
- 延迟删除策略：避免网络延迟期间用户看到选区文字突然消失的"惊吓感"

---

## 完成任务

### 任务 4.2：AI 局部重写 ✅

**目标**：在编辑器中实现选中文字 → 浮现工具栏 → AI 流式原位改写，复用现有 Tiptap + streaming 基础设施。

**实现内容**：

1. **`/api/rewrite` Route Handler（新建）**
   - Edge Runtime + `streamText` 调用 DeepSeek API
   - 接收 `{ text, instruction, context }` 参数
   - system prompt 约束 AI 只输出改写文本，不附带解释、不包裹代码块
   - `temperature: 0.3` 保证改写稳定性

2. **`RewriteToolbar` 浮动工具栏（新建）**
   - `createPortal` 挂载至 `document.body`，定位在选区正上方
   - 四个快捷指令：智能润色、扩写段落、精简提炼、翻译为英文
   - 自定义指令输入框，支持回车提交
   - `onMouseDown` 阻止冒泡，防止点击菜单时 Tiptap 丢失选区

3. **`RichTextEditor` 选区检测与流式替换（修改）**
   - 新增 `rewriteMenuState` 管理工具栏的开/关、坐标、选中文本及位置
   - `editor.on('selectionUpdate')` 监听选区变化：有选区时提取纯文本 + 计算屏幕坐标 → 打开工具栏；无选区时关闭
   - `handleRewrite`：关闭菜单 → `deleteRange` 删除原文 → `fetch('/api/rewrite')` 发起流式请求 → 逐 chunk `insertContent` 打字机式插入 → 完成后触发保存同步 + toast；失败时 toast 提示用户 Ctrl+Z 撤销

4. **Zustand Store 扩展（修改）**
   - 新增 `RewriteTarget` 类型与 `rewriteTarget` 状态字段
   - 新增 `setRewriteTarget` 方法，预留跨组件协调改写目标的能力

**技术决策**：
- 流式原位替换策略：先删除原文再逐 token 插入，利用 Tiptap 的 transaction API 保证原子性
- 改写 API 独立于 `/api/chat`：system prompt、temperature、错误语义均与对话不同，隔离更清晰
- 工具栏用 `createPortal` 渲染，避免被编辑器的 `overflow: hidden` 裁剪

---

# 2026-05-14 工作日志

## 完成任务

### 任务 4.1：Block 删除 + 拖拽排序 ✅

**目标**：在编辑器中实现 Block 级别的拖拽重排和删除功能，沿用已有的双缓冲 + 回滚架构。

**实现内容**：

1. **依赖安装**
   - 新增 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`

2. **`SortableBlockItem` 组件（新建）**
   - 基于 `useSortable` 的包裹组件，为每个 Block 提供拖拽手柄（左侧 GripVertical 图标，hover 显示）和删除按钮（右侧 Trash2 图标，hover 显示）
   - 拖拽时自动提升层级 + 降低透明度的视觉反馈
   - 最后一个 Block 时隐藏删除按钮（`isOnlyBlock` 防护）

3. **`BlockRenderer` DnD 集成（修改）**
   - `DndContext` + `SortableContext` 包裹整个渲染循环
   - `PointerSensor` 设置 `distance: 5px` 激活约束，保护富文本选区不被拖拽误触
   - `DragOverlay` 实现悬浮预览层，带有弹簧回弹动画和毛玻璃阴影效果
   - `handleDragEnd`：`arrayMove` 本地乐观重排 → `reorderBlocksAction` 服务端同步 → 失败回滚
   - `handleDeleteBlock`：本地乐观移除 → `deleteBlockAction` 服务端同步 → 失败回滚

4. **Server Actions（修改）**
   - `deleteBlockAction(noteId, blockId)`：从 mock 数据中过滤删除目标 Block
   - `reorderBlocksAction(noteId, blockIds[])`：按传入 ID 数组重排 mock 数据的 blocks
   - 两个 Action 均沿用 `simulateNetwork` 模式（500ms 延迟 + 15% 失败率）

**技术决策**：
- 选择 `@dnd-kit` 而非 `react-beautiful-dnd`：体积小、无障碍优先、维护活跃、原生支持虚拟化
- 拖拽与删除均复用已有的双缓冲 + 回滚架构（乐观更新 → 服务端确认 → 推进快照 / 失败回滚）

## 文档更新

- `docs/Current-Status.md`：标记任务 4.1 完成，更新当前重心为 4.2（AI 局部重写）
- `docs/Phase-4-Execution-Plan.md`：标记 P0 完成，补充交付物清单，更新依赖关系图

## 下一步

- 任务 4.2（P1）：AI 局部重写 — 选中文字 → 浮现工具栏 → AI 流式原位改写
- 任务 4.3（P2）：知识网络 — `[[wikilink]]` 双向链接 + 力导向图谱可视化
