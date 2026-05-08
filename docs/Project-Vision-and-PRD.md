# 01-Project-Vision-and-PRD.md

## 1. 项目概览 (Project Overview)

- **项目名称**：ai-note
- **项目定位**：一款面向未来的 **AI-Native 区块化协作画布**，旨在通过结构化数据契约（JSON Schema）与大模型能力，将个人笔记从“纯文本记录”提升为“可计算、可交互的第二大脑”。
- **核心愿景**：打破传统笔记“一问一答”的局限，让 AI 直接参与内容的创作、编排与逻辑连接，实现知识的自动化沉淀。

## 2. 核心痛点与解决方案 (Problem & Solution)

| 痛点 (Pain Points)                            | 解决方案 (Solutions)                                                                                  |
| :-------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| 传统笔记是非结构化长字符串，AI 难以精准理解。 | **Block-based 引擎**：内容全量结构化，每个区块（Block）都是确定的 JSON 节点。                         |
| AI 生成的内容只能看，不能直接交互或操作。     | **Generative UI**：AI 不仅返回文本，更能在画布中直接渲染可交互的 React 组件（如代码沙盒、任务看板）。 |
| 笔记碎片化严重，知识点之间存在孤岛。          | **MOC (Map of Content)**：通过 `[[双链]]` 语法与力导向图可视化，自动构建知识拓扑网络。                |
| AI 缺乏个人私有上下文，回答容易产生“幻觉”。   | **私有 RAG 引擎**：基于区块维度的向量召回，让 AI 结合你的笔记背景进行精准回答。                       |

## 3. 功能模块拆解 (Feature Decomposition)

### 3.1 核心画布 (The Canvas)

- **区块化编辑（已完成）**：已支持段落、标题、代码块、待办项与 `generative_ui` 区块，并形成保存-回滚闭环。
- **斜杠指令（已完成）**：通过 `/` 键触发悬浮菜单，支持 Paragraph、Heading (H1/H2)、Todo、Code、Generative UI 六种区块类型插入，含乐观更新与失败回滚。
- **拖拽排序（规划中）**：计划实现 Block 级别拖拽重排，并在离散操作场景引入 `useOptimistic`。

### 3.2 AI Agent 交互

- **Generative UI 嵌入（首版已完成）**：已支持在画布中渲染 AI 区块的 streaming/error/completed 三态，并通过组件注册表按 `componentId` 分发。
- **局部重写 (Refactor)**：选中一段文字，AI 可在当前 Block 原位进行扩写、翻译或逻辑优化。
- **Agent 侧边栏**：支持基于 RAG 的全局问答，回答需带有笔记来源的引用（Citations）。

### 3.3 知识网络 (Knowledge Network)

- **双向链接**：支持 `[[文件名]]` 联想输入，建立笔记间的硬性关联。
- **力导向图 (Visual Graph)**：全屏可视化界面，展现笔记间的连接密度，支持点击节点跳转。

## 4. 技术栈架构 (Tech Stack)

- **前端框架**：Next.js 16 (App Router) + React 19 (Server Components)
- **编辑器底层**：Tiptap (无头编辑器模式)
- **AI 工程**：Vercel AI SDK + DeepSeek API (Streaming UI、Tool Calling、Generative UI 联动)
- **状态管理**：Zustand (轻量级跨组件同步)
- **样式/UI**：Tailwind CSS + shadcn/ui (高保真定制)
- **数据模型**：严格的 TypeScript JSON Schema 定义

## 5. 开发策略：Mock-First (Development Strategy)

为了快速迭代前端体验，本项目采用 **Mock 驱动开发**：

1.  **屏蔽后端复杂度**：所有数据库操作通过 Server Actions 代理，初期仅返回带延迟的 Mock 数据。
2.  **极端工况模拟**：在 Mock 层模拟 800ms 网络延迟与 15% 的报错率（写接口），强制前端完善 **Optimistic UI** 与 **Error Boundary**。
3.  **流式测试**：利用模拟的 `ReadableStream` 调试前端的 Markdown 实时解析与打字机动画。

## 6. 简历高光预设 (Resume Highlights)

- **关键词**：JSON Schema 驱动、React 19 乐观更新、生成式 UI、区块化状态管理、DeepSeek/LLM Streaming 集成、AI ↔ 编辑器双向联动。
- **预期产出**：一个具备高度工程化复杂度、极致交互流畅度、且深度融合 AI 能力的专业级 Web App。AI 不仅能对话，还能直接在画布中生成可交互的 React 组件。
