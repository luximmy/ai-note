# 阶段三执行清单：AI 能力接入与 Demo 收口

> 更新时间：2026-05-11
> 目标：接入 DeepSeek API，让 Agent 侧边栏具备真实 AI 对话能力，并支持将 AI 生成内容插入编辑器，形成可演示、可面试的完整闭环。

## 技术选型

| 项目 | 选型 | 理由 |
|------|------|------|
| AI Provider | DeepSeek (`deepseek-chat`) | OpenAI 兼容协议，成本极低（百万 token 几块钱），国内访问稳定 |
| SDK | Vercel AI SDK (`ai` + `@ai-sdk/react` + `@ai-sdk/openai`) | 已安装依赖，原生支持 streaming、tool calling、React 集成 |
| API 层 | Next.js Route Handler (`src/app/api/chat/route.ts`) | 服务端调用，API Key 不暴露给客户端 |
| Markdown 渲染 | `react-markdown` + `remark-gfm` + `@tailwindcss/typography` | AI 回复富文本渲染，支持 GFM 语法 |

## P0：核心 AI 链路打通（必须完成）

### ~~任务 3.1：环境与 API Route 搭建~~ ✅ 已完成

- **目标文件**：`.env.local`、`src/app/api/chat/route.ts`
- **内容**：
  - 配置 `DEEPSEEK_API_KEY` 环境变量
  - 安装 `@ai-sdk/openai` 依赖
  - 创建 `/api/chat` Route Handler，使用 `createOpenAI({ baseURL, apiKey })` 指向 DeepSeek
  - 实现 `streamText` 基础调用，支持 streaming 响应
- **交付标准**：`curl` 或 Postman 可触发流式对话，返回 DeepSeek 的实时 token 流
- **完成时间**：2026-05-11

### ~~任务 3.2：Agent 侧边栏 Chat UI~~ ✅ 已完成

- **目标文件**：`src/components/ai/ChatPanel.tsx`、`src/app/app/layout.tsx`
- **内容**：
  - 使用 `@ai-sdk/react` 的 `useChat` hook 管理对话状态
  - 实现消息列表（用户消息 + AI 消息，区分样式）
  - 实现输入框 + 发送按钮
  - AI 消息支持 streaming 渲染（逐字显示）
  - 替换 layout 中的"等待输入指令..."占位
- **交付标准**：用户可在侧边栏与 DeepSeek 实时对话，消息流式渲染
- **完成时间**：2026-05-11

### ~~任务 3.3：笔记上下文注入~~ ✅ 已完成

- **目标文件**：`src/app/api/chat/route.ts`、`ChatPanel.tsx`、`src/components/editor/BlockRenderer.tsx`、`src/store/index.ts`
- **内容**：
  - Zustand store 新增 `noteContext` 状态，`BlockRenderer` 通过 `useEffect` 将区块内容实时序列化至 store
  - `ChatPanel` 在 `sendMessage` 时通过 `body: { noteContext }` 动态注入，避免 stale body 问题
  - API Route 从请求体读取 `noteContext`，在 system prompt 中注入笔记上下文
  - 不做 RAG，纯 prompt 注入（demo 阶段够用，面试时可讲后续向量化方案）
- **交付标准**：AI 能回答关于当前笔记内容的问题，如"帮我总结这篇笔记"
- **完成时间**：2026-05-11

## P1：AI 内容插入编辑器（高价值功能）

### 任务 3.4：AI → 编辑器插入链路

- **目标文件**：`src/components/ai/ChatPanel.tsx`、`src/components/editor/BlockRenderer.tsx`、`src/app/app/layout.tsx`
- **内容**：
  - AI 回复中识别可插入内容（文本段落、代码块等）
  - ChatPanel 提供"插入到笔记"按钮，点击后调用 BlockRenderer 的 `insertBlock`
  - 需要 layout 层打通 ChatPanel 与 BlockRenderer 的通信（通过 Zustand store 或 context + callback）
  - 支持插入 paragraph、heading、code 三种基础区块类型
- **交付标准**：用户对 AI 说"帮我写一个总结"，AI 生成内容后，用户点击插入按钮，内容出现在编辑器中

### 任务 3.5：Generative UI 联动（可选进阶）

- **目标文件**：`ChatPanel.tsx`、`BlockRenderer.tsx`
- **内容**：
  - AI 可以返回结构化 JSON，触发在编辑器中插入 `generative_ui` 区块
  - 比如用户说"帮我列一个待办清单"，AI 返回 `{ componentId: 'TaskBoard', props: { tasks: [...] } }`
  - 复用现有的 GenerativeUIBlock 渲染链路
- **交付标准**：AI 生成的结构化内容能在编辑器中以交互组件形式渲染

## P2：体验打磨与部署

### 任务 3.6：UI 打磨（部分完成）

- ChatPanel 空态引导（提示用户可以问什么）— ✅ 已完成（"有什么我可以帮你的？"）
- AI 回复的 Markdown 渲染（代码块、列表、加粗等）— ✅ 已完成（`react-markdown` + `remark-gfm` + `@tailwindcss/typography`）
- 加载状态与错误处理（网络断开、API Key 无效等）— ✅ 加载动画已完成（三点弹跳 + "正在阅读笔记内容..."），错误处理待补充
- AI 面板拖拽调整宽度 — ✅ 已完成（280px-800px，拖拽手柄）

### 任务 3.7：部署到 Vercel

- 配置 Vercel 环境变量
- 确保 streaming 在 Vercel Edge/Node Runtime 下正常工作
- 产出 live demo 链接

## 依赖关系

```
✅ 3.1 (API Route) ──→ ✅ 3.2 (Chat UI) ──→ ✅ 3.3 (上下文注入)
                                            ──→ 3.4 (插入编辑器)
                                                 ──→ 3.5 (Generative UI 联动)
✅ 3.2 ──→ 3.6 (UI 打磨) ──→ 3.7 (部署)
```

## 面试讲点预设

1. **"为什么选 DeepSeek？"** — OpenAI 兼容协议，成本低，国内稳定；架构上 provider 可替换，换 OpenAI/Claude 只改一行配置
2. **"AI 内容怎么插入编辑器的？"** — 复用现有的 `insertBlock` 乐观更新链路，AI 输出经过 sanitize 后走和用户手动插入相同的路径
3. **"Generative UI 怎么实现的？"** — 组件注册表 + 白名单 + 运行时 props 校验，未知组件降级渲染
4. **"为什么不用 RAG？"** — Demo 阶段 prompt 注入够用；架构上已预留 `SearchResultFragment` 接口，后续可接向量数据库
