// src/components/editor/RewriteToolbar.tsx
'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Wand2, Minimize2, Languages } from 'lucide-react';

interface RewriteToolbarProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onRewrite: (instruction: string) => void;
  onClose: () => void;
}

export function RewriteToolbar({
  isOpen,
  position,
  onRewrite,
}: RewriteToolbarProps) {
  const [customInput, setCustomInput] = useState('');

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

  return createPortal(
    <div
      className='fixed z-9999 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100 w-64'
      style={{
        // 定位在选区正上方，并向上偏移一点，居中对齐
        top: position.y - 10,
        left: position.x,
        transform: 'translate(-50%, -100%)',
      }}
      // 阻止鼠标事件冒泡，防止点击菜单时导致 Tiptap 失去焦点或选区消失
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className='p-1 flex flex-wrap gap-1 bg-zinc-50 border-b border-zinc-100'>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onRewrite(action.prompt)}
            className='flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors'
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={handleCustomSubmit}
        className='p-2 flex gap-2'
      >
        <input
          type='text'
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder='输入自定义改写指令...'
          className='flex-1 text-xs px-2 py-1.5 outline-none bg-zinc-100 rounded-md focus:ring-2 focus:ring-indigo-500/20 transition-all'
        />
      </form>
    </div>,
    document.body,
  );
}
