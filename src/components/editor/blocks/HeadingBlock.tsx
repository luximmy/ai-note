// src/components/editor/blocks/HeadingBlock.tsx
import { HeadingBlock as HeadingBlockType } from '@/types';
import { memo, useCallback } from 'react';
import { RichTextEditor } from '../RichTextEditor';
import { SlashMenuItem } from '../SlashMenu';

function HeadingBlockComponent({
  block,
  onUpdate,
  onInsert,
  forceSyncToken,
  autoFocus,
  documents,
}: {
  block: HeadingBlockType;
  onUpdate?: (id: string, updates: Partial<HeadingBlockType>) => void;
  onInsert?: (afterBlockId: string, item: SlashMenuItem) => void;
  forceSyncToken?: number;
  autoFocus?: boolean;
  documents?: { id: string; title: string }[];
}) {
  const level = block.attributes?.level || 1;

  // 1. 接入防抖保存的回调
  const handleUpdate = useCallback(
    (content: string) => {
      onUpdate?.(block.id, { content });
    },
    [block.id, onUpdate],
  );

  // 2. 样式映射保持不变
  const sizeClasses = {
    1: 'text-3xl mt-8 mb-4 first:mt-0',
    2: 'text-2xl mt-6 mb-3 first:mt-0',
    3: 'text-xl mt-4 mb-2 first:mt-0',
  }[level as 1 | 2 | 3];

  return (
    <div className={`font-bold text-foreground outline-none ${sizeClasses}`}>
      {/* 3. 替换为动态的富文本编辑器，并接通 onInsert */}
      <RichTextEditor
        initialContent={block.content || ''}
        onUpdate={handleUpdate}
        onSlashCommand={(item) => onInsert?.(block.id, item)}
        forceSyncToken={forceSyncToken}
        autoFocus={autoFocus}
        documents={documents}
      />
    </div>
  );
}

export const HeadingBlock = memo(HeadingBlockComponent);
