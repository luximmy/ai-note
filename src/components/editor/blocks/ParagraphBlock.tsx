// src/components/editor/blocks/ParagraphBlock.tsx
import { ParagraphBlock as ParagraphBlockType } from '@/types';
import { memo, useCallback } from 'react';
import { RichTextEditor } from '../RichTextEditor';

// 1. 声明接收外层传来的 onUpdate 管道
function ParagraphBlockComponent({
  block,
  onUpdate,
}: {
  block: ParagraphBlockType;
  onUpdate?: (id: string, content: string) => void;
}) {
  const handleUpdate = useCallback(
    (newContent: string) => {
      // 2. 当 Tiptap 捕获到打字时，通过管道把当前区块的 ID 和新内容轰给外层调度器
      if (onUpdate) {
        onUpdate(block.id, newContent);
      }
    },
    [block.id, onUpdate],
  );

  return (
    <div className='text-zinc-800 leading-relaxed group relative'>
      <RichTextEditor
        initialContent={block.content || ''}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

export const ParagraphBlock = memo(ParagraphBlockComponent);
