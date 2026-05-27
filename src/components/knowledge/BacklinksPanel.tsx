'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wikilink } from '@/types';
import { getBacklinksForNote } from '@/actions/note';
import { mockDocuments } from '@/mock/data';
import { ArrowLeftRight } from 'lucide-react';

interface BacklinksPanelProps {
  noteId: string;
}

function getDocEmoji(docId: string): string {
  return mockDocuments.find((d) => d.id === docId)?.emoji ?? '📝';
}

export function BacklinksPanel({ noteId }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Wikilink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBacklinksForNote(noteId)
      .then(setBacklinks)
      .catch(() => setBacklinks([]))
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) {
    return (
      <div className='border-t border-zinc-100 pt-6 mt-8'>
        <div className='flex items-center gap-2 mb-4'>
          <ArrowLeftRight className='w-4 h-4 text-zinc-400' />
          <span className='text-sm font-semibold text-zinc-400'>被引用</span>
        </div>
        <div className='space-y-3'>
          {[1, 2].map((i) => (
            <div
              key={i}
              className='relative pl-4 py-3 pr-3 rounded-lg bg-zinc-50 animate-pulse'
            >
              <div className='absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-zinc-200' />
              <div className='h-4 w-32 bg-zinc-200 rounded mb-2' />
              <div className='h-3 w-56 bg-zinc-100 rounded' />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (backlinks.length === 0) return null;

  return (
    <div className='border-t border-zinc-100 pt-6 mt-8'>
      <div className='flex items-center gap-2 mb-4'>
        <ArrowLeftRight className='w-4 h-4 text-zinc-500' />
        <h3 className='text-sm font-semibold text-zinc-700'>
          被引用 ({backlinks.length})
        </h3>
      </div>
      <div className='space-y-3'>
        {backlinks.map((bl, i) => (
          <Link
            key={`${bl.sourceId}-${i}`}
            href={`/app/note/${bl.sourceId}`}
            className='group block relative pl-4 py-3 pr-3 rounded-lg bg-zinc-50 hover:bg-indigo-50 transition-colors duration-200'
          >
            <div className='absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-indigo-300 group-hover:bg-indigo-500 transition-colors' />
            <div className='flex items-center gap-2 mb-1'>
              <span className='text-base leading-none'>
                {getDocEmoji(bl.sourceId)}
              </span>
              <span className='text-sm font-medium text-zinc-800 group-hover:text-indigo-700 transition-colors'>
                {bl.sourceTitle}
              </span>
            </div>
            <div className='text-xs text-zinc-500 line-clamp-2 italic pl-7'>
              &ldquo;{bl.contextPreview}&rdquo;
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
