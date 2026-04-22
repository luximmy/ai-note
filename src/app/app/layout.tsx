'use client';

import { useAppStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, isAgentPanelOpen } = useAppStore();

  return (
    <div className='flex h-screen w-full bg-background overflow-hidden'>
      {/* 1. 左侧栏 (Sidebar) - 宽度固定 260px */}
      {isSidebarOpen && (
        <aside className='w-[260px] h-full border-r bg-zinc-50/50 flex flex-col shrink-0'>
          <div className='p-4 font-bold text-zinc-900'>ai-note</div>
          <ScrollArea className='flex-1 px-3'>
            <div className='space-y-1'>
              <div className='text-xs font-medium text-zinc-500 py-2 px-2'>
                最近笔记
              </div>
              {/* 这里后续会循环渲染 mock 笔记列表 */}
              <div className='px-2 py-1.5 text-sm rounded-md hover:bg-zinc-200/50 cursor-pointer transition-colors'>
                项目架构思考
              </div>
            </div>
          </ScrollArea>
        </aside>
      )}

      {/* 2. 中间主工作区 (Main Editor Area) */}
      <main className='flex-1 h-full flex flex-col relative overflow-hidden bg-white'>
        <ScrollArea className='h-full'>
          <div className='max-w-3xl mx-auto py-12 px-8'>{children}</div>
        </ScrollArea>
      </main>

      {/* 3. 右侧 AI 面板 (Agent Panel) - 宽度固定 320px */}
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
