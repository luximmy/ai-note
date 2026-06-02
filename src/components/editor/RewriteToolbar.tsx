// src/components/editor/RewriteToolbar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Wand2, Minimize2, Languages, ArrowRight } from 'lucide-react';

interface RewriteToolbarProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  selectedText: string;
  onRewrite: (instruction: string) => void;
  onClose: () => void;
}

export function RewriteToolbar({
  isOpen,
  position,
  selectedText,
  onRewrite,
  onClose,
}: RewriteToolbarProps) {
  const [customInput, setCustomInput] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭工具栏
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Escape 关闭工具栏
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // 如果没有挂载、没有打开或没有坐标，则不渲染
  if (!isOpen || !position || typeof document === 'undefined') return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onRewrite(customInput);
      setCustomInput('');
    }
  };

  const quickActions = [
    {
      label: '智能润色',
      icon: <Sparkles className='w-3.5 h-3.5' />,
      prompt: '帮我润色这段文字，使其更加专业、流畅。',
    },
    {
      label: '扩写段落',
      icon: <Wand2 className='w-3.5 h-3.5' />,
      prompt: '详细扩写这段文字，增加合理的细节和论述。',
    },
    {
      label: '精简提炼',
      icon: <Minimize2 className='w-3.5 h-3.5' />,
      prompt: '精简这段文字，保留核心观点，去除冗余词汇。',
    },
    {
      label: '翻译为英文',
      icon: <Languages className='w-3.5 h-3.5' />,
      prompt: '将这段文字翻译为地道、专业的英文。',
    },
  ];

  // 边界翻转：工具栏靠近顶部时向下弹出
  const TOOLBAR_HEIGHT = 150;
  const flipBelow = position.y - TOOLBAR_HEIGHT < 0;

  return createPortal(
    <div
      ref={toolbarRef}
      className='fixed z-9999 bg-popover border border-border rounded-xl shadow-xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 w-64'
      style={{
        top: flipBelow ? position.y + 10 : position.y - 10,
        left: position.x,
        transform: flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
    >
      <div className='p-1 flex flex-wrap gap-1 bg-muted border-b border-border'>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onRewrite(action.prompt)}
            className='flex items-center gap-1.5 px-2 py-1.5 text-xs text-foreground hover:text-primary hover:bg-accent rounded-md transition-colors'
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      {selectedText && (
        <div className='px-3 py-2 border-b border-border'>
          <p className='text-[11px] text-muted-foreground leading-relaxed line-clamp-2'>
            「{selectedText.length > 60 ? selectedText.slice(0, 60) + '…' : selectedText}」
          </p>
        </div>
      )}
      <form
        onSubmit={handleCustomSubmit}
        className='p-2 flex gap-2'
      >
        <input
          type='text'
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder='输入自定义改写指令...'
          className='flex-1 text-xs px-2 py-1.5 outline-none bg-muted rounded-md focus:ring-2 focus:ring-ring/20 transition-all'
        />
        <button
          type='submit'
          className='flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-primary hover:bg-accent rounded-md transition-colors'
          aria-label='提交改写指令'
        >
          <ArrowRight className='w-3.5 h-3.5' />
        </button>
      </form>
    </div>,
    document.body,
  );
}
