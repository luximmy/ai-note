'use client';

import { useAppStore } from '@/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ChatPanel } from '@/components/ai/ChatPanel';
import { FilePlus, LogOut, Network, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { createNote, deleteNote } from '@/actions/note';

interface DocumentMeta {
  id: string;
  title: string;
  emoji?: string;
}

interface AppShellProps {
  documents: DocumentMeta[];
  user: { name: string; email: string };
  children: React.ReactNode;
}

export function AppShell({ documents: initialDocuments, user, children }: AppShellProps) {
  const { isSidebarOpen, isAgentPanelOpen } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const isGraphPage = pathname === '/app/graph';

  const [documents, setDocuments] = useState(initialDocuments);
  const [agentPanelWidth, setAgentPanelWidth] = useState(320);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isDraggingRef = useRef(false);

  // Sync with server state when initialDocuments changes
  useEffect(() => {
    setDocuments(initialDocuments);
  }, [initialDocuments]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  async function handleCreateNote() {
    if (creating) return;
    setCreating(true);
    try {
      const { id } = await createNote('无标题笔记', '📝');
      const newDoc: DocumentMeta = { id, title: '无标题笔记', emoji: '📝' };
      setDocuments((prev) => [...prev, newDoc]);
      router.push(`/app/note/${id}`);
    } catch (error) {
      console.error('Create note failed:', error);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNote(deleteTarget.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (pathname === `/app/note/${deleteTarget.id}`) {
        router.push('/app');
      }
    } catch (error) {
      console.error('Delete note failed:', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

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

              <div className='flex items-center justify-between py-2 px-2 pt-4'>
                <span className='text-xs font-medium text-muted-foreground'>
                  最近笔记
                </span>
                <button
                  onClick={handleCreateNote}
                  disabled={creating}
                  className='rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  title='新建笔记'
                >
                  <FilePlus className='h-4 w-4' />
                </button>
              </div>
              {documents.map((doc) => {
                const href = `/app/note/${doc.id}`;
                const isActive = pathname === href;
                return (
                  <div
                    key={doc.id}
                    className={`group flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent text-sidebar-foreground/70'
                    }`}
                  >
                    <Link href={href} className='flex-1 min-w-0 truncate'>
                      <span className='mr-2'>{doc.emoji || '📄'}</span>
                      {doc.title}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDeleteTarget({ id: doc.id, title: doc.title });
                      }}
                      className='rounded p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                      title='删除笔记'
                    >
                      <Trash2 className='h-3 w-3' />
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className='border-t p-3'>
            <div className='flex items-center gap-3'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary'>
                <User className='h-4 w-4' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium truncate'>{user.name}</p>
                <p className='text-xs text-muted-foreground truncate'>
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className='rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                title='登出'
              >
                <LogOut className='h-4 w-4' />
              </button>
            </div>
          </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除笔记"
        description={`确定要删除「${deleteTarget?.title}」吗？此操作不可撤销。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
