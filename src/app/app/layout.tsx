// src/app/app/layout.tsx
'use client';

import { useAppStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mockDocuments } from '@/mock/data';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, isAgentPanelOpen } = useAppStore();
  const pathname = usePathname();

  return (
    <div className='flex h-screen w-full bg-background overflow-hidden'>
      {/* 1. 左侧栏 (Sidebar) */}
      {isSidebarOpen && (
        <aside className='w-[260px] h-full border-r bg-zinc-50/50 flex flex-col shrink-0'>
          <div className='p-4 font-bold text-zinc-900'>ai-note</div>
          <ScrollArea className='flex-1 px-3'>
            <div className='space-y-1'>
              <div className='text-xs font-medium text-zinc-500 py-2 px-2'>
                最近笔记
              </div>
              {/* 动态渲染 Mock 笔记列表 */}
              {mockDocuments.map((doc) => {
                const href = `/app/note/${doc.id}`;
                const isActive = pathname === href;

                return (
                  <Link
                    key={doc.id}
                    href={href}
                    className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-zinc-200/80 font-medium text-zinc-900'
                        : 'hover:bg-zinc-200/50 text-zinc-600'
                    }`}
                  >
                    <span className='mr-2'>{doc.emoji || '📄'}</span>
                    {doc.title}
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* 2. 中间主工作区 */}
      <main className='flex-1 h-full flex flex-col relative overflow-hidden bg-white'>
        <ScrollArea className='h-full'>
          <div className='max-w-3xl mx-auto py-12 px-8'>{children}</div>
        </ScrollArea>
      </main>

      {/* 3. 右侧 AI 面板 */}
      {isAgentPanelOpen && (
        <aside className='w-[320px] h-full border-l bg-white flex flex-col shrink-0 shadow-sm'>
          <div className='p-4 border-bottom flex items-center justify-between'>
            <span className='font-semibold text-sm'>AI Copilot</span>
          </div>
          <Separator />
          <div className='flex-1 p-4 text-sm text-zinc-500 italic'>
            等待输入指令...
          </div>
        </aside>
      )}
    </div>
  );
}
