# 04-Current-Status.md

## 1. 项目基本信息

- **项目名称**：ai-note
- **当前阶段**：阶段三全部完成；阶段四全部完成（拖拽排序 ✅ + AI 局部重写 ✅ + 知识网络 ✅ + 收尾打磨 ✅ + 暗色模式 ✅）；阶段五 RAG + Citations 已完成；阶段六真实数据层已完成
- **当前重心**：阶段六 SQLite + Drizzle ORM 已交付，数据真正持久化
- **上次更新时间**：2026-05-28

## 2. 已完成里程碑 (Completed)

- [x] **项目愿景与 PRD 确立**：`docs/Project-Vision-and-PRD.md` 已明确核心方向与 Mock-First 策略。
- [x] **工程初始化完成**：Next.js App Router 项目已可运行，基础页面与布局已建立。
- [x] **核心数据模型代码化**：`src/types/index.ts` 已完成 Block/Document 等核心类型定义。
- [x] **首批 Mock 数据落地**：`src/mock/data.ts` 已基于 Schema 提供可用文档与区块样本。
- [x] **Mock Server Actions 落地**：`src/actions/note.ts` 已实现带延迟/失败率的获取与更新接口。
- [x] **三栏布局骨架完成**：`src/app/app/layout.tsx` 已实现 Sidebar / Editor / Agent Panel 框架。
- [x] **笔记列表首页完成**：`src/app/app/page.tsx` 已实现笔记列表入口页面。
- [x] **详情页加载态完成**：`src/app/app/note/[id]/loading.tsx` 已提供骨架屏体验。
- [x] **404 页面完成**：`src/app/app/note/[id]/not-found.tsx` 已实现笔记不存在时的友好提示。
- [x] **区块内容渲染闭环完成**：`src/app/app/note/[id]/page.tsx` 已接入 `BlockRenderer`，可按区块类型渲染页面内容。
- [x] **错误语义分流完成**：详情页已仅在“404 笔记不存在”时走 `notFound()`，其余异常进入 `error.tsx` 并支持重试。
- [x] **区块保存与失败回滚已接入**：`src/components/editor/BlockRenderer.tsx` 已接入 `updateBlockAction`、防抖提交、失败回滚与 `router.refresh()` 对齐。
- [x] **编辑链路稳态化（阶段一）完成**：已完成块级防抖、挂起更新合并缓冲区、卸载清理与局部回滚对齐。
- [x] **侧栏数据联动完成**：`src/app/app/layout.tsx` 已基于 `mockDocuments` 动态渲染列表，支持当前路由高亮与跳转。
- [x] **Todo 区块渲染接入完成**：`BlockRenderer` 已注册 `todo`，并新增 `TodoBlock` 组件。
- [x] **`generative_ui` 渲染闭环完成**：`BlockRenderer` 已注册 `generative_ui`，并接入 `GenerativeUIBlock` 的 streaming/error/completed 三态渲染。
- [x] **并发提交乱序防护完成**：区块保存链路已引入请求序号（`requestSeqRef` + `lastResolvedVersionRef`），旧响应不会覆盖新状态。
- [x] **最小测试集已落地**：已覆盖 `loading`、`error`、区块保存成功、保存失败回滚等核心路径（Vitest + Testing Library）。
- [x] **GenerativeUIBlock 单元测试已编写**：覆盖 streaming/error/未知组件/异常 props 四条回归路径（`GenerativeUIBlock.test.tsx`）。
- [x] **stale save 覆盖修复完成**：已防止旧的区块保存响应覆盖新状态。
- [x] **斜杠指令 MVP 交付完成**：已实现 `/` 键触发悬浮菜单、键盘/鼠标交互、区块乐观插入与失败回滚、Heading/Code 可编辑化。
- [x] **Tiptap 富文本引擎集成完成**：`RichTextEditor` 已基于 Tiptap 实现，支持 StarterKit、Placeholder 扩展、IME 输入兼容。
- [x] **ESLint 类型安全修复完成**：移除所有 `@typescript-eslint/no-explicit-any` 错误与 `no-unused-vars` 警告。
- [x] **动态分发类型豁免与 AI props 收敛（P0）**：`BlockRenderer` 动态分发豁免压缩到 `React.ElementType` 单一调用点；`GenerativeUIBlock` 导出 `KNOWN_COMPONENT_IDS` 白名单，新增 `sanitizeProps` 运行时防护，移除所有 `as any` 断言。
- [x] **保存链路可观测性（P0）**：已新增 `src/lib/telemetry.ts`，`BlockRenderer` 中所有保存路径（成功/失败/回滚/乱序）均通过 `emitSaveEvent` 输出结构化事件。
- [x] **新区块自动聚焦完成**：所有区块组件（ParagraphBlock、HeadingBlock、TodoBlock、CodeBlock）均已接入 `autoFocus`，插入新区块后自动获得焦点。
- [x] **DeepSeek API 接入完成**：`/api/chat` Route Handler 已搭建，使用 `@ai-sdk/openai` + DeepSeek baseURL，`streamText` 实现 streaming 对话。
- [x] **Agent 侧边栏 Chat UI 完成**：`ChatPanel.tsx` 已基于 `useChat` + `DefaultChatTransport` 实现完整聊天界面，含消息列表、流式渲染、加载状态与错误处理。
- [x] **笔记上下文注入完成**：`BlockRenderer` 通过 `useEffect` 将区块内容实时序列化至 Zustand `noteContext`，`ChatPanel` 在 `sendMessage` 时通过 `body` 动态注入，API Route 在 system prompt 中拼接。
- [x] **AI 回复 Markdown 渲染完成**：`ChatPanel` 接入 `react-markdown` + `remark-gfm`，AI 回复支持代码块、列表、加粗等富文本渲染，引入 `@tailwindcss/typography` 插件。
- [x] **AI 面板拖拽调整宽度完成**：`layout.tsx` 中 AI 面板支持左侧拖拽手柄，宽度范围 280px-800px。
- [x] **AI 加载动画完成**：`ChatPanel` 新增三点弹跳 + 文字脉冲的 loading 状态（"正在阅读笔记内容..."）。
- [x] **AI → 编辑器插入链路完成（任务 3.4）**：Zustand store 新增 `pendingInsertBlocks` 事件总线，`ChatPanel` AI 消息悬浮显示"插入到画布"按钮，内置 Markdown-to-Blocks 解析引擎（支持 JSON 代码块、代码块、标题、Todo 列表、段落），`BlockRenderer` 监听指令批量追加内容至画布末尾。
- [x] **Generative UI 联动完成（任务 3.5）**：AI system prompt 引导返回 TaskBoard 结构化 JSON，`GenerativeUIBlock` 支持 `onUpdateProps` 回调，`TaskBoard` 支持点击循环切换任务状态（todo → in-progress → done），状态变更同步回编辑器 attributes。
- [x] **SlashMenu 增强**：`SlashMenuItem` 接口新增 `content?` 和 `attributes?` 字段，支持插入时携带初始内容与属性。
- [x] **AI 错误处理完善**：`ChatPanel` 新增 `sonner` toast 错误通知 + 内联错误 UI（红色警告卡片 + "重新生成"按钮），API Route 返回结构化 JSON 错误响应。
- [x] **Edge Runtime 声明**：`/api/chat` Route Handler 显式声明 `export const runtime = 'edge'`，优化流式输出性能。
- [x] **Vercel 部署完成（任务 3.7）**：环境变量已配置，streaming 在 Edge Runtime 下正常工作，live demo 已上线。
- [x] **Block 删除 + 拖拽排序完成（任务 4.1）**：`@dnd-kit` 集成，`SortableBlockItem` 包裹每个区块提供拖拽手柄与删除按钮；`DragOverlay` 悬浮层实现丝滑拖拽体验；`deleteBlockAction` + `reorderBlocksAction` 沿用双缓冲 + 回滚架构，拖拽/删除均支持乐观更新与失败恢复。
- [x] **AI 局部重写完成（任务 4.2）**：选中文字后浮现浮动工具栏（智能润色/扩写/精简/翻译/自定义指令），`/api/rewrite` Edge API 调用 DeepSeek 流式返回改写结果，`RichTextEditor` 逐 token 原位替换（300ms 选区防抖 + 延迟删除避免空白闪烁 + loading 态过渡），完成触发保存同步 + toast 反馈，失败支持 Ctrl+Z 撤销恢复。
- [x] **知识网络完成（任务 4.3）**：`[[wikilink]]` 双向链接语法（`wikilink-parser.ts` 解析 + `wikilink-decoration.ts` ProseMirror 插件实现高亮与点击跳转），`d3-force` 力导向图谱可视化（`GraphView.tsx` 支持缩放/平移/点击节点跳转），反向链接面板（`BacklinksPanel.tsx` 展示当前笔记的引用来源与上下文预览），图谱全屏页面（`app/graph/page.tsx`），侧边栏新增图谱入口。图谱 auto-fit 在 simulation 结束后一次性执行，避免抽动。
- [x] **阶段四收尾打磨完成**：wikilink-parser 单元测试（12 个用例）；修复 wikilink-decoration 多链接点击失效 + 变量遮蔽 bug；RewriteToolbar 加 Escape 关闭 + 视口边界翻转 + 提交按钮；SortableBlockItem 加二次确认删除 + aria-label 无障碍；BacklinksPanel 加错误态/空态提示 + sourceEmoji 解耦 mockDocuments；GraphView 加空态提示 + Canvas ARIA 属性 + 图谱页错误重试；暗色模式颜色适配（wikilink + 图谱 canvas 颜色改为 CSS 变量）。
- [x] **暗色模式全量实现完成**：安装 `next-themes` + `ThemeProvider`（`attribute="class"` + `defaultTheme="system"`）；创建 `ThemeToggle` 组件（亮色/暗色/跟随系统三级切换）；21 个文件 43 处硬编码颜色迁移为 shadcn 语义化 token（`bg-background`、`text-foreground`、`bg-muted`、`text-muted-foreground`、`bg-primary`、`border-border` 等）；CodeBlock 保留深色不变（有意设计）；测试 + lint 零错误。
- [x] **RAG 检索增强 + Citations 引用溯源完成（任务 5.1）**：`src/lib/retrieval.ts` 实现 TF-IDF 关键词检索引擎（中英文分词 + TF-IDF 评分 + Edge Runtime 兼容）；`/api/chat` 接入 RAG —— 提取用户 query 跨所有笔记检索相关区块，构建带编号的「检索到的相关知识片段」注入 system prompt，要求模型使用 `[N]` 引用标记；`createUIMessageStream` 注入 `data-citations` 自定义数据 part 到流式响应；`CitationChip` 内联引用标记组件（hover popover 显示来源预览）；`CitationSources` 底部来源卡片列表（可跳转源笔记）；`ChatPanel` 解析 `[N]` 标记交替渲染 ReactMarkdown 和 CitationChip；`SearchResultFragment` 类型扩展 `noteId` 字段；测试 + lint 零错误。
- [x] **真实数据层完成（任务 6.1）**：Mock 数据全面替换为 SQLite + Drizzle ORM 持久化。新建 `src/db/` 数据层（schema.ts 表定义 + index.ts 连接单例 + queries.ts 数据访问层 + seed.ts 幂等填充）；7 个 Server Actions 改写为调用 DB 查询（删除 `simulateNetwork` 假延迟/失败）；`/api/chat` 移除 Edge Runtime 改用 Node.js 以支持 better-sqlite3；`layout.tsx` 拆为 Server Component（DB 查询）+ `AppShell.tsx` Client Component；`BlockRenderer` 接受 `documents` prop 替代 mock 硬编码；`retrieval.ts` 删除 mock 延迟；tiptap 全家桶升级至 3.23.6 修复版本冲突；build + 22 tests 全部通过。

