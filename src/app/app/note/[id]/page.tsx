// src/app/app/note/[id]/page.tsx
import { getNoteById } from '@/actions/note';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/editor/BlockRenderer';
import { BacklinksPanel } from '@/components/knowledge/BacklinksPanel';
import { getAllDocumentsMeta } from '@/db/queries';
import { Document } from '@/types';

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;
  let note: Document;
  try {
    note = await getNoteById(id);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        notFound();
      }
    }
    throw error;
  }

  const documentsMeta = await getAllDocumentsMeta();

  return (
    <article className='space-y-8 pb-32'>
      <header className='space-y-4'>
        <div className='text-5xl'>{note.emoji || '📝'}</div>
        <h1 className='text-4xl font-bold tracking-tight text-foreground'>
          {note.title}
        </h1>
      </header>

      <section className='min-h-[500px] border-t pt-8'>
        <BlockRenderer
          key={note.id}
          blocks={note?.blocks || []}
          noteId={id}
          documents={documentsMeta}
        />
      </section>

      <BacklinksPanel noteId={id} />
    </article>
  );
}
