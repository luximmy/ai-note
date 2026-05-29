// src/actions/note.ts
'use server';

import { Document, Block, GraphData, GraphNode, Wikilink } from '@/types';
import {
  parseWikilinks,
  resolveWikilinkTitle,
  extractContext,
} from '@/lib/wikilink-parser';
import { stripHtml } from '@/lib/strip-html';
import { getSession } from '@/lib/auth';
import {
  getDocumentById as getDocFromDb,
  getAllDocumentsWithBlocks,
  createDocument,
  deleteDocument,
  updateDocument,
  updateBlock,
  addBlock,
  deleteBlock,
  reorderBlocks,
} from '@/db/queries';
import { randomUUID } from 'node:crypto';

async function requireAuth(): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new Error('未登录');
  }
  return session.userId;
}

/**
 * 创建新笔记
 */
export async function createNote(
  title: string = '无标题笔记',
  emoji?: string,
): Promise<{ id: string }> {
  const userId = await requireAuth();
  const id = randomUUID();
  await createDocument(id, userId, title, emoji);
  return { id };
}

/**
 * 删除笔记
 */
export async function deleteNote(id: string): Promise<boolean> {
  const userId = await requireAuth();
  return deleteDocument(id, userId);
}

/**
 * 更新笔记标题和图标
 */
export async function updateNote(
  id: string,
  updates: { title?: string; emoji?: string },
): Promise<boolean> {
  const userId = await requireAuth();
  return updateDocument(id, userId, updates);
}

/**
 * 获取单篇笔记详情
 */
export async function getNoteById(id: string): Promise<Document> {
  const userId = await requireAuth();
  const note = await getDocFromDb(id, userId);
  if (!note) {
    throw new Error('404 - 笔记未找到');
  }
  return note;
}

/**
 * 保存/更新一个区块
 */
export async function updateBlockAction(
  noteId: string,
  blockId: string,
  updatedBlock: Partial<Block>,
) {
  await requireAuth();
  await updateBlock(noteId, blockId, updatedBlock);
  return { success: true, timestamp: Date.now() };
}

/**
 * 添加新区块
 */
export async function addBlockAction(
  noteId: string,
  afterBlockId: string,
  newBlock: Block,
) {
  await requireAuth();
  await addBlock(noteId, afterBlockId, newBlock);
  return {
    success: true,
    blockId: newBlock.id,
    timestamp: Date.now(),
  };
}

/**
 * 删除区块
 */
export async function deleteBlockAction(noteId: string, blockId: string) {
  await requireAuth();
  await deleteBlock(noteId, blockId);
  return { success: true, timestamp: Date.now() };
}

/**
 * 重排区块
 */
export async function reorderBlocksAction(noteId: string, blockIds: string[]) {
  await requireAuth();
  await reorderBlocks(noteId, blockIds);
  return { success: true, timestamp: Date.now() };
}

/**
 * 获取知识图谱数据（节点 + 边）
 */
export async function getGraphData(): Promise<GraphData> {
  const userId = await requireAuth();
  const allDocs = await getAllDocumentsWithBlocks(userId);

  const nodes: GraphNode[] = allDocs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    emoji: doc.emoji || '📄',
    backlinkCount: 0,
  }));

  const backlinkCounts: Record<string, number> = {};
  const edges: { source: string; target: string }[] = [];

  for (const doc of allDocs) {
    for (const block of doc.blocks) {
      if (!block.content) continue;
      const plainContent = stripHtml(block.content);
      const titles = parseWikilinks(plainContent);
      for (const title of titles) {
        const targetId = resolveWikilinkTitle(title, allDocs);
        if (targetId) {
          edges.push({ source: doc.id, target: targetId });
          backlinkCounts[targetId] = (backlinkCounts[targetId] || 0) + 1;
        }
      }
    }
  }

  for (const node of nodes) {
    node.backlinkCount = backlinkCounts[node.id] || 0;
  }

  return { nodes, edges };
}

/**
 * 获取指定笔记的所有反向链接
 */
export async function getBacklinksForNote(noteId: string): Promise<Wikilink[]> {
  const userId = await requireAuth();
  const allDocs = await getAllDocumentsWithBlocks(userId);
  const targetDoc = allDocs.find((d) => d.id === noteId);
  if (!targetDoc) return [];

  const backlinks: Wikilink[] = [];

  for (const doc of allDocs) {
    if (doc.id === noteId) continue;
    for (const block of doc.blocks) {
      if (!block.content) continue;
      const plainContent = stripHtml(block.content);
      const regex = /\[\[([^\]]+)\]\]/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(plainContent)) !== null) {
        if (match[1].trim() === targetDoc.title) {
          backlinks.push({
            sourceId: doc.id,
            targetId: noteId,
            targetTitle: targetDoc.title,
            sourceTitle: doc.title,
            sourceEmoji: doc.emoji,
            contextPreview: extractContext(
              plainContent,
              match.index,
              match[0].length,
            ),
          });
        }
      }
    }
  }

  return backlinks;
}
