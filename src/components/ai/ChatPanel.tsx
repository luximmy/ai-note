// src/components/ai/ChatPanel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useAppStore, PendingInsert } from '@/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { toast } from 'sonner';
import { CitationChip } from './CitationChip';
import { CitationSources } from './CitationSources';
import type { SearchResultFragment } from '@/types';

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
  const { noteContext } = useAppStore();

  // ✨ 2. 解构 error 和 reload
  const { messages, sendMessage, status, error, regenerate } = useChat({
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

  // ✨ 3. 监听 error 状态，触发全局 Toast
  useEffect(() => {
    if (error) {
      toast.error('AI 响应失败', {
        description: error.message || '网络连接中断或 API 密钥无效，请重试。',
      });
    }
  }, [error]);

  const onSubmit = (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage(
      { text: input },
      {
        body: { noteContext },
      },
    );

    setInput('');
  };

  return (
    <div className='flex flex-col h-full bg-background overflow-hidden'>
      <ScrollArea className='flex-1 min-h-0'>
        <div className='p-4'>
          {messages.length === 0 ? (
            <div className='text-sm text-muted-foreground italic text-center mt-10'>
              有什么我可以帮你的？例如：“帮我总结这篇笔记”
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

                  {/* ...保留原有的插入到画布的按钮逻辑... */}
                  {m.role !== 'user' && (
                    <div className='flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='ghost'
                        className='h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground bg-muted hover:bg-secondary'
                        onClick={() => {
                          const fullText = m.parts
                            .filter((p) => p.type === 'text')
                            .map((p) => ('text' in p ? p.text : ''))
                            .join('');

                          const rawChunks = fullText.split(/\n\n+/);
                          const blocksToInsert: PendingInsert[] = [];

                          rawChunks.forEach((chunk) => {
                            const text = chunk.trim();
                            if (!text) return;

                            const jsonMatch = text.match(
                              /^```json\n([\s\S]*?)```$/,
                            );
                            if (jsonMatch) {
                              try {
                                const data = JSON.parse(jsonMatch[1]);
                                if (data.componentId) {
                                  blocksToInsert.push({
                                    type: 'generative_ui',
                                    content: '',
                                    attributes: {
                                      componentId: data.componentId,
                                      status: 'completed',
                                      props: data.props || {},
                                    },
                                  });
                                  return;
                                }
                              } catch (e) {
                                console.error('AI 返回的 JSON 格式异常:', e);
                              }
                            }

                            const codeMatch = text.match(
                              /^```(\w*)\n([\s\S]*?)```$/,
                            );
                            if (codeMatch) {
                              blocksToInsert.push({
                                type: 'code',
                                content: codeMatch[2].trim(),
                                attributes: {
                                  language: codeMatch[1] || 'plaintext',
                                },
                              });
                              return;
                            }

                            const headingMatch =
                              text.match(/^(#{1,3})\s+(.*)$/);
                            if (headingMatch) {
                              blocksToInsert.push({
                                type: 'heading',
                                content: headingMatch[2].trim(),
                                attributes: { level: headingMatch[1].length },
                              });
                              return;
                            }

                            if (text.match(/^- \[( |x|X)\]\s+/)) {
                              const lines = text.split('\n');
                              let pendingText = '';
                              const flushPending = () => {
                                if (pendingText.trim()) {
                                  blocksToInsert.push({
                                    type: 'paragraph',
                                    content: pendingText.trim(),
                                  });
                                  pendingText = '';
                                }
                              };
                              lines.forEach((line) => {
                                const todoMatch = line.match(
                                  /^- \[( |x|X)\]\s+(.*)$/,
                                );
                                if (todoMatch) {
                                  flushPending();
                                  blocksToInsert.push({
                                    type: 'todo',
                                    content: todoMatch[2].trim(),
                                    attributes: {
                                      checked:
                                        todoMatch[1].toLowerCase() === 'x',
                                    },
                                  });
                                } else {
                                  pendingText +=
                                    (pendingText ? '\n' : '') + line;
                                }
                              });
                              flushPending();
                              return;
                            }

                            blocksToInsert.push({
                              type: 'paragraph',
                              content: text,
                            });
                          });

                          useAppStore.getState().triggerInsert(blocksToInsert);
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
    </div>
  );
}
