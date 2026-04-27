// src/components/editor/blocks/ParagraphBlock.tsx
import { ParagraphBlock as ParagraphBlockType } from '@/types';
import { memo, useCallback } from 'react';
import { RichTextEditor } from '../RichTextEditor';

function ParagraphBlockComponent({
  block,
  onUpdate,
  forceSyncToken,
}: {
  block: ParagraphBlockType;
  // 更新类型契约
  onUpdate?: (id: string, updates: Partial<ParagraphBlockType>) => void;
  forceSyncToken?: number;
}) {
  const handleUpdate = useCallback(
    (newContent: string) => {
      if (onUpdate) {
        // 修改这里的调用方式，传入对象
        onUpdate(block.id, { content: newContent });
      }
    },
    [block.id, onUpdate],
  );

  return (
    <div className='text-zinc-800 leading-relaxed group relative'>
      <RichTextEditor
        initialContent={block.content || ''}
        onUpdate={handleUpdate}
        forceSyncToken={forceSyncToken}
      />
    </div>
  );
}

export const ParagraphBlock = memo(ParagraphBlockComponent);
