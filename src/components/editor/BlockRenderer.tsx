// src/components/editor/BlockRenderer.tsx
import { Block } from '@/types';
import { ElementType } from 'react';

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className='text-zinc-400 italic'>空空如也，敲击键盘开始记录...</div>
    );
  }

  return (
    <div className='space-y-4'>
      {blocks.map((block) => (
        <div
          key={block.id}
          className='group relative'
        >
          {/* 这里预留了给后续任务的“拖拽把手”和“区块悬浮菜单”的位置 */}
          <BlockNode block={block} />
        </div>
      ))}
    </div>
  );
}

// 1. 写一个类型守卫函数，在运行时真正检查数据
function isValidHeadingLevel(level: any): level is 1 | 2 | 3 {
  return [1, 2, 3].includes(level);
}

/**
 * 核心路由节点：根据 type 映射到具体的 React UI
 */
function BlockNode({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      // 2. 在渲染逻辑中使用
      const rawLevel = block.attributes?.level || 1;
      // 运行时校验：如果是合法的，TS 会自动推导出 level 必然是 1 | 2 | 3
      const level = isValidHeadingLevel(rawLevel) ? rawLevel : 1;
      // 使用 ElementType 告诉 TS：放心，这就是个合法的 React 标签
      const Tag = `h${level}` as ElementType;

      const sizeClasses = {
        1: 'text-3xl mt-8 mb-4',
        2: 'text-2xl mt-6 mb-3',
        3: 'text-xl mt-4 mb-2',
      }[level];

      return (
        <Tag className={`font-bold text-zinc-900 ${sizeClasses}`}>
          {block.content}
        </Tag>
      );

    case 'paragraph':
      return (
        <p className='text-zinc-800 leading-relaxed min-h-[1.5em]'>
          {block.content}
        </p>
      );

    case 'code':
      return (
        <div className='relative bg-zinc-950 text-zinc-50 p-4 rounded-md font-mono text-sm overflow-x-auto shadow-sm my-4'>
          {/* 极其重要的 Agent 执行状态绑定 */}
          {block.attributes.isExecuting && (
            <div className='absolute top-3 right-3 flex items-center gap-2 text-xs text-emerald-400'>
              <span className='animate-pulse'>●</span> AI 正在执行...
            </div>
          )}
          <div className='text-zinc-500 text-xs mb-2 absolute top-2 right-2 uppercase'>
            {!block.attributes.isExecuting && block.attributes.language}
          </div>
          <pre>
            <code>{block.content}</code>
          </pre>
        </div>
      );

    case 'todo':
      return (
        <div className='flex items-start gap-2 my-1'>
          <input
            type='checkbox'
            checked={block.attributes.checked}
            readOnly
            className='mt-1.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900'
          />
          <span
            className={
              block.attributes.checked
                ? 'line-through text-zinc-400'
                : 'text-zinc-800'
            }
          >
            {block.content}
          </span>
        </div>
      );

    case 'generative_ui':
      // Generative UI 的占位符！后续这里会直接挂载真实的独立 React 组件
      return (
        <div className='my-6 border border-dashed border-purple-300 bg-purple-50/40 p-6 rounded-xl flex flex-col items-center justify-center text-purple-600'>
          <div className='text-sm font-medium mb-2 flex items-center gap-2'>
            <span>✨</span>
            [生成式 UI 区块] 组件: {block.attributes.componentId}
          </div>
          <div className='text-xs text-purple-400'>
            状态: {block.attributes.status} | 传入参数:{' '}
            {JSON.stringify(block.attributes.props)}
          </div>
        </div>
      );

    default:
      return (
        <div className='text-red-500 border border-red-200 p-2 bg-red-50 rounded'>
          未知的区块类型
        </div>
      );
  }
}
