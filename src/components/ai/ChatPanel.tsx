// src/components/ai/ChatPanel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useAppStore, PendingInsert } from '@/store';
// ✨ 1. 引入 Markdown 相关组件
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const { noteContext } = useAppStore();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

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
    <div className='flex flex-col h-full bg-white overflow-hidden'>
      <ScrollArea className='flex-1 min-h-0'>
        <div className='p-4'>
          {messages.length === 0 ? (
            <div className='text-sm text-zinc-400 italic text-center mt-10'>
              有什么我可以帮你的？例如：“帮我总结这篇笔记”
            </div>
          ) : (
            <div className='space-y-6 pb-4'>
              {messages.map((m) => (
                <div
                  key={m.id}
                  // 💡 必须在这里加上 group，为了让鼠标悬浮时才显示插入按钮
                  className={`group flex flex-col w-full min-w-0 ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className='text-xs font-semibold text-zinc-500 mb-1.5'>
                    {m.role === 'user' ? 'You' : '✨ AI Copilot'}
                  </div>
                  <div
                    className={`text-sm px-4 py-3 rounded-2xl max-w-[92%] min-w-0 grid leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-zinc-900 text-zinc-50 rounded-tr-sm'
                        : 'bg-zinc-50 text-zinc-800 rounded-tl-sm border border-zinc-100'
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
                    ) : (
                      <div
                        className='markdown-content prose prose-sm prose-zinc w-full min-w-0 max-w-none wrap-break-word
                        prose-headings:text-zinc-900 prose-headings:font-bold prose-headings:my-2
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-code:bg-zinc-200/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-code:wrap-break-word
                        prose-pre:bg-zinc-900 prose-pre:text-zinc-50 prose-pre:p-4 prose-pre:rounded-xl prose-pre:w-full prose-pre:max-w-full prose-pre:overflow-x-auto
                        prose-li:my-0.5 prose-ul:my-2
                        dark:prose-invert'
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.parts
                            .filter((part) => part.type === 'text')
                            .map((part) => ('text' in part ? part.text : ''))
                            .join('')}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {m.role !== 'user' && (
                    <div className='flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='ghost'
                        className='h-6 px-2 text-[11px] text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200'
                        onClick={() => {
                          const fullText = m.parts
                            .filter((p) => p.type === 'text')
                            .map((p) => ('text' in p ? p.text : ''))
                            .join('');

                          // 💡 核心：轻量级 Markdown to Blocks 切片引擎
                          const rawChunks = fullText.split(/\n\n+/); // 按空行切分段落
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
                                    type: 'generative_ui', // 触发生成式 UI 区块
                                    content: '',
                                    attributes: {
                                      componentId: data.componentId,
                                      status: 'completed',
                                      props: data.props || {},
                                    },
                                  });
                                  return; // 拦截成功，直接跳过后续的普通解析
                                }
                              } catch (e) {
                                console.error('AI 返回的 JSON 格式异常:', e);
                                // 解析失败的话，会顺延到下面的代码块解析逻辑中兜底显示出来
                              }
                            }
                            // 1. 拦截代码块
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

                            // 2. 拦截标题
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

                            // 3. 拦截 Todo 列表 (逐行处理，支持混合内容)
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
                                  pendingText += (pendingText ? '\n' : '') + line;
                                }
                              });
                              flushPending();
                              return;
                            }

                            // 4. 兜底：作为普通段落
                            blocksToInsert.push({
                              type: 'paragraph',
                              content: text,
                            });
                          });

                          // 批量派发指令
                          useAppStore.getState().triggerInsert(blocksToInsert);
                        }}
                      >
                        ＋ 插入到画布
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {status === 'submitted' && (
                <div className='flex flex-col items-start'>
                  <div className='text-xs font-semibold text-zinc-500 mb-1'>
                    ✨ AI Copilot
                  </div>
                  <div className='text-sm px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-500 flex items-center gap-3'>
                    <div className='flex gap-1.5'>
                      <span
                        className='w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce'
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className='w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce'
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className='w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce'
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span className='animate-pulse text-xs'>
                      正在阅读笔记内容...
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className='p-4 border-t border-zinc-100 bg-white shrink-0'>
        <form
          onSubmit={onSubmit}
          className='flex items-end gap-2 bg-zinc-50 border border-zinc-200 p-1.5 rounded-xl focus-within:ring-2 focus-within:ring-zinc-900/20 transition-all'
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
