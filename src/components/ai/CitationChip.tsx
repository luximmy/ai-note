// src/components/ai/CitationChip.tsx
'use client';

import { useState } from 'react';
import { SearchResultFragment } from '@/types';

interface CitationChipProps {
  index: number;
  source?: SearchResultFragment;
}

export function CitationChip({ index, source }: CitationChipProps) {
  const [showPopover, setShowPopover] = useState(false);

  return (
    <span className='relative inline-flex'>
      <button
        type='button'
        className='inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary/10 text-primary rounded-full hover:bg-primary/20 cursor-pointer align-super mx-0.5 transition-colors'
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      >
        {index}
      </button>
      {showPopover && source && (
        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg text-xs'>
          <div className='font-semibold text-foreground mb-1'>
            {source.noteTitle}
          </div>
          <div className='text-muted-foreground line-clamp-3'>
            {source.content}
          </div>
        </div>
      )}
    </span>
  );
}
