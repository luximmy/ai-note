// src/components/editor/BlockRenderer.tsx
'use client';

import { FC, useCallback, useState, useEffect, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Block } from '@/types';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { updateBlockAction } from '@/actions/note';
import { useDebouncedCallback } from 'use-debounce';

const BlockRegistry: Record<
  string,
  FC<{ block: any; onUpdate?: (id: string, content: string) => void }>
> = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  code: CodeBlock,
};

export function BlockRenderer({
  blocks: initialBlocks,
  noteId = 'mock-note-id',
}: {
  blocks: Block[];
  noteId?: string;
}) {
  const router = useRouter();

  // 1. 当前 UI 正在渲染的活跃状态（用户打字时瞬间更新这个）
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  // 2. 建立一个“安全存档点”（用于保存失败时的回滚）
  const [safeSnapshot, setSafeSnapshot] = useState<Block[]>(initialBlocks);

  // 当服务端数据真的发生改变时（比如 router.refresh()），同步更新本地状态
  useEffect(() => {
    setBlocks(initialBlocks);
    setSafeSnapshot(initialBlocks);
  }, [initialBlocks]);

  // 3. 真实网络请求（携带回滚快照参数）
  const debouncedServerUpdate = useDebouncedCallback(
    async (blockId: string, newContent: string, fallbackBlocks: Block[]) => {
      try {
        const result = await updateBlockAction(noteId, blockId, {
          content: newContent,
        });

        if (result.success) {
          // 保存成功，更新安全存档点
          console.log(`[本地 🟢] 区块 ${blockId} 已稳妥同步至云端`);
          setSafeSnapshot(blocks);
        }
      } catch (error) {
        // 🚨 触发 15% 的异常分支
        toast.error('内容保存失败', {
          description: '网络抖动或服务器异常，已回滚到上次保存的状态。',
          duration: 4000,
        });

        // 瞬间将 UI 状态回退到上一个安全存档点
        setBlocks(fallbackBlocks);

        // 通知 Next.js 在后台悄悄重新拉取一次服务器的绝对真理数据，确保对齐
        startTransition(() => {
          router.refresh();
        });
      }
    },
    800,
  );

  const updateBlockContent = useCallback(
    (id: string, newContent: string) => {
      setBlocks((prevBlocks) => {
        // 动作 A：计算出最新的 UI 状态并立刻渲染（0延迟）
        const newBlocks = prevBlocks.map((block) =>
          block.id === id ? { ...block, content: newContent } : block,
        );

        // 动作 B：触发防抖上传，并把当前的 prevBlocks 作为“后悔药”传进去
        debouncedServerUpdate(id, newContent, prevBlocks);

        return newBlocks;
      });
    },
    [debouncedServerUpdate],
  );

  if (!blocks || blocks.length === 0) {
    return <div className='text-zinc-400 italic p-4'>暂无内容</div>;
  }

  return (
    <div className='space-y-4 px-8 py-4'>
      {blocks.map((block) => (
        <BlockNode
          key={block.id}
          block={block}
          onUpdate={updateBlockContent}
        />
      ))}
    </div>
  );
}

function BlockNode({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (id: string, content: string) => void;
}) {
  const TargetComponent = BlockRegistry[block.type];
  if (!TargetComponent) return null;
  return (
    <TargetComponent
      block={block}
      onUpdate={onUpdate}
    />
  );
}
