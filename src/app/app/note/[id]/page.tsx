// src/app/app/note/[id]/page.tsx
import { getNoteById } from '@/actions/note';
import { notFound } from 'next/navigation';
import { BlockRenderer } from '@/components/editor/BlockRenderer'; // <-- 引入刚写的组件

interface NotePageProps {
  params: Promise<{ id: string }>;
}

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;

  try {
    const note = await getNoteById(id);

    return (
      <article className='space-y-8 pb-32'>
        <header className='space-y-4'>
          <div className='text-5xl'>{note.emoji || '📝'}</div>
          <h1 className='text-4xl font-bold tracking-tight text-zinc-900'>
            {note.title}
          </h1>
        </header>

        {/* 核心改动：把原来的占位符替换为真实的 Block 渲染引擎 */}
        <section className='min-h-[500px] border-t pt-8'>
          <BlockRenderer blocks={note.blocks} />
        </section>
      </article>
    );
  } catch (error: unknown) {
    // 1. 默认捕获到的类型是未知的 unknown

    // 2. 运行时校验：它必须是一个标准的 Error 对象，我们才能安全地读取 .message
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        notFound();
      }
    }

    // 3. 如果不是 Error 实例（比如抛出了一个字符串），或者不是 404，就继续往上抛
    throw error;
  }
}
