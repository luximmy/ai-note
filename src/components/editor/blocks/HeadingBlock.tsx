// src/components/editor/blocks/HeadingBlock.tsx
import { HeadingBlock as HeadingBlockType } from '@/types';
import { ElementType, memo } from 'react';

function HeadingBlockComponent({ block }: { block: HeadingBlockType }) {
  const level = block.attributes?.level || 1;
  const Tag = `h${level}` as ElementType;

  // 核心修复：添加 first:mt-0
  // 含义：如果这个标题是文档的第一个区块，强制清除它的顶部外边距，防止与外层 padding 叠加
  const sizeClasses = {
    1: 'text-3xl mt-8 mb-4 first:mt-0',
    2: 'text-2xl mt-6 mb-3 first:mt-0',
    3: 'text-xl mt-4 mb-2 first:mt-0',
  }[level];

  return (
    <Tag className={`font-bold text-zinc-900 outline-none ${sizeClasses}`}>
      {block.content}
    </Tag>
  );
}

export const HeadingBlock = memo(HeadingBlockComponent);
