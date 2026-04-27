// src/mock/data.ts
import { Document } from '@/types';

export const mockDocuments: Document[] = [
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
          '在开发 AI-Native 画布时，最大的难点在于如何将大模型的流式文本转换为结构化的 React 组件。这需要极强的数据状态管理能力。',
      },
      {
        id: 'blk_3',
        type: 'code',
        content:
          'const [optimisticState, addOptimistic] = useOptimistic(state);',
        attributes: {
          language: 'typescript',
          isExecuting: false,
        },
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
              { id: 2, title: '编写 Mock Actions', status: 'todo' },
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
        attributes: { checked: false },
      },
    ],
  },
  {
    id: 'doc_002',
    title: 'React 19 状态模型速记',
    emoji: '⚛️',
    tags: ['react', 'state', 'frontend'],
    lastAccessedAt: Date.now() - 1000 * 60 * 30,
    backlinks: [
      {
        noteId: 'doc_001',
        noteTitle: 'AI Agent 前端架构思考',
        contextPreview: '提到 useOptimistic 在编辑器场景的边界。',
      },
    ],
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
          '离散原子操作（点赞、勾选、单次提交）优先 useOptimistic；连续编辑输入优先双缓冲状态。',
      },
      {
        id: 'blk_2_3',
        type: 'code',
        content:
          'const [optimisticTodos, addOptimisticTodo] = useOptimistic(todos, (state, next) => [...state, next]);',
        attributes: {
          language: 'typescript',
          isExecuting: false,
        },
      },
      {
        id: 'blk_2_4',
        type: 'todo',
        content: '给离散场景补 useOptimistic 示例',
        attributes: {
          checked: false,
        },
      },
    ],
  },
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
          '把 Client Hook 用在 Server Component 是高频错误，通常要通过边界拆分和 props 下传解决。',
      },
      {
        id: 'blk_3_3',
        type: 'code',
        content:
          "import { notFound } from 'next/navigation';\n\nif (!note) notFound();",
        attributes: {
          language: 'typescript',
          isExecuting: false,
        },
      },
    ],
  },
  {
    id: 'doc_004',
    title: '编辑器容灾演练记录',
    emoji: '🚨',
    tags: ['editor', 'resilience', 'testing'],
    lastAccessedAt: Date.now() - 1000 * 60 * 60 * 5,
    backlinks: [
      {
        noteId: 'doc_002',
        noteTitle: 'React 19 状态模型速记',
        contextPreview: '对比了双缓冲与 optimistic 方案的边界。',
      },
    ],
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
          '本地先更新 active state；请求失败后回滚到 safe snapshot，并触发 refresh 对齐服务端真值。',
      },
      {
        id: 'blk_4_3',
        type: 'todo',
        content: '补 IME 输入 + 回滚后的自动化测试',
        attributes: {
          checked: false,
        },
      },
      {
        id: 'blk_4_4',
        type: 'generative_ui',
        content: undefined,
        attributes: {
          componentId: 'AlertCard',
          status: 'streaming',
          props: {
            level: 'warning',
            title: '网络抖动模拟中',
          },
        },
      },
    ],
  },
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
        content: 'Q2 目标',
        attributes: { level: 2 },
      },
      {
        id: 'blk_5_2',
        type: 'todo',
        content: '侧栏改为动态笔记列表并支持高亮',
        attributes: {
          checked: false,
        },
      },
      {
        id: 'blk_5_3',
        type: 'todo',
        content: '补齐 loading / error / rollback 测试',
        attributes: {
          checked: false,
        },
      },
      {
        id: 'blk_5_4',
        type: 'paragraph',
        content:
          '后续接入 RAG 后，回答内容需要按 block 级别给 citation，支持点击定位到原文。',
      },
    ],
  },
];
