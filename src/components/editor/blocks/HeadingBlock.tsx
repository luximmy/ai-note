// src/components/editor/blocks/HeadingBlock.tsx
import { HeadingBlock as HeadingBlockType } from '@/types';
import { ElementType, memo } from 'react';

function HeadingBlockComponent({ block }: { block: HeadingBlockType }) {
  // HeadingBlock 已经包含了 attributes?: { level?: 1 | 2 | 3 }
  const level = block.attributes?.level || 1;
  const Tag = `h${level}` as ElementType;

  const sizeClasses = {
    1: 'text-3xl mt-8 mb-4',
    2: 'text-2xl mt-6 mb-3',
    3: 'text-xl mt-4 mb-2',
  }[level];

  return (
    <Tag className={`font-bold text-zinc-900 outline-none ${sizeClasses}`}>
      {block.content}
    </Tag>
  );
}

export const HeadingBlock = memo(HeadingBlockComponent);
