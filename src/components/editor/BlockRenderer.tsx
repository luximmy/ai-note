// src/components/editor/BlockRenderer.tsx
'use client';

import {
  FC,
  useCallback,
  useState,
  useEffect,
  startTransition,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Block } from '@/types';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { TodoBlock } from './blocks/TodoBlock';
import { updateBlockAction } from '@/actions/note';

type RegistryType = {
  [K in Block['type']]?: FC<{
    block: Extract<Block, { type: K }>;
    onUpdate?: (id: string, updates: Partial<Block>) => void;
    forceSyncToken?: number;
  }>;
};

const BlockRegistry: RegistryType = {
  paragraph: ParagraphBlock as any,
  heading: HeadingBlock as any,
  code: CodeBlock as any,
  todo: TodoBlock as any,
};

export function BlockRenderer({
  blocks: initialBlocks,
  noteId = 'mock-note-id',
}: {
  blocks: Block[];
  noteId?: string;
}) {
  const router = useRouter();

  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [safeSnapshot, setSafeSnapshot] = useState<Block[]>(initialBlocks);
  const safeSnapshotRef = useRef<Block[]>(initialBlocks);
  const [forceSyncToken, setForceSyncToken] = useState(0);

  // 🚀 修复低危：使用 ReturnType<typeof setTimeout> 兼容浏览器环境
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // 🚀 修复高危：建立按 blockId 隔离的“挂起更新缓冲区”，用于合并 800ms 内的多频次、多字段变更
  const pendingUpdatesRef = useRef<Record<string, Partial<Block>>>({});

  // 🚀 修复中危：组件卸载时的内存与副作用清理
  useEffect(() => {
    return () => {
      // 遍历并清空所有未执行的定时器，防止卸载后依然触发网络请求和状态更新
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    safeSnapshotRef.current = safeSnapshot;
  }, [safeSnapshot]);

  useEffect(() => {
    setBlocks(initialBlocks);
    setSafeSnapshot(initialBlocks);
  }, [initialBlocks]);

  const commitBlockUpdate = useCallback(
    async (blockId: string, updates: Partial<Block>) => {
      try {
        const result = await updateBlockAction(noteId, blockId, updates);

        if (result.success) {
          setSafeSnapshot((prev) =>
            prev.map((b) => {
              if (b.id === blockId) {
                return {
                  ...b,
                  ...updates,
                  attributes: {
                    ...(b.attributes || {}),
                    ...(updates.attributes || {}),
                  },
                } as Block;
              }
              return b;
            }),
          );
          console.log(`[🟢 同步成功] 区块 ${blockId} 已落盘`, updates);
        }
      } catch (error) {
        toast.error('区块保存失败', {
          description: '网络抖动，已自动恢复该部分内容。',
          duration: 4000,
        });

        setBlocks((prevBlocks) => {
          const safeBlock = safeSnapshotRef.current.find(
            (b) => b.id === blockId,
          );
          if (!safeBlock) return prevBlocks;
          return prevBlocks.map((b) => (b.id === blockId ? safeBlock : b));
        });

        setForceSyncToken((prev) => prev + 1);

        startTransition(() => {
          router.refresh();
        });
      }
    },
    [noteId, router],
  );

  const updateBlockData = useCallback(
    (id: string, updates: Partial<Block>) => {
      // 1. 0 延迟乐观更新 (UI瞬间响应)
      setBlocks((prevBlocks) =>
        prevBlocks.map((block) => {
          if (block.id === id) {
            return {
              ...block,
              ...updates,
              attributes: {
                ...(block.attributes || {}),
                ...(updates.attributes || {}),
              },
            } as Block;
          }
          return block;
        }),
      );

      // 2. 🚀 修复高危：合并缓冲区更新。深度合并本次 updates 与之前的 pending updates
      const currentPending = pendingUpdatesRef.current[id] || {};
      const mergedAttributes = {
        ...(currentPending.attributes || {}),
        ...(updates.attributes || {}),
      };

      // 🚀 核心修复：在这里加上 as Partial<Block> 告诉 TS 我们确信合并后的结构是合法的
      pendingUpdatesRef.current[id] = {
        ...currentPending,
        ...updates,
        ...(Object.keys(mergedAttributes).length > 0
          ? { attributes: mergedAttributes }
          : {}),
      } as Partial<Block>;

      // 3. 按 Block ID 独立防抖调度
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
      }
      timersRef.current[id] = setTimeout(() => {
        // 从缓冲区中取出最终合并好的数据发往服务端
        const finalUpdates = pendingUpdatesRef.current[id];
        if (finalUpdates) {
          commitBlockUpdate(id, finalUpdates);
        }

        // 提交后清空该 block 的定时器和缓冲区
        delete timersRef.current[id];
        delete pendingUpdatesRef.current[id];
      }, 800);
    },
    [commitBlockUpdate],
  );

  if (!blocks || blocks.length === 0) {
    return <div className='text-zinc-400 italic p-4'>暂无内容</div>;
  }

  return (
    <div className='space-y-4 pb-32'>
      {blocks.map((block) => {
        const TargetComponent = BlockRegistry[block.type] as React.FC<any>;
        if (!TargetComponent) return null;
        return (
          <TargetComponent
            key={block.id}
            block={block}
            onUpdate={updateBlockData}
            forceSyncToken={forceSyncToken}
          />
        );
      })}
    </div>
  );
}