## 3. 进行中的任务 (In Progress)

- 阶段六真实数据层已完成，数据已持久化至 SQLite

## 4. 下一阶段任务派发 (Next Steps)

1. ~~**任务 4.1（P0）**~~ ✅ 已完成：类型收敛与白名单防护。
2. ~~**任务 4.2（P0）**~~ ✅ 已完成：可观测性埋点已落地。
3. ~~**任务 3.1（P0）**~~ ✅ 已完成：环境配置 + `/api/chat` Route Handler 搭建。
4. ~~**任务 3.2（P0）**~~ ✅ 已完成：Agent 侧边栏 Chat UI（`useChat` + streaming 渲染）。
5. ~~**任务 3.3（P0）**~~ ✅ 已完成：笔记上下文注入（Zustand noteContext + sendMessage body 动态注入）。
6. ~~**任务 3.4（P1）**~~ ✅ 已完成：AI → 编辑器插入链路（Zustand 事件总线 + `insertBlock`）。
7. ~~**任务 3.5（P1）**~~ ✅ 已完成：Generative UI 联动（AI 返回 TaskBoard JSON + TaskBoard 交互式状态切换）。
8. ~~**任务 3.6（P2）**~~ ✅ 已完成：UI 打磨（Markdown 渲染、加载动画、面板拖拽、错误处理均已交付）。
9. ~~**任务 3.7（P2）**~~ ✅ 已完成：Vercel 部署，streaming 在 Edge Runtime 下正常工作。
10. ~~**任务 4.3（P2）**~~ ✅ 已完成：知识网络（wikilink 双向链接 + 力导向图谱 + 反向链接面板）。
11. **执行清单文档**：详见 `docs/Phase-3-Execution-Plan.md`、`docs/Phase-4-Execution-Plan.md`。

