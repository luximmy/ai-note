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

import { GenerativeUIBlock } from './blocks/GenerativeUIBlock';

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
  generative_ui: GenerativeUIBlock as any, // 🚀 注册大魔王
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

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingUpdatesRef = useRef<Record<string, Partial<Block>>>({});

  // 🚀 核心防线 1：全局递增的请求序号生成器 (发号器)
  const requestSeqRef = useRef(0);
  // 🚀 核心防线 2：记录每个区块最后一次成功应用的请求序号 (记录本)
  const lastResolvedVersionRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
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

  // 注意：入参增加了 currentSeq
  const commitBlockUpdate = useCallback(
    async (blockId: string, updates: Partial<Block>, currentSeq: number) => {
      try {
        const result = await updateBlockAction(noteId, blockId, updates);

        if (result.success) {
          // 🚀 核心防线 3：在等待网络请求这段时间里，检查是否有更新的请求已经完成了？
          const lastResolved = lastResolvedVersionRef.current[blockId] || 0;

          if (currentSeq < lastResolved) {
            // 这是一条迟到的旧响应！如果应用它，会把用户刚输入的新内容覆盖掉。
            console.warn(
              `[⚠️ 乱序拦截] 区块 ${blockId} 的过期响应 (seq: ${currentSeq}) 已被丢弃，当前最新: ${lastResolved}`,
            );
            return; // 💥 直接丢弃，绝对不能推进安全快照！
          }

          // 如果它是最新的，更新记录本
          lastResolvedVersionRef.current[blockId] = currentSeq;

          // 推进安全快照
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
          console.log(
            `[🟢 同步成功] 区块 ${blockId} 已落盘 (seq: ${currentSeq})`,
            updates,
          );
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

      const currentPending = pendingUpdatesRef.current[id] || {};
      const mergedAttributes = {
        ...(currentPending.attributes || {}),
        ...(updates.attributes || {}),
      };

      pendingUpdatesRef.current[id] = {
        ...currentPending,
        ...updates,
        ...(Object.keys(mergedAttributes).length > 0
          ? { attributes: mergedAttributes }
          : {}),
      } as Partial<Block>;

      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
      }

      timersRef.current[id] = setTimeout(() => {
        const finalUpdates = pendingUpdatesRef.current[id];
        if (finalUpdates) {
          // 🚀 核心防线 4：在发送请求前，生成一个新的序号，并捕获在闭包中
          requestSeqRef.current += 1;
          const currentSeq = requestSeqRef.current;

          // 发送时带上这个序号
          commitBlockUpdate(id, finalUpdates, currentSeq);
        }

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
