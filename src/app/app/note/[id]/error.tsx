// src/app/app/note/[id]/error.tsx
'use client';

import { useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation'; // 1. 引入 useRouter

export default function NoteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter(); // 2. 初始化 router

  useEffect(() => {
    console.error('捕获到笔记页级异常:', error);
  }, [error]);

  return (
    <div className='flex flex-col items-center justify-center min-h-[400px] space-y-6 text-muted-foreground'>
      <div className='text-4xl'>📡</div>
      <div className='text-center space-y-2'>
        <h2 className='text-xl font-bold text-foreground'>数据加载失败</h2>
        <p className='text-sm'>
          {error.message || '网络请求超时或服务器无响应'}
        </p>
      </div>
      <button
        onClick={() => {
          // 3. 核心修复逻辑：强制刷新服务端路由，并重置客户端错误边界
          startTransition(() => {
            router.refresh();
            reset();
          });
        }}
        className='px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm'
      >
        尝试重新加载
      </button>
    </div>
  );
}
