// src/app/app/layout.tsx
'use client';

import { useAppStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mockDocuments } from '@/mock/data';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { useEffect, useRef, useState } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, isAgentPanelOpen } = useAppStore();
  const pathname = usePathname();

  // ✨ 新增：用于管理 AI 面板的动态宽度
  const [agentPanelWidth, setAgentPanelWidth] = useState(320);
  const isDraggingRef = useRef(false);

  // ✨ 新增：全局拖拽事件监听
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      // 计算新宽度：屏幕总宽度 - 鼠标当前的 X 坐标
      const newWidth = document.body.clientWidth - e.clientX;
      // 限制最小 280px，最大 800px
      setAgentPanelWidth(Math.min(Math.max(newWidth, 280), 800));
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = ''; // 恢复鼠标样式
        document.body.style.userSelect = ''; // 恢复文本选择
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div className='flex h-screen w-full bg-background overflow-hidden'>
      {/* 1. 左侧栏 (Sidebar) 保持不变 */}
      {isSidebarOpen && (
        <aside className='w-65 h-full border-r bg-zinc-50/50 flex flex-col shrink-0'>
          <div className='p-4 font-bold text-zinc-900'>ai-note</div>
          <ScrollArea className='flex-1 px-3'>
            <div className='space-y-1'>
              <div className='text-xs font-medium text-zinc-500 py-2 px-2'>
                最近笔记
              </div>
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

      {/* 3. 右侧 AI 面板 - 支持动态拖拽 */}
      {isAgentPanelOpen && (
        <aside
          style={{ width: agentPanelWidth }} // ✨ 应用动态宽度
          className='h-full border-l bg-white flex flex-col shrink-0 shadow-sm relative'
        >
          {/* ✨ 拖拽手柄 */}
          <div
            onPointerDown={(e) => {
              isDraggingRef.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none'; // 防止拖拽时选中文字
            }}
            className='absolute left-0 top-0 bottom-0 w-1.5 -ml-0.75cursor-col-resize hover:bg-indigo-500/50 transition-colors z-50'
          />

          <div className='p-4 border-b flex items-center justify-between shrink-0'>
            <span className='font-semibold text-sm'>AI Copilot</span>
          </div>
          <div className='flex-1 overflow-hidden'>
            <ChatPanel />
          </div>
        </aside>
      )}
    </div>
  );
}
