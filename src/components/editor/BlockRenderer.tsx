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
import { useAppStore } from '@/store';
import { mockDocuments } from '@/mock/data';

// 引入拖拽依赖
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { GripVertical } from 'lucide-react';
// 引入刚刚写的 Wrapper 和刚才写的 Action
import { SortableBlockItem } from './SortableBlockItem';
import { deleteBlockAction, reorderBlocksAction } from '@/actions/note';

// 🚀 优化：定义统一的组件 Props 接口，供各个 Block 组件继承和校验
export interface BlockComponentProps<T extends Block> {
  block: T;
  onUpdate?: (id: string, updates: Partial<Block>) => void;
  onInsert?: (afterBlockId: string, item: SlashMenuItem) => void;
  forceSyncToken?: number;
  autoFocus?: boolean;
  documents?: { id: string; title: string }[];
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
  const setNoteContext = useAppStore((state) => state.setNoteContext); // ✨ 取出更新方法
  const { pendingInsertBlocks, clearInsert } = useAppStore();

  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const blocksRef = useRef<Block[]>(initialBlocks);
  const [safeSnapshot, setSafeSnapshot] = useState<Block[]>(initialBlocks);
  const safeSnapshotRef = useRef<Block[]>(initialBlocks);
  const [forceSyncToken, setForceSyncToken] = useState(0);
  const [autoFocusBlockId, setAutoFocusBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingUpdatesRef = useRef<Record<string, Partial<Block>>>({});

  // 🚀 核心防线 1：全局递增的请求序号生成器 (发号器)
  const requestSeqRef = useRef(0);
  // 🚀 核心防线 2：记录每个区块最后一次成功应用的请求序号 (记录本)
  const lastResolvedVersionRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const contextText = blocks
      .map((b) => {
        if (b.type === 'todo')
          return `[${b.attributes?.checked ? 'x' : ' '}] ${b.content || ''}`;
        if (b.type === 'heading')
          return `${'#'.repeat(b.attributes?.level || 1)} ${b.content || ''}`;
        if (b.type === 'code')
          return `\`\`\`${b.attributes?.language || ''}\n${b.content || ''}\n\`\`\``;
        return b.content || '';
      })
      .filter(Boolean)
      .join('\n\n');

    setNoteContext(`当前文档内容如下：\n\n${contextText}`);
  }, [blocks, setNoteContext]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

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

