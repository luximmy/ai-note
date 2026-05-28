// src/db/seed-data.ts
import { Document } from '@/types';

export const mockDocuments: Document[] = [
  // ─────────────────────────────────────────────
  // 1. AI Agent 前端架构思考
  // ─────────────────────────────────────────────
  {
    id: 'doc_001',
    title: 'AI Agent 前端架构思考',
    emoji: '🧠',
    tags: ['architecture', 'ai', 'nextjs'],
    lastAccessedAt: Date.now(),
    backlinks: [],
    blocks: [
      {
        id: 'blk_1',
        type: 'heading',
        content: '核心挑战',
        attributes: { level: 2 },
      },
      {
        id: 'blk_2',
        type: 'paragraph',
        content:
          '在开发 AI-Native 画布时，最大的难点在于如何将大模型的流式文本转换为结构化的 React 组件。这与 [[React 19 状态模型速记]] 中的 useOptimistic 方案密切相关，也需要参考 [[Next.js App Router 排坑清单]] 的边界处理经验。',
      },
      {
        id: 'blk_3',
        type: 'code',
        content:
          'const [optimisticState, addOptimistic] = useOptimistic(state);',
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_4',
        type: 'generative_ui',
        content: undefined,
        attributes: {
          componentId: 'TaskBoard',
          status: 'completed',
          props: {
            tasks: [
              { id: 1, title: '设计 Block Schema', status: 'done' },
              { id: 2, title: '编写 Mock Actions', status: 'done' },
              { id: 3, title: '接入 SQLite 持久化', status: 'done' },
              { id: 4, title: '实现语义向量检索', status: 'done' },
            ],
          },
        },
      },
      {
        id: 'blk_5',
        type: 'todo',
        content: '完成 Todo 待办区块的开发与组件接入',
        attributes: { checked: true },
      },
      {
        id: 'blk_6',
        type: 'todo',
        content: '攻克 Generative UI 的数据流向与沙盒渲染',
        attributes: { checked: true },
      },
      {
        id: 'blk_7',
        type: 'heading',
        content: '流式文本 → 结构化组件的转换策略',
        attributes: { level: 2 },
      },
      {
        id: 'blk_8',
        type: 'paragraph',
        content:
          '大模型输出的文本是异步、逐步到达的，而非一次性完整交付。因此需要设计一套实时解析机制，能够边接收边处理，逐步构建出完整的组件树。该机制必须支持嵌套结构（如列表嵌套列表、表格内嵌富文本等），确保在流式传输过程中，每一层级的渲染都能保持结构完整与视觉一致性。',
      },
      {
        id: 'blk_9',
        type: 'paragraph',
        content:
          '可借助 React 的 useOptimistic 钩子实现乐观渲染策略。系统基于已解析的文本片段，立即生成临时占位组件，并随着新数据的到达逐步更新这些组件，形成"增量渲染"流水线。例如，当检测到列表开始标记时，立即渲染一个空的 <ul> 元素，随后逐项插入 <li> 内容。',
      },
      {
        id: 'blk_10',
        type: 'heading',
        content: 'Generative UI 的设计哲学',
        attributes: { level: 2 },
      },
      {
        id: 'blk_11',
        type: 'paragraph',
        content:
          '传统 AI 助手只能返回纯文本或 Markdown。但 AI-Native 编辑器的目标是让 AI 直接在画布中渲染可交互的 React 组件——任务看板、数据图表、代码沙盒等。这要求前端维护一个组件注册表（Component Registry），AI 通过结构化 JSON 声明组件 ID 和 props，前端根据注册表动态分发渲染。',
      },
      {
        id: 'blk_12',
        type: 'paragraph',
        content:
          '关键设计决策：组件注册表使用 TypeScript 映射类型（Mapped Types）确保类型安全，每个 componentId 对应精确的 props 类型。运行时通过 sanitizeProps 做防护，防止 AI 传入恶意或异常的 props 导致渲染崩溃。详见 [[TypeScript 高级类型体操]] 中的泛型约束技巧。',
      },
      {
        id: 'blk_13',
        type: 'heading',
        content: '知识网络与 RAG 的融合',
        attributes: { level: 2 },
      },
      {
        id: 'blk_14',
        type: 'paragraph',
        content:
          '笔记产品的核心价值不仅在于记录，更在于知识的连接与检索。通过 [[wikilink]] 双向链接语法，笔记之间形成拓扑网络；通过语义向量检索（Qwen3 Embedding），AI 能理解用户的自然语言提问，找到语义相关的内容片段（而非仅靠关键词匹配）。两者结合，构成了一个可计算的"第二大脑"。参考 [[语义向量检索原理与实践]] 了解 embedding 的技术细节。',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 2. React 19 状态模型速记
  // ─────────────────────────────────────────────
  {
    id: 'doc_002',
    title: 'React 19 状态模型速记',
    emoji: '⚛️',
    tags: ['react', 'state', 'frontend'],
    lastAccessedAt: Date.now() - 1000 * 60 * 30,
    backlinks: [],
    blocks: [
      {
        id: 'blk_2_1',
        type: 'heading',
        content: '什么时候用 useOptimistic',
        attributes: { level: 2 },
      },
      {
        id: 'blk_2_2',
        type: 'paragraph',
        content:
          '离散原子操作（点赞、勾选、单次提交）优先 useOptimistic；连续编辑输入优先双缓冲状态。更多容灾细节见 [[编辑器容灾演练记录]]。',
      },
      {
        id: 'blk_2_3',
        type: 'code',
        content:
          'const [optimisticTodos, addOptimisticTodo] = useOptimistic(\n  todos,\n  (state, next) => [...state, next]\n);',
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_2_4',
        type: 'todo',
        content: '给离散场景补 useOptimistic 示例',
        attributes: { checked: false },
      },
      {
        id: 'blk_2_5',
        type: 'heading',
        content: 'useActionState 与表单处理',
        attributes: { level: 2 },
      },
      {
        id: 'blk_2_6',
        type: 'paragraph',
        content:
          'React 19 引入了 useActionState 替代 useFormState，它与 Server Actions 深度集成。调用 action 后自动管理 pending 状态、返回值和错误，无需手动 try-catch。配合 useFormStatus 可以在子组件中感知表单提交状态。',
      },
      {
        id: 'blk_2_7',
        type: 'code',
        content:
          'const [state, formAction, isPending] = useActionState(\n  async (prev, formData) => {\n    const result = await serverAction(formData);\n    return result;\n  },\n  initialState\n);',
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_2_8',
        type: 'heading',
        content: 'use() — 打破 Hooks 规则的新 API',
        attributes: { level: 2 },
      },
      {
        id: 'blk_2_9',
        type: 'paragraph',
        content:
          'React 19 的 use() 可以在条件语句和循环中调用（传统 Hooks 不行）。它接受 Promise 或 Context 作为参数，在 Promise pending 时触发 Suspense fallback，resolve 后自动重渲染。这使得异步数据获取可以在组件树的任意位置进行，无需 useEffect + useState 的样板代码。参考 [[Next.js App Router 排坑清单]] 中关于 Server Component 与 Suspense 配合的注意事项。',
      },
      {
        id: 'blk_2_10',
        type: 'heading',
        content: 'ref 作为 prop 传递',
        attributes: { level: 2 },
      },
      {
        id: 'blk_2_11',
        type: 'paragraph',
        content:
          'React 19 终于允许 ref 作为普通 prop 传递给函数组件，不再需要 forwardRef 包装。这是社区期待已久的简化。函数组件直接在 props 中声明 ref 参数即可，React 会在组件卸载时自动清理 ref。',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 3. Next.js App Router 排坑清单
  // ─────────────────────────────────────────────
  {
    id: 'doc_003',
    title: 'Next.js App Router 排坑清单',
    emoji: '🧭',
    tags: ['nextjs', 'app-router', 'rsc'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 2,
    backlinks: [],
    blocks: [
      {
        id: 'blk_3_1',
        type: 'heading',
        content: '常见错误',
        attributes: { level: 2 },
      },
      {
        id: 'blk_3_2',
        type: 'paragraph',
        content:
          '把 Client Hook 用在 Server Component 是高频错误，通常要通过边界拆分和 props 下传解决。另一个常见问题是忘记 async/await——Server Component 可以是 async 函数，但 Client Component 不行。',
      },
      {
        id: 'blk_3_3',
        type: 'code',
        content:
          "// Server Component 可以直接 await\nexport default async function NotePage({ params }) {\n  const { id } = await params;\n  const note = await getNoteById(id);\n  if (!note) notFound();\n  return <BlockRenderer blocks={note.blocks} />;\n}",
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_3_4',
        type: 'heading',
        content: 'Server Action 的注意事项',
        attributes: { level: 2 },
      },
      {
        id: 'blk_3_5',
        type: 'paragraph',
        content:
          'Server Action 必须标记 "use server"，且只能是 async 函数。返回值必须可序列化（不能传函数、Symbol 等）。在 Client Component 中调用 Server Action 时，参数也需要可序列化——这意味着不能直接传 DOM 元素或事件对象。',
      },
      {
        id: 'blk_3_6',
        type: 'heading',
        content: 'Edge Runtime vs Node.js Runtime',
        attributes: { level: 2 },
      },
      {
        id: 'blk_3_7',
        type: 'paragraph',
        content:
          'Edge Runtime 启动快、延迟低，但不支持原生 Node.js 模块（如 better-sqlite3、fs、crypto）。如果 API Route 需要访问数据库或使用原生模块，必须切换到 Node.js Runtime（删除 export const runtime = "edge"）。本项目的 /api/chat 就因此从 Edge 切换到了 Node.js。详见 [[SQLite 数据库架构]]。',
      },
      {
        id: 'blk_3_8',
        type: 'heading',
        content: '缓存策略陷阱',
        attributes: { level: 2 },
      },
      {
        id: 'blk_3_9',
        type: 'paragraph',
        content:
          'Next.js 16 默认缓存 GET 请求（fetch 和 Route Handler）。如果数据频繁变化，需要使用 dynamic = "force-dynamic" 或在 fetch 中设置 cache: "no-store"。Server Action 的 POST 请求默认不缓存。注意 router.refresh() 会触发 Server Component 重新渲染，但不会重新执行 Server Action。',
      },
      {
        id: 'blk_3_10',
        type: 'todo',
        content: '补充 middleware 鉴权的实践案例',
        attributes: { checked: false },
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 4. 编辑器容灾演练记录
  // ─────────────────────────────────────────────
  {
    id: 'doc_004',
    title: '编辑器容灾演练记录',
    emoji: '🚨',
    tags: ['editor', 'resilience', 'testing'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 5,
    backlinks: [],
    blocks: [
      {
        id: 'blk_4_1',
        type: 'heading',
        content: '失败回滚链路',
        attributes: { level: 2 },
      },
      {
        id: 'blk_4_2',
        type: 'paragraph',
          content:
          '本地先更新 active state；请求失败后回滚到 safe snapshot，并触发 refresh 对齐服务端真值。也需要参考 [[AI Agent 前端架构思考]] 中的乐观更新策略。整个回滚链路是：乐观更新 → 防抖提交 → 服务端响应 → 成功推进快照 / 失败回滚 + toast 提示。',
      },
      {
        id: 'blk_4_3',
        type: 'todo',
        content: '补 IME 输入 + 回滚后的自动化测试',
        attributes: { checked: false },
      },
      {
        id: 'blk_4_4',
        type: 'generative_ui',
        content: undefined,
        attributes: {
          componentId: 'AlertCard',
          status: 'completed',
          props: { level: 'success', title: '容灾测试全部通过' },
        },
      },
      {
        id: 'blk_4_5',
        type: 'heading',
        content: '并发提交乱序防护',
        attributes: { level: 2 },
      },
      {
        id: 'blk_4_6',
        type: 'paragraph',
        content:
          '高频输入时，多个保存请求可能并发。如果旧请求的响应晚于新请求到达，会用旧数据覆盖新状态。解决方案是引入请求序号（requestSeqRef + lastResolvedVersionRef），每次发请求时递增序号，响应到达时检查是否是最新的——旧响应直接丢弃。',
      },
      {
        id: 'blk_4_7',
        type: 'code',
        content:
          '// 核心防线：请求序号\nrequestSeqRef.current += 1;\nconst currentSeq = requestSeqRef.current;\n\n// 响应到达时检查\nconst lastResolved = lastResolvedVersionRef.current[blockId] || 0;\nif (currentSeq < lastResolved) {\n  return; // 旧响应，丢弃\n}',
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_4_8',
        type: 'heading',
        content: '防抖窗口内的状态合并',
        attributes: { level: 2 },
      },
      {
        id: 'blk_4_9',
        type: 'paragraph',
        content:
          '800ms 防抖窗口内，用户可能连续输入多次。pendingUpdatesRef 作为合并缓冲区，将多次 content 更新合并为一次请求。发送时取合并后的最终值，避免中间状态丢失。这个设计与 [[React 19 状态模型速记]] 中的双缓冲策略一脉相承。',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 5. AI 笔记产品迭代待办
  // ─────────────────────────────────────────────
  {
    id: 'doc_005',
    title: 'AI 笔记产品迭代待办',
    emoji: '🗺️',
    tags: ['product', 'roadmap', 'ai-note'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 24,
    backlinks: [],
    blocks: [
      {
        id: 'blk_5_1',
        type: 'heading',
        content: '已完成',
        attributes: { level: 2 },
      },
      {
        id: 'blk_5_2',
        type: 'todo',
        content: '侧栏改为动态笔记列表并支持高亮',
        attributes: { checked: true },
      },
      {
        id: 'blk_5_3',
        type: 'todo',
        content: '补齐 loading / error / rollback 测试',
        attributes: { checked: true },
      },
      {
        id: 'blk_5_4',
        type: 'todo',
        content: '接入 SQLite 真实数据层',
        attributes: { checked: true },
      },
      {
        id: 'blk_5_5',
        type: 'todo',
        content: '实现 RAG 语义向量检索（Qwen3 Embedding）',
        attributes: { checked: true },
      },
      {
        id: 'blk_5_6',
        type: 'heading',
        content: '下一步规划',
        attributes: { level: 2 },
      },
      {
        id: 'blk_5_7',
        type: 'todo',
        content: '用户认证（NextAuth / Clerk）',
        attributes: { checked: false },
      },
      {
        id: 'blk_5_8',
        type: 'todo',
        content: '协作编辑（Yjs CRDT）',
        attributes: { checked: false },
      },
      {
        id: 'blk_5_9',
        type: 'todo',
        content: '多模态输入（图片上传、PDF 导入）',
        attributes: { checked: false },
      },
      {
        id: 'blk_5_10',
        type: 'paragraph',
        content:
          '后续接入 RAG 后，回答内容需要按 block 级别给 citation，支持点击定位到原文。需要参考 [[React 19 状态模型速记]] 的状态模型和 [[AI Agent 前端架构思考]] 的架构设计。',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 6. TypeScript 高级类型体操
  // ─────────────────────────────────────────────
  {
    id: 'doc_006',
    title: 'TypeScript 高级类型体操',
    emoji: '🎯',
    tags: ['typescript', 'types', 'advanced'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 3,
    backlinks: [],
    blocks: [
      {
        id: 'blk_6_1',
        type: 'heading',
        content: '条件类型与 infer',
        attributes: { level: 2 },
      },
      {
        id: 'blk_6_2',
        type: 'paragraph',
        content:
          '条件类型是 TypeScript 类型系统的"if-else"。语法：T extends U ? X : Y。配合 infer 关键字，可以从复杂类型中提取子类型。例如提取函数返回值类型：type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never。这是构建类型安全的组件注册表的基础技巧。',
      },
      {
        id: 'blk_6_3',
        type: 'code',
        content:
          "// 从联合类型中提取特定类型\ntype ExtractByType<T, U> = T extends { type: U } ? T : never;\n\n// 用法：从 Block 联合中提取 HeadingBlock\ntype Heading = ExtractByType<Block, 'heading'>;",
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_6_4',
        type: 'heading',
        content: '映射类型与模板字面量类型',
        attributes: { level: 2 },
      },
      {
        id: 'blk_6_5',
        type: 'paragraph',
        content:
          '映射类型（Mapped Types）可以遍历联合类型的每个成员，生成新的类型。配合模板字面量类型（Template Literal Types），可以实现字符串级别的类型操作。例如，将对象的所有 key 加上 "on" 前缀作为事件处理器名：type EventHandlers<T> = { [K in keyof T as `on${Capitalize<string & K>}`]: (value: T[K]) => void }。',
      },
      {
        id: 'blk_6_6',
        type: 'heading',
        content: '本项目中的类型技巧',
        attributes: { level: 2 },
      },
      {
        id: 'blk_6_7',
        type: 'paragraph',
        content:
          'BlockRenderer 使用映射类型构建类型安全的组件注册表：type RegistryType = { [K in Block["type"]]: FC<BlockComponentProps<Extract<Block, { type: K }>>> }。这确保了每个 block type 精确对应其 props 类型，彻底消除了 as any 断言。配合 KNOWN_COMPONENT_IDS 白名单和 sanitizeProps 运行时防护，实现了编译期 + 运行期的双重类型安全。详见 [[AI Agent 前端架构思考]] 中的 Generative UI 设计。',
      },
      {
        id: 'blk_6_8',
        type: 'code',
        content:
          "// 类型安全的组件注册表\nconst BlockRegistry: RegistryType = {\n  paragraph: ParagraphBlock,\n  heading: HeadingBlock,\n  code: CodeBlock,\n  todo: TodoBlock,\n  generative_ui: GenerativeUIBlock,\n};",
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_6_9',
        type: 'todo',
        content: '整理 satisfies 运算符的最佳实践',
        attributes: { checked: false },
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 7. 语义向量检索原理与实践
  // ─────────────────────────────────────────────
  {
    id: 'doc_007',
    title: '语义向量检索原理与实践',
    emoji: '🔍',
    tags: ['rag', 'embedding', 'search'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 1,
    backlinks: [],
    blocks: [
      {
        id: 'blk_7_1',
        type: 'heading',
        content: '从 TF-IDF 到 Embedding',
        attributes: { level: 2 },
      },
      {
        id: 'blk_7_2',
        type: 'paragraph',
        content:
          'TF-IDF 是最经典的关键词检索算法，通过词频和逆文档频率计算相关性。优点是简单高效、无需外部依赖；缺点是只能做字面匹配——"乐观更新"找不到"optimistic state"，"编辑器崩溃"找不到"容灾演练"。语义向量检索通过 Embedding 模型将文本映射为高维向量（如 1024 维），在向量空间中用余弦相似度衡量语义接近程度。',
      },
      {
        id: 'blk_7_3',
        type: 'heading',
        content: 'Embedding 模型选型',
        attributes: { level: 2 },
      },
      {
        id: 'blk_7_4',
        type: 'paragraph',
        content:
          '主流 Embedding 模型对比：OpenAI text-embedding-3-small（效果最好，需付费）、Jina AI（免费额度充足）、Cohere（多语言优秀）。本项目选择 Qwen3 text-embedding-v3（DashScope），原因是中文支持好、免费额度大、OpenAI 兼容 API 可复用现有 SDK。1024 维向量，每个 block 约 4KB 存储开销。',
      },
      {
        id: 'blk_7_5',
        type: 'heading',
        content: '向量存储方案',
        attributes: { level: 2 },
      },
      {
        id: 'blk_7_6',
        type: 'paragraph',
        content:
          '向量数据库选型：Pinecone（托管服务，开箱即用）、pgvector（PostgreSQL 扩展）、SQLite + BLOB（零外部依赖）。本项目选择 SQLite BLOB 存储 Float32Array，JS 计算余弦相似度。500 blocks × 1024 维的全量比对 < 5ms，完全满足 demo 规模。生产环境可考虑 pgvector 或专用向量数据库。',
      },
      {
        id: 'blk_7_7',
        type: 'code',
        content:
          '// 余弦相似度计算\nfunction cosine(a: Float32Array, b: Float32Array): number {\n  let dot = 0, normA = 0, normB = 0;\n  for (let i = 0; i < a.length; i++) {\n    dot += a[i] * b[i];\n    normA += a[i] * a[i];\n    normB += b[i] * b[i];\n  }\n  return dot / (Math.sqrt(normA) * Math.sqrt(normB));\n}',
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_7_8',
        type: 'heading',
        content: '增量更新策略',
        attributes: { level: 2 },
      },
      {
        id: 'blk_7_9',
        type: 'paragraph',
        content:
          'Embedding 计算需要调用外部 API（200-500ms/次），不能阻塞用户保存操作。采用 fire-and-forget 模式：区块保存时异步触发 embedding，失败不阻塞主流程，下次启动时 backfill 重试。启动时幂等检查哪些 block 缺少 embedding，批量补齐。详见 [[AI Agent 前端架构思考]] 中的知识网络融合部分。',
      },
      {
        id: 'blk_7_10',
        type: 'todo',
        content: '评估 chunk 策略对长文档检索质量的影响',
        attributes: { checked: false },
      },
      {
        id: 'blk_7_11',
        type: 'todo',
        content: '测试不同 embedding 模型的中文语义匹配效果',
        attributes: { checked: false },
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 8. SQLite 数据库架构
  // ─────────────────────────────────────────────
  {
    id: 'doc_008',
    title: 'SQLite 数据库架构',
    emoji: '💾',
    tags: ['database', 'sqlite', 'drizzle'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 4,
    backlinks: [],
    blocks: [
      {
        id: 'blk_8_1',
        type: 'heading',
        content: '为什么选 SQLite + Drizzle ORM',
        attributes: { level: 2 },
      },
      {
        id: 'blk_8_2',
        type: 'paragraph',
        content:
          '对于单用户 demo 项目，SQLite 是最务实的选择：零基础设施依赖、文件级部署、性能优异。Drizzle ORM 提供类型安全的查询构建器，schema-first 设计让 TypeScript 类型自动推导。相比 Prisma 更轻量，相比 raw SQL 更安全。better-sqlite3 作为驱动，同步 API 性能最优。',
      },
      {
        id: 'blk_8_3',
        type: 'heading',
        content: '表结构设计',
        attributes: { level: 2 },
      },
      {
        id: 'blk_8_4',
        type: 'paragraph',
        content:
          '三张表：documents（笔记元数据）、blocks（区块内容，通过 document_id 外键关联，position 字段保证排序）、block_embeddings（向量存储，CASCADE 跟随 block 删除）。Block 的多态属性（不同 type 有不同的 attributes）通过 JSON 文本列存储，查询层做序列化/反序列化。',
      },
      {
        id: 'blk_8_5',
        type: 'heading',
        content: 'globalThis 单例模式',
        attributes: { level: 2 },
      },
      {
        id: 'blk_8_6',
        type: 'paragraph',
        content:
          'Next.js build 时使用 10 个 worker 并发，每个 worker 独立导入模块。如果不共享数据库连接，多个 worker 同时打开同一个 SQLite 文件会导致 SQLITE_BUSY 错误。解决方案是用 globalThis 单例——同一进程中只有一个数据库连接实例，所有 worker 共享。配合 WAL 模式和 busy_timeout 10s，确保并发安全。',
      },
      {
        id: 'blk_8_7',
        type: 'code',
        content:
          "const globalForDb = globalThis as unknown as {\n  __aiNoteDb: ReturnType<typeof drizzle>;\n  __aiNoteSqlite: Database.Database;\n};\n\nfunction getDb() {\n  if (!globalForDb.__aiNoteDb) {\n    const sqlite = new Database('./data/ai-note.db');\n    sqlite.pragma('journal_mode = WAL');\n    sqlite.pragma('foreign_keys = ON');\n    globalForDb.__aiNoteSqlite = sqlite;\n    globalForDb.__aiNoteDb = drizzle(sqlite, { schema });\n  }\n  return globalForDb.__aiNoteDb;\n}",
        attributes: { language: 'typescript', isExecuting: false },
      },
      {
        id: 'blk_8_8',
        type: 'heading',
        content: '从 Mock 到真实数据层的迁移',
        attributes: { level: 2 },
      },
      {
        id: 'blk_8_9',
        type: 'paragraph',
        content:
          '迁移过程：1) 定义 Drizzle schema → 2) 创建数据访问层（queries.ts）→ 3) 改写 Server Actions 调用 DB → 4) 拆分 layout 为 Server/Client 组件 → 5) 修复 BlockRenderer 数据流。关键决策：删除 simulateNetwork 假延迟（真实 DB 已有自然延迟）；layout 从 Client 改为 Server Component 以直接查询 DB；移除 Edge Runtime 以支持 better-sqlite3。参考 [[Next.js App Router 排坑清单]] 中的 Runtime 选择。',
      },
      {
        id: 'blk_8_10',
        type: 'todo',
        content: '评估迁移到 Turso/libsql 以支持 Vercel 部署',
        attributes: { checked: false },
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 9. 暗色模式实现笔记
  // ─────────────────────────────────────────────
  {
    id: 'doc_009',
    title: '暗色模式实现笔记',
    emoji: '🌙',
    tags: ['ui', 'dark-mode', 'tailwind'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 8,
    backlinks: [],
    blocks: [
      {
        id: 'blk_9_1',
        type: 'heading',
        content: '技术方案',
        attributes: { level: 2 },
      },
      {
        id: 'blk_9_2',
        type: 'paragraph',
        content:
          '使用 next-themes 实现暗色模式。ThemeProvider 放在根 layout，配置 attribute="class"（通过 class 切换而非 data 属性）和 defaultTheme="system"（跟随系统偏好）。ThemeToggle 组件提供三级切换：亮色 → 暗色 → 跟随系统。',
      },
      {
        id: 'blk_9_3',
        type: 'heading',
        content: '颜色迁移策略',
        attributes: { level: 2 },
      },
      {
        id: 'blk_9_4',
        type: 'paragraph',
        content:
          '将 21 个文件中的 43 处硬编码颜色迁移为 shadcn 语义化 token：bg-background、text-foreground、bg-muted、text-muted-foreground、bg-primary、border-border 等。这些 token 在 globals.css 中通过 CSS 变量定义，亮色和暗色各一套值。CodeBlock 有意保留深色背景不变（代码块在暗色模式下仍用深色更易读）。',
      },
      {
        id: 'blk_9_5',
        type: 'heading',
        content: '踩坑记录',
        attributes: { level: 2 },
      },
      {
        id: 'blk_9_6',
        type: 'paragraph',
        content:
          '1) Canvas 元素（d3-force 图谱）不走 CSS 变量，需要在 JS 中动态读取 getComputedStyle 获取颜色值。2) Wikilink 高亮颜色需要同时适配亮色和暗色，使用 CSS 变量 + ProseMirror decoration。3) sonner toast 的颜色需要手动适配，不能依赖默认主题。',
      },
      {
        id: 'blk_9_7',
        type: 'todo',
        content: '添加主题切换动画过渡',
        attributes: { checked: false },
      },
    ],
  },
];
