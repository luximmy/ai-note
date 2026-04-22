// src/components/editor/blocks/CodeBlock.tsx
import { CodeBlock as CodeBlockType } from '@/types'; // 别名防止与组件名冲突
import { memo } from 'react';

function CodeBlockComponent({ block }: { block: CodeBlockType }) {
  // 因为是从 types 引入的精准类型，这里直接拥有自动补全！
  const { isExecuting, language } = block.attributes;

  return (
    <div
      className={`relative bg-zinc-950 text-zinc-50 p-4 rounded-md font-mono text-sm overflow-x-auto my-4 transition-all ${isExecuting ? 'ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'shadow-sm'}`}
    >
      {isExecuting && (
        <div className='absolute top-3 right-3 flex items-center gap-2 text-xs text-emerald-400'>
          <span className='animate-pulse'>●</span> AI 正在执行...
        </div>
      )}
      {!isExecuting && (
        <div className='text-zinc-500 text-xs mb-2 absolute top-2 right-2 uppercase'>
          {language}
        </div>
      )}
      <pre>
        <code>{block.content}</code>
      </pre>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
