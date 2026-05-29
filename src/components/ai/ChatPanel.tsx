// src/components/ai/ChatPanel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore, PendingInsert } from '@/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toast } from 'sonner';
import { CitationChip } from './CitationChip';
import { CitationSources } from './CitationSources';
import { InsertPreview } from './InsertPreview';
import { parseMarkdownToBlocks } from '@/lib/parse-markdown-to-blocks';
import { MessageSquarePlus, Trash2, ChevronDown, Pencil } from 'lucide-react';
import type { SearchResultFragment } from '@/types';

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** Replace [N] citation markers with inline <cite> HTML tags for ReactMarkdown */
function injectCiteTags(text: string): string {
  return text.replace(/\[(\d+)\]/g, '<cite data-index="$1">[$1]</cite>');
}

const markdownClasses = `markdown-content prose prose-sm prose-zinc w-full min-w-0 max-w-none wrap-break-word
  prose-headings:text-foreground prose-headings:font-bold prose-headings:my-2
  prose-p:my-1 prose-p:leading-relaxed
  prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:wrap-break-word
  prose-pre:bg-zinc-900 prose-pre:text-zinc-50 prose-pre:p-4 prose-pre:rounded-xl prose-pre:w-full prose-pre:max-w-full prose-pre:overflow-x-auto
  prose-li:my-0.5 prose-ul:my-2
  dark:prose-invert`;

