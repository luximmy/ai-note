// src/components/editor/blocks/ParagraphBlock.tsx
import { ParagraphBlock as ParagraphBlockType } from '@/types';
import { memo } from 'react';

function ParagraphBlockComponent({ block }: { block: ParagraphBlockType }) {
  return (
    <p className='text-zinc-800 leading-relaxed min-h-[1.5em] outline-none'>
      {block.content}
    </p>
  );
}

export const ParagraphBlock = memo(ParagraphBlockComponent);
