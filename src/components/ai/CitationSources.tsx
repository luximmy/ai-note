// src/components/ai/CitationSources.tsx
'use client';

import Link from 'next/link';
import { SearchResultFragment } from '@/types';

interface CitedSource {
  source: SearchResultFragment;
  displayIndex: number;
}

interface CitationSourcesProps {
  sources: CitedSource[];
}

export function CitationSources({ sources }: CitationSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div className='mt-3 border-t border-border/50 pt-3'>
      <div className='text-[11px] font-semibold text-muted-foreground mb-2'>
        参考来源 ({sources.length})
      </div>
      <div className='space-y-1.5'>
        {sources.map(({ source, displayIndex }) => (
          <Link
            key={source.blockId}
            href={`/app/note/${source.noteId}`}
            className='flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group text-xs'
          >
            <span className='shrink-0 w-5 h-5 flex items-center justify-center bg-primary/10 text-primary rounded-full text-[10px] font-bold mt-0.5'>
              {displayIndex}
            </span>
            <div className='min-w-0 flex-1'>
              <div className='font-medium text-foreground group-hover:text-primary transition-colors truncate'>
                {source.noteTitle}
              </div>
              <div className='text-muted-foreground line-clamp-1 mt-0.5'>
                {source.content}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
