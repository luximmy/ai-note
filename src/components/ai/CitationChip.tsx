// src/components/ai/CitationChip.tsx
'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchResultFragment } from '@/types';

interface CitationChipProps {
  index: number;
  source?: SearchResultFragment;
}

export function CitationChip({ index, source }: CitationChipProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (showPopover && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.top - 8, // 8px gap above the button
        left: Math.min(rect.right, window.innerWidth - 272), // 272 = popover width (256) + padding
      });
    }
  }, [showPopover]);

  return (
    <>
      <button
        ref={btnRef}
        type='button'
        className='inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-primary/10 text-primary rounded-full hover:bg-primary/20 cursor-pointer align-super mx-0.5 transition-colors'
        onClick={() => setShowPopover(!showPopover)}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      >
        {index}
      </button>
      {showPopover &&
        source &&
        createPortal(
          <div
            className='fixed z-[9999] w-64 p-3 bg-popover border border-border rounded-lg shadow-lg text-xs'
            style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
          >
            <div className='font-semibold text-foreground mb-1'>
              {source.noteTitle}
            </div>
            <div className='text-muted-foreground line-clamp-3'>
              {source.content}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
