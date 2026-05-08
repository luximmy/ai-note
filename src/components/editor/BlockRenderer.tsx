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
import { updateBlockAction, addBlockAction } from '@/actions/note';

import { GenerativeUIBlock } from './blocks/GenerativeUIBlock';
import { SlashMenuItem } from './SlashMenu';
import { emitSaveEvent } from '@/lib/telemetry';

// 🚀 优化：定义统一的组件 Props 接口，供各个 Block 组件继承和校验
export interface BlockComponentProps<T extends Block> {
  block: T;
  onUpdate?: (id: string, updates: Partial<Block>) => void;
  onInsert?: (afterBlockId: string, item: SlashMenuItem) => void;
  forceSyncToken?: number;
}

// 🚀 收敛类型：使用映射类型精确校验每个区块的渲染器，彻底删除这里的 `as any`
type RegistryType = {
  [K in Block['type']]: FC<BlockComponentProps<Extract<Block, { type: K }>>>;
};

const BlockRegistry: RegistryType = {
  paragraph: ParagraphBlock,
  heading: HeadingBlock,
  code: CodeBlock,
  todo: TodoBlock,
  generative_ui: GenerativeUIBlock,
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
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    safeSnapshotRef.current = safeSnapshot;
  }, [safeSnapshot]);

  // router.refresh() 触发父组件重新获取数据后，需要将新数据同步到本地状态。
  // 此处 setState 是对 props 变化的响应，而非级联渲染。
  useEffect(() => {
    setBlocks(initialBlocks); // eslint-disable-line react-hooks/set-state-in-effect
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
            emitSaveEvent({
              type: 'out_of_order',
              noteId,
              blockId,
              seq: currentSeq,
              timestamp: Date.now(),
            });
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
          emitSaveEvent({
            type: 'success',
            noteId,
            blockId,
            seq: currentSeq,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        emitSaveEvent({
          type: 'failure',
          noteId,
          blockId,
          seq: currentSeq,
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });

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

  const insertBlock = useCallback(
    async (afterBlockId: string, item: SlashMenuItem) => {
      // 1. 生成临时 ID (Mock 环境先用时间戳+随机数凑合，真实情况可用 nanoid 或 crypto.randomUUID)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      // 2. 根据菜单项组装一个新的完整的 Block 对象
      const newBlock: Block = {
        id: tempId,
        type: item.type,
        content: '',
        attributes: item.level
          ? { level: item.level }
          : item.type === 'generative_ui'
            ? { componentId: 'TaskBoard', status: 'streaming', props: {} }
            : {},
      } as Block;

      // 3. 乐观更新：立即将新区块插入到当前 blocks 和 safeSnapshot 数组中
      const insertOptimistically = (prevBlocks: Block[]) => {
        const idx = prevBlocks.findIndex((b) => b.id === afterBlockId);
        if (idx === -1) return [...prevBlocks, newBlock];
        const nextBlocks = [...prevBlocks];
        nextBlocks.splice(idx + 1, 0, newBlock);
        return nextBlocks;
      };

      setBlocks(insertOptimistically);
      setSafeSnapshot(insertOptimistically); // 插入是原子操作，同步推进快照

      try {
        // 4. 发起真实的网络请求
        const result = await addBlockAction(noteId, afterBlockId, newBlock);
        if (result.success) {
          // 真实后端可能会替换临时 ID 为真实 ID，这里模拟更新一下
          emitSaveEvent({
            type: 'success',
            noteId,
            blockId: result.blockId,
            seq: 0,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        emitSaveEvent({
          type: 'rollback',
          noteId,
          blockId: tempId,
          seq: 0,
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now(),
        });

        toast.error('区块插入失败', {
          description: '网络错误，已撤销新建操作。',
        });

        // 5. 失败回滚：从状态中移除这个临时区块
        const rollback = (prevBlocks: Block[]) =>
          prevBlocks.filter((b) => b.id !== tempId);
        setBlocks(rollback);
        setSafeSnapshot(rollback);
      }
    },
    [noteId],
  );

  if (!blocks || blocks.length === 0) {
    return <div className='text-zinc-400 italic p-4'>暂无内容</div>;
  }

  return (
    <div className='space-y-4 pb-32'>
      {blocks.map((block) => {
        // 🚨 架构级类型豁免：
        // 由于 TS 暂不支持动态联合类型分发（Correlated Record Types 缺陷），
        // 编译器无法推断 block.type 与 block 实例的绝对绑定关系。
        // 这里采用 `as React.ElementType` 进行降级处理，因为在上面的 BlockRegistry
        // 定义中我们已经保证了类型映射的绝对正确性。
        const TargetComponent = BlockRegistry[block.type] as React.ElementType;

        if (!TargetComponent) return null;

        return (
          <TargetComponent
            key={block.id}
            block={block}
            onUpdate={updateBlockData}
            onInsert={insertBlock}
            forceSyncToken={forceSyncToken}
          />
        );
      })}
    </div>
  );
}
