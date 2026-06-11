# 03-Data-Schema

> 状态同步说明（2026-05-29）：当前类型定义以 `src/types/index.ts` 为唯一真源，本文件用于文档化展示。数据库 schema 定义在 `src/db/schema.ts`，认证相关类型定义在 `src/lib/auth.ts`。

TypeScript

```ts
/**
 * ai-note - 核心数据模型契约 (Schema)
 * 作用：定义文档、区块、以及 AI 生成内容的强类型接口
 */

// 1. 定义支持的区块类型
export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'todo'
  | 'generative_ui'; // 核心：AI 动态组件区块

// 2. 基础区块接口 (所有区块共用的底层骨架)
export interface BaseBlock {
  id: string; // 唯一标识符 (推荐使用 nanoid)
  type: BlockType; // 区块类型，用于区分渲染组件
  parentId?: string; // 父级区块 ID (用于实现嵌套，例如列表中的嵌套项，扁平化存储时必需)
  content?: string; // 文本内容 (对于非文本的区块，此字段可为空或 undefined)
  metadata?: {
    createdAt: number;
    updatedAt: number;
    authorId?: string;
  };
}

// 3. 各个具体区块的详细定义 (使用辨析联合类型)

// 文本与标题区块
// 1. 拆出纯粹的段落类型
export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  attributes?: {
    textAlign?: 'left' | 'center' | 'right';
  };
}

// 2. 拆出纯粹的标题类型
export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  attributes: {
    // 注意：对于标题来说，attributes 通常应该被设计为必选，至少要包含 level
    level: 1 | 2 | 3;
    textAlign?: 'left' | 'center' | 'right';
  };
}

// 代码区块 (结合 Agent 自动执行的交互能力)
export interface CodeBlock extends BaseBlock {
  type: 'code';
  attributes: {
    language: string; // 编程语言标识
    theme?: string; // 代码高亮主题
    showLineNumbers?: boolean;
    isExecuting?: boolean; // 核心交互字段：标记当前代码是否正在被 AI 或沙盒执行，用于锁定 UI 状态
  };
}

// 待办事项区块
export interface TodoBlock extends BaseBlock {
  type: 'todo';
  attributes: {
    checked: boolean; // 完成状态
  };
}

// --- 核心亮点：生成式 UI 区块 (Generative UI) ---
export interface GenerativeUIBlock extends BaseBlock {
  type: 'generative_ui';
  attributes: {
    componentId: string; // 对应前端预设组件库中的 ID (如 'WeatherCard', 'TaskBoard')
    status: 'streaming' | 'completed' | 'error'; // 流式生成过程中的状态流转
    props: Record<string, unknown>; // AI 为该组件生成的结构化配置参数，渲染前需做运行时校验或降级处理
    rawResponse?: string; // AI 的原始输出，备份用于 RAG 溯源与容错
  };
}

// 4. 统一的 Block 类型别名 (在组件渲染时基于 type 字段做类型收窄)
export type Block =
  | ParagraphBlock
  | HeadingBlock
  | CodeBlock
  | TodoBlock
  | GenerativeUIBlock;

// 5. 文档 (Document) 结构定义 (画布的顶级容器)
export interface Document {
  id: string;
  title: string;
  emoji?: string; // 文档的图标
  coverImage?: string; // 文档顶部封面
  blocks: Block[]; // 采用扁平化的区块数组存储，依赖 parentId 在内存中构建渲染树，提升查询和拖拽性能

  // 知识图谱相关 (MOC)
  backlinks: {
    // 反向链接统计，用于构建双链图谱
    noteId: string;
    noteTitle: string;
    contextPreview: string; // 引用处的上下文预览，悬浮提示时使用
  }[];

  tags: string[];
  lastAccessedAt: number;
}

// 6. 用于 RAG 的上下文片段接口 (用于和向量数据库通信)
export interface SearchResultFragment {
  blockId: string; // 精确到 Block 级别的召回
  noteId: string; // 所属文档 ID，用于跳转
  score: number; // 向量搜索相似度分值
  content: string; // Block 的文本内容
  noteTitle: string; // 所属文档标题
}

// 7. 知识网络相关接口
export interface Wikilink {
  sourceId: string;
  targetId: string; // 空字符串 = 幽灵链接（目标不存在）
  targetTitle: string;
  sourceTitle: string;
  sourceEmoji?: string;
  contextPreview: string;
}

export interface GraphNode {
  id: string;
  title: string;
  emoji: string;
  backlinkCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

## Store 相关类型（定义在 `src/store/index.ts`）

以下接口不属于核心数据 Schema，而是状态管理层的事件载荷类型：

```ts
// AI → 编辑器插入指令接口 (Zustand 事件总线载荷)
export interface PendingInsert {
  type: BlockType;
  content: string;
  attributes?: Record<string, unknown>;
}

