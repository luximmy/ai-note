'use client';

import { useAppStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { Network } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

interface AppShellProps {
  documents: { id: string; title: string; emoji?: string }[];
  children: React.ReactNode;
}

export function AppShell({ documents, children }: AppShellProps) {
  const { isSidebarOpen, isAgentPanelOpen } = useAppStore();
  const pathname = usePathname();
  const isGraphPage = pathname === '/app/graph';

  const [agentPanelWidth, setAgentPanelWidth] = useState(320);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      setAgentPanelWidth(Math.min(Math.max(newWidth, 280), 800));
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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
      {isSidebarOpen && (
        <aside className='w-65 h-full border-r bg-sidebar flex flex-col shrink-0'>
          <div className='p-4 flex items-center justify-between'>
            <span className='font-bold text-sidebar-foreground'>ai-note</span>
            <ThemeToggle />
          </div>
          <ScrollArea className='flex-1 px-3'>
            <div className='space-y-1'>
              <div className='text-xs font-medium text-muted-foreground py-2 px-2'>
                导航
              </div>
              <Link
                href='/app/graph'
                className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                  pathname === '/app/graph'
                    ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground/70'
                }`}
              >
                <Network className='h-4 w-4' />
                知识图谱
              </Link>

              <div className='text-xs font-medium text-muted-foreground py-2 px-2 pt-4'>
                最近笔记
              </div>
              {documents.map((doc) => {
                const href = `/app/note/${doc.id}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={doc.id}
                    href={href}
                    className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent text-sidebar-foreground/70'
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

      <main className='flex-1 h-full flex flex-col relative overflow-hidden bg-background'>
        <ScrollArea className='h-full'>
          <div
            className={
              isGraphPage
                ? 'h-full p-8'
                : 'max-w-3xl mx-auto py-12 px-8'
            }
          >
            {children}
          </div>
        </ScrollArea>
      </main>

      {isAgentPanelOpen && (
        <aside
          style={{ width: agentPanelWidth }}
          className='h-full border-l bg-background flex flex-col shrink-0 shadow-sm relative'
        >
          <div
            onPointerDown={() => {
              isDraggingRef.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            className='absolute left-0 top-0 bottom-0 w-1.5 -ml-0.75cursor-col-resize hover:bg-primary/50 transition-colors z-50'
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
