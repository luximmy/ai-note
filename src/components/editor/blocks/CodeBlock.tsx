// src/components/editor/blocks/CodeBlock.tsx
import { CodeBlock as CodeBlockType } from '@/types';
import { memo, useCallback, useRef, useEffect } from 'react';

function CodeBlockComponent({
  block,
  onUpdate,
  autoFocus,
}: {
  block: CodeBlockType;
  onUpdate?: (id: string, updates: Partial<CodeBlockType>) => void;
  autoFocus?: boolean;
}) {
  const { isExecuting, language } = block.attributes;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. 文本变更自动保存
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate?.(block.id, { content: e.target.value });
    },
    [block.id, onUpdate],
  );

  // 2. 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // 3. 自动调整 textarea 的高度以适应代码行数
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [block.content]);

  return (
    <div
      className={`relative bg-zinc-950 text-zinc-50 p-4 rounded-md font-mono text-sm overflow-hidden my-4 transition-all ${
        isExecuting
          ? 'ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
          : 'shadow-sm'
      }`}
    >
      {isExecuting && (
        <div className='absolute top-3 right-3 flex items-center gap-2 text-xs text-emerald-400'>
          <span className='animate-pulse'>●</span> AI 正在执行...
        </div>
      )}
      {!isExecuting && (
        <div className='text-zinc-500 text-xs mb-2 absolute top-2 right-2 uppercase'>
          {language || 'plaintext'}
        </div>
      )}

      {/* 3. 替换只读的 <code> 为可编辑的 textarea */}
      <textarea
        ref={textareaRef}
        value={block.content || ''}
        onChange={handleChange}
        disabled={isExecuting}
        spellCheck={false}
        placeholder='在此输入代码...'
        className='w-full bg-transparent text-zinc-50 outline-none resize-none min-h-15'
        style={{ fontFamily: 'inherit' }}
      />
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);