// AI 局部重写目标接口
export interface RewriteTarget {
  blockId: string;
  text: string;
  from: number; // 选区开始位置
  to: number; // 选区结束位置
}
```

## 认证相关类型（定义在 `src/lib/auth.ts`）

```ts
// JWT Session 载荷
export interface SessionPayload {
  userId: string;
  email: string;
}
```

认证采用 JWT（jose 库，HS256 算法），token 有效期 7 天，通过 httpOnly cookie（`auth_token`）传递。密码使用 bcryptjs（salt rounds = 10）哈希存储。

## 数据库 Schema 类型（定义在 `src/db/schema.ts`）

以下为 Drizzle ORM 表定义对应的运行时类型（6 张表）：

```ts
// users 表
interface User {
  id: string;
  email: string;         // UNIQUE
  passwordHash: string;  // bcryptjs 哈希
  name: string;
  createdAt: number;     // Unix 时间戳 (ms)
  updatedAt: number;
}

// documents 表（外键：user_id → users.id）
interface DocumentRow {
  id: string;
  userId: string;        // 关联 users 表
  title: string;
  emoji: string | null;
  coverImage: string | null;
  tags: string | null;   // JSON string[]
  lastAccessedAt: number;
}

// blocks 表（外键：document_id → documents.id）
interface BlockRow {
  id: string;
  documentId: string;
  type: string;          // BlockType
  position: number;      // 0-based 排序
  parentId: string | null;
  content: string | null; // HTML 格式
  attributes: string | null; // JSON
  createdAt: number;
  updatedAt: number;
  authorId: string | null;
}

// block_embeddings 表（外键：block_id → blocks.id, CASCADE）
interface BlockEmbeddingRow {
  blockId: string;       // PK + FK
  embedding: Buffer;     // Float32Array (1024 维)
  updatedAt: number;
}

// chat_sessions 表（外键：user_id → users.id, CASCADE）
interface ChatSessionRow {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// chat_messages 表（外键：session_id → chat_sessions.id, CASCADE）
interface ChatMessageRow {
  id: string;
  sessionId: string;
  role: string;          // 'user' | 'assistant'
  content: string;       // JSON 序列化的消息 parts
  createdAt: number;
}
```

## 落地状态核对

- `BlockType` 已包含当前运行时支持的 `paragraph`、`heading`、`code`、`todo`、`generative_ui`，并在渲染层完成注册与展示。
- `image`、`callout` 暂属于规划区块类型，尚未进入当前运行时 Schema；新增时需同步补齐类型、渲染组件和测试。
- `Block` 联合类型已纳入 `GenerativeUIBlock`，与编辑器运行时数据一致。
- 动态注册表分发处仍保留局部、可审计的类型豁免；AI 组件 props 使用 `unknown` 边界，渲染前需通过白名单、normalize 或降级 UI 兜底。
- 种子数据中 `doc_004` 使用了 `componentId: 'AlertCard'`，该组件未注册在 `AIComponentRegistry` 中，会触发未知组件降级 UI（amber 色块）。此为刻意行为，用于验证降级策略。
- `PendingInsert` 和 `RewriteTarget` 接口定义在 `src/store/index.ts`（非 `types/index.ts`），分别是 Zustand 事件总线（`pendingInsertBlocks`）的载荷类型和 AI 局部重写的目标状态。详见上方「Store 相关类型」章节。
- 数据库共 6 张表（users, documents, blocks, block_embeddings, chat_sessions, chat_messages），通过外键和 CASCADE 实现级联删除。
- 认证系统基于 JWT + bcryptjs，SessionPayload 定义在 `src/lib/auth.ts`，不在 `types/index.ts` 中。
