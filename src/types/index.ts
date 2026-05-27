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
