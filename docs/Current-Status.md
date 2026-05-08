# 04-Current-Status.md

## 1. 项目基本信息

- **项目名称**：ai-note
- **当前阶段**：阶段二（交互闭环完善）已完成；斜杠指令 MVP 已交付；进入阶段三（质量收敛与可扩展性建设）
- **当前重心**：类型安全收敛、可观测性增强、面向真实后端的可迁移性
- **上次更新时间**：2026-05-07

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
- [x] **GenerativeUIBlock 单元测试已编写**：覆盖 streaming/error/未知组件/异常 props 四条回归路径（`GenerativeUIBlock.test.tsx`，待提交至版本库）。
- [x] **stale save 覆盖修复完成**：已防止旧的区块保存响应覆盖新状态。
- [x] **斜杠指令 MVP 交付完成**：已实现 `/` 键触发悬浮菜单、键盘/鼠标交互、区块乐观插入与失败回滚、Heading/Code 可编辑化，详见 `docs/MVP-Slash-Commands-and-Block-Insertion.md`。
- [x] **Tiptap 富文本引擎集成完成**：`RichTextEditor` 已基于 Tiptap 实现，支持 StarterKit、Placeholder 扩展、IME 输入兼容。
- [x] **ESLint 类型安全修复完成**：移除所有 `@typescript-eslint/no-explicit-any` 错误与 `no-unused-vars` 警告。

## 3. 进行中的任务 (In Progress)

- [x] **动态分发类型豁免与 AI props 收敛**：`BlockRenderer` 动态分发豁免压缩到 `React.ElementType` 单一调用点；`GenerativeUIBlock` 导出 `KNOWN_COMPONENT_IDS` 白名单，新增 `sanitizeProps` 运行时防护，移除所有 `as any` 断言。
- [x] **保存链路可观测性**：已新增 `src/lib/telemetry.ts`，`BlockRenderer` 中所有保存路径（成功/失败/回滚/乱序）均通过 `emitSaveEvent` 输出结构化事件。
- [ ] **Mock 到真实后端迁移预案未固化**：需明确 Action 层协议（幂等键、版本字段、错误码语义）以降低切换成本。

## 4. 下一阶段任务派发 (Next Steps)

1. **任务 4.1（P0）**：收敛 Schema 源头的 AI props 类型，保留并审计动态注册表分发处的局部类型豁免，建立可扩展的类型安全注册表。
2. **任务 4.2（P0）**：为保存链路补充可观测性指标与日志规范，形成“可定位、可回放”的故障闭环。
3. **任务 4.3（P1）**：定义真实后端接入协议（版本字段、冲突策略、错误码映射、幂等设计）。
4. **任务 4.4（P1）**：为 `generative_ui` 增加组件白名单校验、降级策略与回归测试样例。
5. **任务 4.5（P2）**：补充端到端编辑流测试（跨区块快速编辑、切页中断、失败恢复）。
6. **执行清单文档**：详见 `docs/Phase-3-Execution-Plan.md`。

## 5. 关键备注 (Context Memo)

- **当前进展结论**：阶段二目标已达成，编辑器核心交互链路（渲染、保存、回滚、最小测试）已形成闭环。
- **主要风险**：风险已从”功能缺失”转向”工程质量”，集中在 Schema 类型源头、AI 组件运行时安全、可观测性与后端迁移协议。
- **执行建议**：优先完成任务 4.1 与 4.2，随后并行推进 4.3 与 4.4，最后补齐 4.5 端到端验证。

## 6. 技术栈接入状态澄清

以下技术在文档中被列为项目依赖，但截至当前阶段 **尚未在代码中实际接入**，属于规划中的技术选型：

| 技术 | 文档中的定位 | 当前代码状态 | 说明 |
|------|-------------|-------------|------|
| **Tiptap** | 富文本/画布底层引擎 | **已接入** | `RichTextEditor` 基于 `@tiptap/react` + `StarterKit` + `Placeholder` 实现，支持斜杠指令菜单触发。 |
| **Vercel AI SDK** (`ai` / `@ai-sdk/react`) | AI 交互引擎 | 未接入，无相关 import | Generative UI 区块当前完全由 Mock 数据驱动，无真实的 AI 调用链路。 |
| **Zustand** | 跨组件全局状态 | 已接入，仅用于 UI 状态 | 当前 Store 仅管理侧边栏/面板开关，未涉及业务数据状态。 |

> **开发策略说明**：本项目采用 Mock-First 策略，Vercel AI SDK 将在对应阶段逐步接入。
