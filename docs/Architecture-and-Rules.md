# 02-Architecture-and-Rules.md

## 1. 技术栈规范 (Tech Stack Specifications)

- **核心框架**: Next.js 16 (App Router) + React 19
- **语言**: TypeScript (严格模式)
- **包管理器**: `pnpm` (统一使用 `pnpm install`, `pnpm dev`, `pnpm add`)
- **样式引擎**: Tailwind CSS + `shadcn/ui`
- **状态管理**: `zustand` (跨组件全局状态) + 场景化本地状态策略（`useOptimistic` / 双缓冲）
- **富文本/画布底层**: Tiptap (Headless 模式) — *规划中，尚未接入*
- **AI 交互引擎**: Vercel AI SDK (`ai` & `@ai-sdk/react`) — *规划中，尚未接入*

## 2. 工程目录架构 (Directory Structure)

项目遵循“职责分离、高内聚低耦合”的原则，所有代码必须存放于对应目录：

Plaintext

```
ai-note/
├── .cursor/                 # 存放模块化 AI 规则 (.mdc)
├── docs/                    # 项目业务文档与 Schema 契约 (供 AI 按需读取)
├── src/
│   ├── actions/             # Server Actions (数据请求与逻辑代理层)
│   ├── app/                 # 路由层 (仅包含页面骨架与 Layout)
│   ├── components/          # 视图层 (拆分为 ui, editor, ai, layout 四大子模块)
│   ├── hooks/               # 自定义 React Hooks（目录待建立）
│   ├── lib/                 # 纯函数与第三方库实例化 (如 utils.ts)
│   ├── mock/                # Mock 数据中心 (提供高保真 JSON 数据与模拟延迟)
│   ├── store/               # Zustand 全局状态定义
│   └── types/               # TypeScript 全局接口定义 (如 Block Schema)
├── tailwind.config.ts
└── pnpm-lock.yaml           # 锁定依赖版本
```

## 3. 核心架构模式 (Core Architecture Patterns)

### 3.1 渲染边界切分 (RSC vs Client)

- **默认服务端渲染 (RSC)**: 新建的 React 组件默认不加任何指令，在服务端执行，负责直接读取 `actions` 中的数据并传递给子组件。
- **按需客户端渲染 (Client)**: 只有当组件涉及到以下情况时，才在文件顶部添加 `"use client"`：
  1. 需要绑定 DOM 事件（如 `onClick`, `onKeyDown`）。
  2. 使用了 React Hooks（如 `useState`, `useEffect`, `useOptimistic`）。
  3. 使用了浏览器专属 API（如 `window`, `localStorage`）。

### 3.2 状态管理与乐观更新 (Optimistic UI)

- **全局状态**: 仅用于不常变动或需要跨越极大组件树的状态（如：侧边栏折叠状态、当前激活的笔记 ID）。统一放在 `src/store` 使用 Zustand 管理。
- **高频交互状态（场景化选型）**: 严禁将高频交互直接挂在全局状态上；按“离散事务”与“连续编辑”区分策略：
  1. **离散原子操作**（点赞、勾选、单次提交）：优先使用 `useTransition + useOptimistic`。
  2. **连续输入编辑**（富文本打字、IME 合成、防抖保存）：优先使用“双缓冲状态（active state + safe snapshot）+ 防抖提交 + 失败回滚”。
  3. 所有方案都必须具备失败提示、可恢复回滚，以及必要的服务端重新对齐机制（如 `router.refresh()`）。

### 3.3 数据代理与 Mock-First 机制

- **禁止直接请求**: 前端组件永远不直接调用 Fetch 或真实数据库，必须且只能调用 `src/actions/` 下的 Server Actions。
- **Mock 契约**: 当前开发阶段，Server Actions 必须显式模拟网络延迟和失败率。读接口默认约 800ms；写接口可按交互体验配置在 300-800ms 区间，并应保持可关闭或可配置，以便联调与验收。

## 4. AI 辅助开发代码规约 (Coding Conventions for AI)

（本节约束用于规范 Cursor / Agent 的代码生成风格）

1. **强类型约束**: 所有组件 Props、API 返回值必须有明确 TypeScript 接口，且优先复用 `src/types/index.ts` 中的 Block Schema。原则上禁止 `any`，仅允许在“动态注册表分发调用点”做局部、可审计的临时豁免。
2. **极简代码与提前返回**: 避免深度嵌套的 `if/else`，采用早期返回 (Early Return) 模式。
3. **避免过度抽象**: 在 Mock 跑通前，不要为了复用而过度封装组件。先保证数据流从 Mock -> Action -> UI 能顺畅单向跑通。
4. **日志排坑**: 调试 Client Component 时，认知到日志只会在浏览器控制台打印（严格模式下两次），不要因为终端无输出而误判代码未执行。
5. **并发一致性基线**: 涉及防抖保存与高频输入的链路，必须具备“请求序号/版本戳”乱序保护，确保旧响应不会覆盖新状态。