## 5. 关键备注 (Context Memo)

- **当前进展结论**：阶段六已完成，Mock 数据全面替换为 SQLite + Drizzle ORM。笔记数据真正持久化，重启不丢失。编辑器 CRUD、图谱、RAG 检索均已接入真实数据库。
- **下一步方向**：可考虑语义向量检索（Embedding 替换 TF-IDF）、多模态输入、用户认证、协作功能等。

## 6. 技术栈接入状态澄清

以下技术在文档中被列为项目依赖，截至当前阶段已在代码中实际接入：

| 技术 | 文档中的定位 | 当前代码状态 | 说明 |
|------|-------------|-------------|------|
| **Vercel AI SDK** (`ai` / `@ai-sdk/react` / `@ai-sdk/openai`) | AI 交互引擎 | **已接入** | `route.ts` 使用 `streamText` + `createOpenAI` 调用 DeepSeek；`ChatPanel.tsx` 使用 `useChat` + `DefaultChatTransport`。 |
| **Zustand** | 跨组件全局状态 | **已接入，扩展为 Agent ↔ Editor 事件总线** | Store 管理侧边栏/面板开关 + `noteContext`（笔记上下文）+ `pendingInsertBlocks`（AI → 编辑器插入指令）。 |
| **react-markdown + remark-gfm** | AI 回复富文本渲染 | **已接入** | `ChatPanel` 使用 `ReactMarkdown` 渲染 AI 回复，支持 GFM 语法（表格、任务列表等），配合 `@tailwindcss/typography` 样式。 |
| **Drizzle ORM + better-sqlite3** | 数据持久化层 | **已接入** | `src/db/schema.ts` 定义 documents/blocks 两张表；`src/db/queries.ts` 提供 7 个 CRUD 函数；`src/db/seed.ts` 幂等填充种子数据；WAL 模式 + busy_timeout。 |