      const newBlock: Block = {
        id: tempId,
        type: item.type,
        content: item.content || '',
        // ✨ 核心修复：优先读取透传的 attributes，如果没有再回退到原有逻辑
        attributes:
          ('attributes' in item
            ? (item as { attributes?: Record<string, unknown> }).attributes
            : undefined) ||
          (item.level
            ? { level: item.level }
            : item.type === 'generative_ui'
              ? { componentId: 'TaskBoard', status: 'streaming', props: {} }
              : {}),
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

      setAutoFocusBlockId(tempId);
      // 下一帧清除，避免后续重渲染反复触发聚焦
      requestAnimationFrame(() => setAutoFocusBlockId(null));

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

  // ✨ 监听批量插入指令（通过 blocksRef 读取最新 blocks，避免 effect 依赖 blocks）
  useEffect(() => {
    if (pendingInsertBlocks && pendingInsertBlocks.length > 0) {
      const newBlocks = pendingInsertBlocks.map(
        (item, index) =>
          ({
            id: `ai_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
            type: item.type,
            content: item.content || '',
            attributes: item.attributes || {},
          }) as Block,
      );

      // 乐观更新：先追加到画布（setState in effect 是有意为之：响应外部事件总线指令）
      setBlocks((prev) => [...prev, ...newBlocks]); // eslint-disable-line react-hooks/set-state-in-effect
      setSafeSnapshot((prev) => [...prev, ...newBlocks]);

      // 静默触发网络请求，失败时回滚
      const lastBlockId =
        blocksRef.current[blocksRef.current.length - 1]?.id || 'mock-id';
      const insertedIds = new Set(newBlocks.map((b) => b.id));

      Promise.allSettled(
        newBlocks.map((block) => addBlockAction(noteId, lastBlockId, block)),
      ).then((results) => {
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          toast.error(`批量插入：${failed.length} 个区块保存失败，已自动回滚`);
          setBlocks((prev) => prev.filter((b) => !insertedIds.has(b.id)));
          setSafeSnapshot((prev) => prev.filter((b) => !insertedIds.has(b.id)));
        }
      });

      clearInsert();
    }
  }, [pendingInsertBlocks, noteId, clearInsert]);

  // 在 BlockRenderer 内部配置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 核心防御：移动 5px 才触发拖拽，保护富文本点击与选区
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // --- 拖拽开始 ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // --- 拖拽结束处理 ---
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null); // 👈 新增：拖拽结束时清空活动 ID

    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      // 1. 本地乐观重排
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);
      setSafeSnapshot(newBlocks); // 结构性改变，立刻推进快照

      try {
        // 2. 服务端同步
        const result = await reorderBlocksAction(
          noteId,
          newBlocks.map((b) => b.id),
        );
        if (result.success) {
          emitSaveEvent({
            type: 'success',
            noteId,
            blockId: String(active.id),
            seq: 0,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        // 3. 失败回滚
        toast.error('重排失败', {
          description: '网络同步异常，已恢复原有顺序',
        });
        setBlocks(safeSnapshotRef.current);
        setSafeSnapshot(safeSnapshotRef.current);
        startTransition(() => {
          router.refresh();
        });
      }
    }
  };

  // 最好也加一个取消拖拽的处理
  const handleDragCancel = () => {
    setActiveId(null);
  };

  // --- 删除区块处理 ---
  const handleDeleteBlock = async (blockId: string) => {
    if (blocks.length <= 1) return; // 最后一个不能删

    // 1. 本地乐观删除
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    setBlocks(newBlocks);
    setSafeSnapshot(newBlocks);

    try {
      // 2. 服务端同步
      await deleteBlockAction(noteId, blockId);
    } catch (err) {
      // 3. 失败回滚
      toast.error('删除失败', { description: '网络同步异常，已恢复区块' });
      setBlocks(safeSnapshotRef.current);
      setSafeSnapshot(safeSnapshotRef.current);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  if (!blocks || blocks.length === 0) {
    return <div className='text-zinc-400 italic p-4'>暂无内容</div>;
  }

  // 找出当前正在被拖拽的 Block 数据
  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;
  let ActiveComponent = null;
  if (activeBlock) {
    ActiveComponent = BlockRegistry[activeBlock.type] as React.ElementType;
  }

  return (
    <div className='space-y-4 pb-32'>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart} // 👈 绑定事件
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel} // 👈 绑定事件
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block) => {
            const TargetComponent = BlockRegistry[
              block.type
            ] as React.ElementType;
            if (!TargetComponent) return null;

            return (
              <SortableBlockItem
                key={block.id}
                id={block.id}
                onDelete={handleDeleteBlock}
                isOnlyBlock={blocks.length === 1}
              >
                <TargetComponent
                  block={block}
                  onUpdate={updateBlockData}
                  onInsert={insertBlock}
                  forceSyncToken={forceSyncToken}
                  autoFocus={autoFocusBlockId === block.id}
                  documents={mockDocuments}
                />
              </SortableBlockItem>
            );
          })}
        </SortableContext>

        {/* 拖拽悬浮层优化 */}
        <DragOverlay
          dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // 丝滑的弹簧回弹曲线
          }}
        >
          {activeBlock && ActiveComponent ? (
            <div className='w-full flex items-start gap-2 py-1 cursor-grabbing scale-[1.02] transition-transform rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] bg-white/70 backdrop-blur-md ring-1 ring-zinc-200/50'>
              {/* 1. 模拟左侧手柄的严格占位，彻底解决水平跳动问题 */}
              <div className='mt-1.5 w-4 shrink-0 pl-1'>
                <GripVertical className='h-4 w-4 text-zinc-400 opacity-50' />
              </div>

              {/* 2. 真实的 Block 内容 */}
              <div className='flex-1 min-w-0 opacity-100 pointer-events-none'>
                <ActiveComponent
                  block={activeBlock}
                  onUpdate={() => {}}
                  onInsert={() => {}}
                  forceSyncToken={forceSyncToken}
                />
              </div>

              {/* 3. 模拟右侧删除按钮占位，保持右侧不贴边 */}
              {blocks.length > 1 && (
                <div className='mt-1.5 w-4 shrink-0 mr-2' />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
