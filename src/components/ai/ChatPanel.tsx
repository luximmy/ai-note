// src/components/ai/ChatPanel.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store'; // ✨ 引入 Zustand Store

export function ChatPanel() {
  const [input, setInput] = useState('');
  const { noteContext } = useAppStore(); // ✨ 获取当前笔记上下文
  const { messages, sendMessage, status, error } = useChat({
    // ✨ 4. 适配 5.0 架构，使用 transport 初始化基础端点
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
  }, [messages]);

  // 💡 修复 1：使用更安全的 SyntheticEvent，兼容表单提交和键盘回车
  const onSubmit = (e?: React.SyntheticEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // ✨ 5. 核心解法：将动态的上下文作为 requestOptions 传入 sendMessage
    // 这样每次发消息读取的绝对是 Zustand 中最新的 noteContext，完美避开 Stale Body 陷阱
    sendMessage(
      { text: input },
      {
        body: { noteContext }, // 这里的数据会被注入进后端的 req.json()
      },
    );
    setInput('');
  };

  return (
    <div className='flex flex-col h-full bg-white'>
      <ScrollArea className='flex-1 p-4'>
        {messages.length === 0 ? (
          <div className='text-sm text-zinc-400 italic text-center mt-10'>
            有什么我可以帮你的？例如：“帮我总结这篇笔记”
          </div>
        ) : (
          <div className='space-y-6 pb-4'>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className='text-xs font-semibold text-zinc-500 mb-1'>
                  {m.role === 'user' ? 'You' : '✨ AI Copilot'}
                </div>
                <div
                  className={`text-sm px-3 py-2 rounded-xl max-w-[90%] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-800'
                  }`}
                >
                  {m.parts?.map((part, index) => {
                    if (part.type === 'text') {
                      return <span key={index}>{part.text}</span>;
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      <div className='p-4 border-t border-zinc-100 bg-white'>
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
                onSubmit(e); // 去掉了脏脏的 (e as any)
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
