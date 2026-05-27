// src/components/editor/blocks/TodoBlock.tsx
import { TodoBlock as TodoBlockType } from '@/types';
import { memo, useCallback } from 'react';
import { RichTextEditor } from '../RichTextEditor';
import { SlashMenuItem } from '../SlashMenu';

function TodoBlockComponent({
  block,
  onUpdate,
  onInsert,
  forceSyncToken,
  autoFocus,
}: {
  block: TodoBlockType;
  onUpdate?: (id: string, updates: Partial<TodoBlockType>) => void;
  onInsert?: (afterBlockId: string, item: SlashMenuItem) => void;
  forceSyncToken?: number;
  autoFocus?: boolean;
}) {
  const handleTextUpdate = useCallback(
    (newContent: string) => {
      if (onUpdate) {
        onUpdate(block.id, { content: newContent });
      }
    },
    [block.id, onUpdate],
  );

  const handleCheckToggle = useCallback(() => {
    if (onUpdate) {
      onUpdate(block.id, {
        attributes: {
          ...block.attributes,
          checked: !block.attributes?.checked,
        },
      });
    }
  }, [block, onUpdate]);

  return (
    <div className='flex items-start gap-3 group relative my-1.5'>
      {/* 1. 彻底重构的精美 Checkbox */}
      <button
        type='button'
        onClick={handleCheckToggle}
        role='checkbox' // 明确语义
        aria-checked={block.attributes?.checked || false} // 反映真实状态
        aria-label={block.attributes?.checked ? '取消完成' : '标记为完成'} // 读屏提示
        // mt-[5px] 是神来之笔：抵消 leading-relaxed 带来的行高落差，实现完美居中对齐
        className={`mt-1.25 flex h-4 w-4 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 ${
          block.attributes?.checked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-input bg-transparent hover:border-ring hover:bg-accent'
        }`}
      >
        {block.attributes?.checked && (
          <svg
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={3}
            stroke='currentColor'
            className='h-3 w-3'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M4.5 12.75l6 6 9-13.5'
            />
          </svg>
        )}
      </button>

      {/* 2. 文本区：调整划线颜色，去掉透明度带来的浑浊感 */}
      <div
        className={`flex-1 text-foreground leading-relaxed transition-all duration-200 ${
          block.attributes?.checked ? 'line-through text-muted-foreground' : ''
        }`}
      >
        <RichTextEditor
          initialContent={block.content || ''}
          onUpdate={handleTextUpdate}
          onSlashCommand={(item) => {
            if (onInsert) {
              onInsert(block.id, item);
            }
          }}
          forceSyncToken={forceSyncToken}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
}

export const TodoBlock = memo(TodoBlockComponent);
