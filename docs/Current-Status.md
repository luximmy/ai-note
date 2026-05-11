# 04-Current-Status.md

## 1. 项目基本信息

- **项目名称**：ai-note
- **当前阶段**：阶段二（交互闭环完善）已完成；斜杠指令 MVP 已交付；阶段三 P0（类型收敛、可观测性）已完成；阶段三 P0（AI 核心链路）已完成；阶段三 P1（AI → 编辑器插入）已完成；进入阶段三 P1（Generative UI 联动）
- **当前重心**：Generative UI 联动（任务 3.5），AI 返回结构化 JSON 触发交互组件插入
- **上次更新时间**：2026-05-11

## 2. 已完成里程碑 (Completed)

- [x] **项目愿景与 PRD 确立**：`docs/Project-Vision-and-PRD.md` 已明确核心方向与 Mock-First 策略。
- [x] **工程初始化完成**：Next.js App Router 项目已可运行，基础页面与布局已建立。
- [x] **核心数据模型代码化**：`src/types/index.ts` 已完成 Block/Document 等核心类型定义。
- [x] **首批 Mock 数据落地**：`src/mock/data.ts` 已基于 Schema 提供可用文档与区块样本。
- [x] **Mock Server Actions 落地**：`src/actions/note.ts` 已实现带延迟/失败率的获取与更新接口。
- [x] **三栏布局骨架完成**：`src/app/app/layout.tsx` 已实现 Sidebar / Editor / Agent Panel 框架。
- [x] **详情页加载态完成**：`src/app/app/note/[id]/loading.tsx` 已提供骨架屏体验。
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
- [x] **AI → 编辑器插入链路完成（任务 3.4）**：Zustand store 新增 `pendingInsertBlock` 事件总线，`ChatPanel` AI 消息悬浮显示"插入到画布"按钮，`BlockRenderer` 监听指令复用 `insertBlock` 乐观更新链路追加内容至画布末尾。

## 3. 进行中的任务 (In Progress)

- [ ] **Generative UI 联动**：AI 返回结构化 JSON → 插入交互组件（任务 3.5）

## 4. 下一阶段任务派发 (Next Steps)

1. ~~**任务 4.1（P0）**~~ ✅ 已完成：类型收敛与白名单防护。
2. ~~**任务 4.2（P0）**~~ ✅ 已完成：可观测性埋点已落地。
3. ~~**任务 3.1（P0）**~~ ✅ 已完成：环境配置 + `/api/chat` Route Handler 搭建。
4. ~~**任务 3.2（P0）**~~ ✅ 已完成：Agent 侧边栏 Chat UI（`useChat` + streaming 渲染）。
5. ~~**任务 3.3（P0）**~~ ✅ 已完成：笔记上下文注入（Zustand noteContext + sendMessage body 动态注入）。
6. ~~**任务 3.4（P1）**~~ ✅ 已完成：AI → 编辑器插入链路（Zustand 事件总线 + `insertBlock`）。
7. **任务 3.5（P1）**：Generative UI 联动（AI 返回结构化 JSON → 插入交互组件）。
8. **任务 3.6（P2）**：UI 打磨 + 部署到 Vercel。（部分完成：Markdown 渲染、加载动画、面板拖拽已交付）
9. **执行清单文档**：详见 `docs/Phase-3-Execution-Plan.md`。

## 5. 关键备注 (Context Memo)

- **当前进展结论**：阶段三 P0（AI 核心链路）与 P1（AI → 编辑器插入）均已交付，AI ↔ 编辑器双向联动已形成闭环。下一步是 Generative UI 联动（任务 3.5）和部署打磨（P2）。
- **主要风险**：核心交互链路已打通，剩余风险在于 Generative UI 联动的结构化 JSON 解析与组件映射。
- **执行建议**：先做 Generative UI 联动（P1），再打磨部署（P2）。

## 6. 技术栈接入状态澄清

以下技术在文档中被列为项目依赖，截至当前阶段已在代码中实际接入：

| 技术 | 文档中的定位 | 当前代码状态 | 说明 |
|------|-------------|-------------|------|
| **Vercel AI SDK** (`ai` / `@ai-sdk/react` / `@ai-sdk/openai`) | AI 交互引擎 | **已接入** | `route.ts` 使用 `streamText` + `createOpenAI` 调用 DeepSeek；`ChatPanel.tsx` 使用 `useChat` + `DefaultChatTransport`。 |
| **Zustand** | 跨组件全局状态 | **已接入，扩展为 Agent ↔ Editor 事件总线** | Store 管理侧边栏/面板开关 + `noteContext`（笔记上下文）+ `pendingInsertBlock`（AI → 编辑器插入指令）。 |
| **react-markdown + remark-gfm** | AI 回复富文本渲染 | **已接入** | `ChatPanel` 使用 `ReactMarkdown` 渲染 AI 回复，支持 GFM 语法（表格、任务列表等），配合 `@tailwindcss/typography` 样式。 |
