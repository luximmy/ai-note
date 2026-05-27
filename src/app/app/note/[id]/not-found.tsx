// src/app/app/note/[id]/not-found.tsx
import Link from 'next/link';

export default function NoteNotFound() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[400px] space-y-6 text-muted-foreground'>
      <div className='text-4xl'>🕳️</div>
      <div className='text-center space-y-2'>
        <h2 className='text-xl font-bold text-foreground'>404 - 笔记未找到</h2>
        <p className='text-sm'>这篇笔记可能已被删除，或者链接输入有误。</p>
      </div>
      <Link
        href='/app'
        className='px-4 py-2 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-secondary transition-colors'
      >
        返回仪表盘首页
      </Link>
    </div>
  );
}
