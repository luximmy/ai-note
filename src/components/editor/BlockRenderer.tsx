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
import { updateBlockAction } from '@/actions/note';
import { useDebouncedCallback } from 'use-debounce';

const BlockRegistry: Record<
  string,
  FC<{
    block: any;
    onUpdate?: (id: string, content: string) => void;
    forceSyncToken?: number;
  }>
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

  // 1. [前台缓冲] 活跃的 UI 状态（用户打字瞬间更新，0延迟反馈）
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

  // 2. [后台缓冲] 安全快照点（仅在明确知道服务端已保存成功，或初次加载时更新）
  const [safeSnapshot, setSafeSnapshot] = useState<Block[]>(initialBlocks);
  const safeSnapshotRef = useRef<Block[]>(initialBlocks);

  // 3. 回滚触发器：当它变化时，强迫底层 Tiptap 放弃当前正在输入的内容，与快照对齐
  const [forceSyncToken, setForceSyncToken] = useState(0);

  // 保持 ref 与 state 同步，便于在防抖回调中获取最新快照
  useEffect(() => {
    safeSnapshotRef.current = safeSnapshot;
  }, [safeSnapshot]);

  // 服务端推送了新的绝对真理数据（比如发生了 router.refresh()）
  useEffect(() => {
    setBlocks(initialBlocks);
    setSafeSnapshot(initialBlocks);
  }, [initialBlocks]);

  // 核心逻辑：带回滚保护的网络上传管道
  const debouncedServerUpdate = useDebouncedCallback(
    async (blockId: string, newContent: string, latestBlocks: Block[]) => {
      try {
        const result = await updateBlockAction(noteId, blockId, {
          content: newContent,
        });

        if (result.success) {
          // 边界保护 E：请求成功，推进安全线
          console.log(`[🟢 同步成功] 区块 ${blockId} 已落盘`);
          setSafeSnapshot(latestBlocks);
        }
      } catch (error) {
        // 🚨 触发 15% 的模拟异常
        toast.error('网络异常，内容保存失败', {
          description: '已为您回滚到上一个安全状态。',
          duration: 4000,
        });

        // 边界保护 F：回滚执行
        // 1. UI 状态回退到安全快照
        setBlocks(safeSnapshotRef.current);
        // 2. 发送信号给子组件的 Tiptap，强制它覆盖掉自己内部正在维护的脏文本
        setForceSyncToken((prev) => prev + 1);

        // 3. 悄悄让 Next.js 重新拉取一次 Server 端数据，确保 100% 对齐
        startTransition(() => {
          router.refresh();
        });
      }
    },
    800, // 防抖等待时间：用户停止打字 800ms 后才发起网络请求
  );

  const updateBlockContent = useCallback(
    (id: string, newContent: string) => {
      setBlocks((prevBlocks) => {
        // 更新前台缓冲（UI瞬间响应）
        const newBlocks = prevBlocks.map((block) =>
          block.id === id ? { ...block, content: newContent } : block,
        );

        // 触发防抖长链
        debouncedServerUpdate(id, newContent, newBlocks);

        return newBlocks;
      });
    },
    [debouncedServerUpdate],
  );

  if (!blocks || blocks.length === 0) {
    return <div className='text-zinc-400 italic p-4'>暂无内容</div>;
  }

  return (
    <div className='space-y-4 pb-32'>
      {blocks.map((block) => (
        <BlockNode
          key={block.id}
          block={block}
          onUpdate={updateBlockContent}
          forceSyncToken={forceSyncToken}
        />
      ))}
    </div>
  );
}

function BlockNode({
  block,
  onUpdate,
  forceSyncToken,
}: {
  block: Block;
  onUpdate: (id: string, content: string) => void;
  forceSyncToken?: number;
}) {
  const TargetComponent = BlockRegistry[block.type];
  if (!TargetComponent) return null;
  return (
    <TargetComponent
      block={block}
      onUpdate={onUpdate}
      forceSyncToken={forceSyncToken}
    />
  );
}
