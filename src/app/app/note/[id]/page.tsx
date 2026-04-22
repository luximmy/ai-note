import { getNoteById } from '@/actions/note';
import { notFound } from 'next/navigation';

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;

  try {
    // 调用带有 800ms 延迟的 Mock Action
    const note = await getNoteById(id);

    return (
      <article className='space-y-8'>
        <header className='space-y-4'>
          <div className='text-5xl'>{note.emoji || '📝'}</div>
          <h1 className='text-4xl font-bold tracking-tight text-zinc-900'>
            {note.title}
          </h1>
        </header>

        {/* 下一阶段：接入 BlockEditor 组件渲染 note.blocks */}
        <section className='min-h-[500px] border-t pt-8 text-zinc-400'>
          内容区块加载中...
        </section>
      </article>
    );
  } catch (error) {
    console.error(error);
    notFound();
  }
}
