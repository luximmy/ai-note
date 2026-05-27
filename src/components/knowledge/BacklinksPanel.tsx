'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wikilink } from '@/types';
import { getBacklinksForNote } from '@/actions/note';
import { ArrowLeftRight } from 'lucide-react';

interface BacklinksPanelProps {
  noteId: string;
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Wikilink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getBacklinksForNote(noteId)
      .then((links) => {
        if (!cancelled) {
          setBacklinks(links);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('加载反向链接失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [noteId, retryCount]);

  if (loading) {
    return (
      <div className='border-t border-border pt-6 mt-8'>
        <div className='flex items-center gap-2 mb-4'>
          <ArrowLeftRight className='w-4 h-4 text-muted-foreground' />
          <span className='text-sm font-semibold text-muted-foreground'>被引用</span>
        </div>
        <div className='space-y-3'>
          {[1, 2].map((i) => (
            <div
              key={i}
              className='relative pl-4 py-3 pr-3 rounded-lg bg-muted animate-pulse'
            >
              <div className='absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-muted-foreground/20' />
              <div className='h-4 w-32 bg-muted-foreground/20 rounded mb-2' />
              <div className='h-3 w-56 bg-muted-foreground/10 rounded' />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='border-t border-border pt-6 mt-8'>
        <div className='flex items-center gap-2 mb-4'>
          <ArrowLeftRight className='w-4 h-4 text-muted-foreground' />
          <span className='text-sm font-semibold text-muted-foreground'>被引用</span>
        </div>
        <div className='text-center py-4'>
          <p className='text-xs text-red-400 mb-2'>{error}</p>
          <button
            type='button'
            onClick={() => {
              setLoading(true);
              setError(null);
              setRetryCount((c) => c + 1);
            }}
            className='text-xs text-primary hover:text-primary/80 underline'
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='border-t border-border pt-6 mt-8'>
      <div className='flex items-center gap-2 mb-4'>
        <ArrowLeftRight className='w-4 h-4 text-muted-foreground' />
        <h3 className='text-sm font-semibold text-foreground'>
          被引用 ({backlinks.length})
        </h3>
      </div>
      {backlinks.length === 0 ? (
        <p className='text-xs text-muted-foreground py-2'>暂无反向链接</p>
      ) : (
        <div className='space-y-3'>
          {backlinks.map((bl, i) => (
            <Link
              key={`${bl.sourceId}-${i}`}
              href={`/app/note/${bl.sourceId}`}
              className='group block relative pl-4 py-3 pr-3 rounded-lg bg-muted hover:bg-accent transition-colors duration-200'
            >
              <div className='absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors' />
              <div className='flex items-center gap-2 mb-1'>
                <span className='text-base leading-none'>
                  {bl.sourceEmoji ?? '📝'}
                </span>
                <span className='text-sm font-medium text-foreground group-hover:text-primary transition-colors'>
                  {bl.sourceTitle}
                </span>
              </div>
              <div className='text-xs text-muted-foreground line-clamp-2 italic pl-7'>
                &ldquo;{bl.contextPreview}&rdquo;
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
