// src/components/ai/InsertPreview.tsx
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { PendingInsert } from '@/store';
import {
  CheckSquare,
  Square,
  FileText,
  Heading1,
  Code,
  CheckSquare2,
  Sparkles,
} from 'lucide-react';

interface InsertPreviewProps {
  blocks: PendingInsert[];
  onConfirm: (selectedBlocks: PendingInsert[]) => void;
  onCancel: () => void;
}

const BLOCK_TYPE_META: Record<
  PendingInsert['type'],
  { icon: React.ReactNode; label: string; color: string }
> = {
  paragraph: {
    icon: <FileText className='h-3.5 w-3.5' />,
    label: '段落',
    color: 'text-muted-foreground',
  },
  heading: {
    icon: <Heading1 className='h-3.5 w-3.5' />,
    label: '标题',
    color: 'text-blue-500',
  },
  code: {
    icon: <Code className='h-3.5 w-3.5' />,
    label: '代码',
    color: 'text-orange-500',
  },
  todo: {
    icon: <CheckSquare2 className='h-3.5 w-3.5' />,
    label: '待办',
    color: 'text-green-500',
  },
  generative_ui: {
    icon: <Sparkles className='h-3.5 w-3.5' />,
    label: 'AI 组件',
    color: 'text-purple-500',
  },
};

function BlockPreviewItem({
  block,
  isSelected,
  onToggle,
}: {
  block: PendingInsert;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const meta = BLOCK_TYPE_META[block.type];

  // 获取预览文本
  const previewText = useMemo(() => {
    if (block.type === 'generative_ui') {
      const componentId = block.attributes?.componentId || '未知组件';
      return `[${componentId}]`;
    }
    if (block.type === 'heading') {
      const level = block.attributes?.level || 1;
      return '#'.repeat(level as number) + ' ' + (block.content || '');
    }
    if (block.type === 'todo') {
      const checked = block.attributes?.checked ? '[x]' : '[ ]';
      return `- ${checked} ${block.content || ''}`;
    }
    if (block.type === 'code') {
      const lang = block.attributes?.language || '';
      return `\`\`\`${lang}\n${(block.content || '').slice(0, 100)}${(block.content || '').length > 100 ? '...' : ''}\n\`\`\``;
    }
    // paragraph
    const content = block.content || '';
    return content.length > 120 ? content.slice(0, 120) + '...' : content;
  }, [block]);

  return (
    <button
      type='button'
      onClick={onToggle}
      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
        isSelected
          ? 'bg-primary/5 border border-primary/20'
          : 'bg-background border border-border hover:border-primary/20'
      }`}
    >
      {/* Checkbox */}
      <div className='mt-0.5 shrink-0'>
        {isSelected ? (
          <CheckSquare className='h-4 w-4 text-primary' />
        ) : (
          <Square className='h-4 w-4 text-muted-foreground/50' />
        )}
      </div>

      {/* Type badge */}
      <div className={`shrink-0 flex items-center gap-1 ${meta.color}`}>
        {meta.icon}
        <span className='text-[10px] font-medium'>{meta.label}</span>
      </div>

      {/* Content preview */}
      <div className='flex-1 min-w-0 text-xs text-foreground/80 whitespace-pre-wrap break-words'>
        {previewText}
      </div>
    </button>
  );
}

export function InsertPreview({
  blocks,
  onConfirm,
  onCancel,
}: InsertPreviewProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(blocks.map((_, i) => i)),
  );

  const toggleIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIndices.size === blocks.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(blocks.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    const selected = blocks.filter((_, i) => selectedIndices.has(i));
    if (selected.length > 0) {
      onConfirm(selected);
    }
  };

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className='relative w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        {/* Header */}
        <div className='flex items-center justify-between px-5 py-3.5 border-b border-border'>
          <div>
            <h3 className='text-sm font-semibold text-foreground'>
              预览插入内容
            </h3>
            <p className='text-xs text-muted-foreground mt-0.5'>
              选择要插入到画布的区块
            </p>
          </div>
          <button
            type='button'
            onClick={toggleAll}
            className='text-xs text-primary hover:underline'
          >
            {selectedIndices.size === blocks.length ? '取消全选' : '全选'}
          </button>
        </div>

        {/* Block list */}
        <div className='max-h-80 overflow-y-auto p-3 space-y-1.5'>
          {blocks.map((block, index) => (
            <BlockPreviewItem
              key={index}
              block={block}
              isSelected={selectedIndices.has(index)}
              onToggle={() => toggleIndex(index)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30'>
          <span className='text-xs text-muted-foreground'>
            已选 {selectedIndices.size} / {blocks.length} 个区块
          </span>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onCancel}
              className='h-8 text-xs'
            >
              取消
            </Button>
            <Button
              size='sm'
              onClick={handleConfirm}
              disabled={selectedIndices.size === 0}
              className='h-8 text-xs'
            >
              插入 {selectedIndices.size} 个区块
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