export function ChatPanel() {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [previewBlocks, setPreviewBlocks] = useState<PendingInsert[] | null>(null);
  const { noteContext } = useAppStore();

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, [loadSessions]);

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [messages, status, error]);

  useEffect(() => {
    if (error) {
      toast.error('AI 响应失败', {
        description: error.message || '网络连接中断或 API 密钥无效，请重试。',
      });
    }
  }, [error]);

  // Persist messages when they change
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user' || (lastMessage.role === 'assistant' && status === 'ready')) {
      fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: lastMessage.role,
          content: lastMessage.parts,
        }),
      }).catch(console.error);
    }
  }, [messages, currentSessionId, status]);

  async function handleNewSession() {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新对话' }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentSessionId(data.id);
        setMessages([]);
        loadSessions();
        return data;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
    return null;
  }

  async function handleDeleteSession(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  async function handleSelectSession(sessionId: string) {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setCurrentSessionId(sessionId);
        setMessages(data.messages?.map((m: { role: string; content: string }) => ({
          id: Math.random().toString(),
          role: m.role as 'user' | 'assistant',
          parts: JSON.parse(m.content),
        })) || []);
        setShowSessions(false);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  async function handleRenameSession(sessionId: string) {
    const newTitle = editingTitle.trim();
    if (!newTitle) return;
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
      );
      setEditingSessionId(null);
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  }

  async function autoRenameSession(sessionId: string, firstMessage: string) {
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
      );
    } catch (error) {
      console.error('Failed to auto-rename session:', error);
    }
  }

  const onSubmit = (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();

    if (!currentSessionId) {
      handleNewSession().then((res) => {
        sendMessage(
          { text: userInput },
          { body: { noteContext } },
        );
        // Auto-rename with first message
        if (res?.id) {
          autoRenameSession(res.id, userInput);
        }
      });
    } else {
      sendMessage(
        { text: userInput },
        { body: { noteContext, sessionId: currentSessionId } },
      );
      // Auto-rename if this is the first message in session
      const session = sessions.find((s) => s.id === currentSessionId);
      if (session?.title === '新对话') {
        autoRenameSession(currentSessionId, userInput);
      }
    }

    setInput('');
  };

  return (
    <div className='flex flex-col h-full bg-background overflow-hidden'>
      {/* Session selector */}
      <div className='border-b px-3 py-2 shrink-0'>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            className='flex-1 justify-between h-8 text-xs'
            onClick={() => setShowSessions(!showSessions)}
          >
            <span className='truncate'>
              {currentSessionId
                ? sessions.find((s) => s.id === currentSessionId)?.title || '对话'
                : '选择或新建对话'}
            </span>
            <ChevronDown className='h-3 w-3 shrink-0' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={handleNewSession}
            title='新建对话'
          >
            <MessageSquarePlus className='h-4 w-4' />
          </Button>
        </div>

        {showSessions && (
          <div className='mt-2 max-h-48 overflow-y-auto space-y-1'>
            {sessions.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-2'>
                暂无对话历史
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-accent ${
                    currentSessionId === s.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    if (editingSessionId !== s.id) {
                      handleSelectSession(s.id);
                    }
                  }}
                >
                  {editingSessionId === s.id ? (
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSession(s.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      onBlur={() => handleRenameSession(s.id)}
                      className='flex-1 bg-background px-1 py-0.5 rounded text-xs outline-none ring-1 ring-ring'
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className='flex-1 truncate'>{s.title}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(s.id);
                      setEditingTitle(s.title);
                    }}
                    className='rounded p-0.5 hover:bg-accent-foreground/10'
                    title='重命名'
                  >
                    <Pencil className='h-3 w-3' />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className='rounded p-0.5 hover:bg-destructive/10 hover:text-destructive'
                  >
                    <Trash2 className='h-3 w-3' />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ScrollArea className='flex-1 min-h-0'>
        <div className='p-4'>
          {messages.length === 0 ? (
            <div className='text-sm text-muted-foreground italic text-center mt-10'>
              有什么我可以帮你的？例如：”帮我总结这篇笔记”
            </div>
          ) : (
            <div className='space-y-6 pb-4'>
              {messages.map((m) => {
                const hasText = m.parts?.some((p) => p.type === 'text' && 'text' in p && p.text);

                return (
                <div
                  key={m.id}
                  className={`group flex flex-col w-full min-w-0 ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className='text-xs font-semibold text-muted-foreground mb-1.5'>
                    {m.role === 'user' ? 'You' : '✨ AI Copilot'}
                  </div>
                  <div
                    className={`text-sm px-4 py-3 rounded-2xl max-w-[92%] min-w-0 grid leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm border border-border'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <div className='wrap-break-word'>
                        {m.parts?.map((part, index) => {
                          if (part.type === 'text')
                            return <span key={index}>{part.text}</span>;
                          return null;
                        })}
                      </div>
                    ) : !hasText ? (
                      <div className='flex items-center gap-2'>
                        <div className='flex gap-1'>
                          <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce' style={{ animationDelay: '0ms' }} />
                          <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce' style={{ animationDelay: '150ms' }} />
                          <span className='w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce' style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className='animate-pulse text-xs text-muted-foreground'>正在阅读笔记内容...</span>
                      </div>
                    ) : (() => {
                      // Extract citations from data parts
                      const citationsPart = m.parts?.find(
                        (p): p is { type: 'data-citations'; data: SearchResultFragment[] } =>
                          p.type === 'data-citations',
                      );
                      const sources: SearchResultFragment[] = citationsPart?.data ?? [];

                      const rawText = m.parts
                        .filter((part) => part.type === 'text')
                        .map((part) => ('text' in part ? part.text : ''))
                        .join('');

                      // Extract citation indices actually used in the text
                      const citedIndices = new Set(
                        [...rawText.matchAll(/\[(\d+)\]/g)].map((m) => parseInt(m[1], 10)),
                      );
                      const hasCitations = citedIndices.size > 0;
                      const citedSources = sources
                        .map((s, i) => ({ source: s, displayIndex: i + 1 }))
                        .filter((_, i) => citedIndices.has(i + 1));
                      const textWithCiteTags = injectCiteTags(rawText);

                      return (
                        <>
                          <div className={markdownClasses}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                cite: ({ node }) => {
                                  const index = Number(
                                    (node?.properties?.dataIndex as string) ?? 0,
                                  );
                                  const source = sources[index - 1];
                                  return (
                                    <CitationChip index={index} source={source} />
                                  );
                                },
                              }}
                            >
                              {textWithCiteTags}
                            </ReactMarkdown>
                          </div>
                          {hasCitations && citedSources.length > 0 && (
                            <CitationSources sources={citedSources} />
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* 插入到画布按钮 */}
                  {m.role !== 'user' && hasText && (
                    <div className='flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='ghost'
                        className='h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground bg-muted hover:bg-secondary'
                        onClick={() => {
                          const fullText = m.parts
                            .filter((p) => p.type === 'text')
                            .map((p) => ('text' in p ? p.text : ''))
                            .join('');

                          const blocks = parseMarkdownToBlocks(fullText);
                          if (blocks.length === 0) {
                            toast.info('没有可插入的内容');
                            return;
                          }
                          setPreviewBlocks(blocks);
                        }}
                      >
                        ＋ 插入到画布
                      </Button>
                    </div>
                  )}
                </div>
              )})}

              {/* ✨ 4. 渲染错误兜底 UI 与重试按钮 */}
              {error && (
                <div className='flex flex-col items-center justify-center p-4 mt-2 bg-red-50 border border-red-100 rounded-xl'>
                  <p className='text-xs text-red-600 mb-3 text-center'>
                    ⚠️ 请求失败：{error.message || '大模型服务暂时无响应'}
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => regenerate()}
                    className='h-7 text-xs text-red-600 border-red-200 hover:bg-red-100'
                  >
                    重新生成
                  </Button>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className='p-4 border-t border-border bg-background shrink-0'>
        <form
          onSubmit={onSubmit}
          className={`flex items-end gap-2 bg-muted border p-1.5 rounded-xl transition-all ${
            error
              ? 'border-red-300 focus-within:ring-red-900/20'
              : 'border-border focus-within:ring-2 focus-within:ring-ring/20'
          }`}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='输入指令...'
            className='flex-1 max-h-32 min-h-10 bg-transparent text-sm p-2 outline-none resize-none overflow-y-auto'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />
          <Button
            type='submit'
            size='icon'
            disabled={isLoading || !input.trim()}
            className='h-8 w-8 shrink-0 rounded-lg mb-0.5'
          >
            {isLoading ? '...' : '↑'}
          </Button>
        </form>
      </div>

      {/* 插入预览面板 */}
      {previewBlocks && (
        <InsertPreview
          blocks={previewBlocks}
          onConfirm={(selectedBlocks) => {
            useAppStore.getState().triggerInsert(selectedBlocks);
            setPreviewBlocks(null);
            toast.success(`已插入 ${selectedBlocks.length} 个区块`);
          }}
          onCancel={() => setPreviewBlocks(null)}
        />
      )}
    </div>
  );
}
