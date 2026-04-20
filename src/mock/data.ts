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
    ],
  },
];
