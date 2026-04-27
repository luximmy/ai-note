// src/actions/note.ts
'use server';

import { mockDocuments } from '@/mock/data';
import { Document, Block } from '@/types';

/**
 * 模拟网络延迟的核心函数
 * @param ms 延迟毫秒数
 * @param failureRate 模拟接口崩溃的概率 (0-1)
 */
const simulateNetwork = async (ms: number = 800, failureRate: number = 0.1) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (Math.random() < failureRate) {
    throw new Error('网络超时或服务器异常，请重试！(Mock Error)');
  }
};

/**
 * 获取单篇笔记详情
 */
export async function getNoteById(id: string): Promise<Document> {
  // 模拟基础的 800ms 延迟，以及 5% 的拉取失败率
  await simulateNetwork(800, 0.05);

  const note = mockDocuments.find((doc) => doc.id === id);
  if (!note) {
    throw new Error('404 - 笔记未找到');
  }

  // 深度克隆以防止在服务端意外修改源 Mock 数据
  return JSON.parse(JSON.stringify(note));
}

/**
 * 模拟保存/更新一个区块 (用于配合 useOptimistic)
 */
export async function updateBlockAction(
  noteId: string,
  blockId: string,
  updatedBlock: Partial<Block>,
) {
  await simulateNetwork(500, 0.15);

  // 🚀 修复中危：真实修改内存里的数据源，使得 router.refresh() 能读取到最新状态
  const note = mockDocuments.find((doc) => doc.id === noteId);
  if (note) {
    const blockIndex = note.blocks.findIndex((b) => b.id === blockId);
    if (blockIndex !== -1) {
      const currentBlock = note.blocks[blockIndex];
      note.blocks[blockIndex] = {
        ...currentBlock,
        ...updatedBlock,
        attributes: {
          ...(currentBlock.attributes || {}),
          ...(updatedBlock.attributes || {}),
        },
      } as Block;
    }
  }

  console.log(
    `[Mock Server] 成功持久化保存笔记 ${noteId} 中的区块 ${blockId}`,
    updatedBlock,
  );
  return { success: true, timestamp: Date.now() };
}
