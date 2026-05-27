// src/components/editor/SortableBlockItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { ReactNode, useCallback, useRef, useState } from 'react';

interface SortableBlockItemProps {
  id: string;
  children: ReactNode;
  onDelete: (id: string) => void;
  isOnlyBlock: boolean; // 如果是最后一个 Block，不允许删除
}

export function SortableBlockItem({
  id,
  children,
  onDelete,
  isOnlyBlock,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // 二次确认删除
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteClick = useCallback(() => {
    if (confirming) {
      // 二次点击，执行删除
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onDelete(id);
    } else {
      // 首次点击，进入确认态
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  }, [confirming, id, onDelete]);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    // 拖拽时提高层级并降低透明度
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='group relative flex items-start gap-2 py-1 outline-none'
    >
      {/* 左侧：拖拽手柄 (Hover 时显现) */}
      <button
        type='button'
        aria-label='拖拽排序'
        className='mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 outline-none'
        {...attributes}
        {...listeners}
      >
        <GripVertical className='h-4 w-4' />
      </button>

      {/* 中间：真实的 Block 内容 */}
      <div className='flex-1 min-w-0'>{children}</div>

      {/* 右侧：删除按钮 (Hover 时显现) */}
      {!isOnlyBlock && (
        <button
          type='button'
          onClick={handleDeleteClick}
          className={`mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity outline-none ${
            confirming ? 'text-red-500' : 'text-zinc-300 hover:text-red-500'
          }`}
          aria-label={confirming ? '确认删除' : '删除区块'}
          title={confirming ? '确认删除' : '删除区块'}
        >
          <Trash2 className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
