// src/db/queries.ts
import { db, ensureSeeded } from './index';
import {
  users,
  documents,
  blocks,
  blockEmbeddings,
  chatSessions,
  chatMessages,
} from './schema';
import { eq, asc, and, desc } from 'drizzle-orm';
import {
  embedAndStoreBlock,
  backfillMissingEmbeddings,
} from '@/lib/embedding-store';

ensureSeeded();
backfillMissingEmbeddings().catch((err) =>
  console.error('[Embedding] Backfill failed:', err),
);

import type {
  Document,
  Block,
  ParagraphBlock,
  HeadingBlock,
  CodeBlock,
  TodoBlock,
  GenerativeUIBlock,
} from '@/types';

interface BlockRow {
  id: string;
  documentId: string;
  type: string;
  position: number;
  parentId: string | null;
  content: string | null;
  attributes: string | null;
  createdAt: number;
  updatedAt: number;
  authorId: string | null;
}

function dbRowToBlock(row: BlockRow): Block {
  const attrs = row.attributes ? JSON.parse(row.attributes) : undefined;
  const base = {
    id: row.id,
    content: row.content ?? undefined,
    parentId: row.parentId ?? undefined,
    metadata: {
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorId: row.authorId ?? undefined,
    },
  };

  switch (row.type) {
    case 'paragraph':
      return {
        ...base,
        type: 'paragraph',
        attributes: attrs,
      } as ParagraphBlock;
    case 'heading':
      return { ...base, type: 'heading', attributes: attrs } as HeadingBlock;
    case 'code':
      return { ...base, type: 'code', attributes: attrs } as CodeBlock;
    case 'todo':
      return { ...base, type: 'todo', attributes: attrs } as TodoBlock;
    case 'generative_ui':
      return {
        ...base,
        type: 'generative_ui',
        attributes: attrs,
      } as GenerativeUIBlock;
    default:
      throw new Error(`Unknown block type: ${row.type}`);
  }
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}

export async function createUser(
  id: string,
  email: string,
  passwordHash: string,
  name: string,
  now: number,
): Promise<void> {
  await db
    .insert(users)
    .values({
      id,
      email,
      passwordHash,
      name,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

export async function getUserByEmail(email: string) {
  return await db.select().from(users).where(eq(users.email, email)).get();
}

export async function getUserById(id: string) {
  return await db.select().from(users).where(eq(users.id, id)).get();
}

export async function getAllDocumentsMeta(
  userId: string,
): Promise<Pick<Document, 'id' | 'title' | 'emoji'>[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      emoji: documents.emoji,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .all();

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    emoji: r.emoji ?? undefined,
  }));
}

export async function getDocumentById(
  id: string,
  userId: string,
): Promise<Document | null> {
  const doc = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .get();
  if (!doc) return null;

  const blockRows = (await db
    .select()
    .from(blocks)
    .where(eq(blocks.documentId, id))
    .orderBy(asc(blocks.position))
    .all()) as BlockRow[];

  return {
    id: doc.id,
    title: doc.title,
    emoji: doc.emoji ?? undefined,
    coverImage: doc.coverImage ?? undefined,
    tags: parseTags(doc.tags),
    lastAccessedAt: doc.lastAccessedAt,
    blocks: blockRows.map(dbRowToBlock),
    backlinks: [],
  };
}

export async function getAllDocumentsWithBlocks(
  userId: string,
): Promise<Document[]> {
  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .all();
  const allBlocks = (await db
    .select()
    .from(blocks)
    .orderBy(asc(blocks.position))
    .all()) as BlockRow[];

  const blocksByDoc = new Map<string, BlockRow[]>();
  for (const b of allBlocks) {
    const arr = blocksByDoc.get(b.documentId) || [];
    arr.push(b);
    blocksByDoc.set(b.documentId, arr);
  }

  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    emoji: doc.emoji ?? undefined,
    coverImage: doc.coverImage ?? undefined,
    tags: parseTags(doc.tags),
    lastAccessedAt: doc.lastAccessedAt,
    blocks: (blocksByDoc.get(doc.id) || []).map(dbRowToBlock),
    backlinks: [],
  }));
}

export async function createDocument(
  id: string,
  userId: string,
  title: string,
  emoji?: string,
): Promise<void> {
  const now = Date.now();
  await db
    .insert(documents)
    .values({
      id,
      userId,
      title,
      emoji: emoji ?? null,
      coverImage: null,
      tags: null,
      lastAccessedAt: now,
    })
    .run();

  await db
    .insert(blocks)
    .values({
      id: `${id}_block_${now}`,
      documentId: id,
      type: 'paragraph',
      position: 0,
      parentId: null,
      content: '',
      attributes: null,
      createdAt: now,
      updatedAt: now,
      authorId: null,
    })
    .run();
}

export async function migrateDefaultUserDocuments(
  userId: string,
): Promise<number> {
  const DEFAULT_USER_ID = 'user_default';
  const defaultDocs = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, DEFAULT_USER_ID))
    .all();
  if (defaultDocs.length === 0) return 0;

  await db
    .update(documents)
    .set({ userId })
    .where(eq(documents.userId, DEFAULT_USER_ID))
    .run();
  return defaultDocs.length;
}

export async function deleteDocument(
  id: string,
  userId: string,
): Promise<boolean> {
  const doc = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .get();
  if (!doc) return false;

  await db
    .delete(blockEmbeddings)
    .where(
      eq(
        blockEmbeddings.blockId,
        db
          .select({ id: blocks.id })
          .from(blocks)
          .where(eq(blocks.documentId, id)),
      ),
    )
    .run();
  await db.delete(blocks).where(eq(blocks.documentId, id)).run();
  await db.delete(documents).where(eq(documents.id, id)).run();
  return true;
}

export async function updateDocument(
  id: string,
  userId: string,
  updates: { title?: string; emoji?: string },
): Promise<boolean> {
  const doc = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .get();
  if (!doc) return false;

  await db
    .update(documents)
    .set({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.emoji !== undefined && { emoji: updates.emoji }),
      lastAccessedAt: Date.now(),
    })
    .where(eq(documents.id, id))
    .run();
  return true;
}

export async function updateBlock(
  noteId: string,
  blockId: string,
  updates: Partial<Block>,
): Promise<void> {
  const existing = await db
    .select()
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .get();
  if (!existing) return;

  const mergedAttributes = updates.attributes
    ? JSON.stringify({
        ...(existing.attributes ? JSON.parse(existing.attributes) : {}),
        ...updates.attributes,
      })
    : existing.attributes;

  await db
    .update(blocks)
    .set({
      content:
        updates.content !== undefined ? updates.content : existing.content,
      attributes: mergedAttributes,
      updatedAt: Date.now(),
    })
    .where(eq(blocks.id, blockId))
    .run();

  if (updates.content !== undefined && updates.content) {
    embedAndStoreBlock(blockId, updates.content).catch((err) =>
      console.error('[Embedding] Update failed for block', blockId, err),
    );
  }
}

export async function addBlock(
  noteId: string,
  afterBlockId: string,
  newBlock: Block,
): Promise<void> {
  const afterBlock = await db
    .select({ position: blocks.position })
    .from(blocks)
    .where(eq(blocks.id, afterBlockId))
    .get();
  const insertPosition = afterBlock ? afterBlock.position + 1 : 0;

  const allBlocks = await db
    .select({ id: blocks.id, position: blocks.position })
    .from(blocks)
    .where(eq(blocks.documentId, noteId))
    .all();

  for (const b of allBlocks) {
    if (b.position >= insertPosition) {
      await db
        .update(blocks)
        .set({ position: b.position + 1 })
        .where(eq(blocks.id, b.id))
        .run();
    }
  }

  const now = Date.now();
  await db
    .insert(blocks)
    .values({
      id: newBlock.id,
      documentId: noteId,
      type: newBlock.type,
      position: insertPosition,
      parentId: newBlock.parentId ?? null,
      content: newBlock.content ?? null,
      attributes: newBlock.attributes
        ? JSON.stringify(newBlock.attributes)
        : null,
      createdAt: newBlock.metadata?.createdAt ?? now,
      updatedAt: newBlock.metadata?.updatedAt ?? now,
      authorId: newBlock.metadata?.authorId ?? null,
    })
    .run();

  if (newBlock.content) {
    embedAndStoreBlock(newBlock.id, newBlock.content).catch((err) =>
      console.error('[Embedding] Create failed for block', newBlock.id, err),
    );
  }
}

export async function deleteBlock(
  noteId: string,
  blockId: string,
): Promise<void> {
  const target = await db
    .select({ position: blocks.position })
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .get();
  if (!target) return;

  await db.delete(blocks).where(eq(blocks.id, blockId)).run();
  await db
    .delete(blockEmbeddings)
    .where(eq(blockEmbeddings.blockId, blockId))
    .run();

  const remaining = await db
    .select({ id: blocks.id, position: blocks.position })
    .from(blocks)
    .where(eq(blocks.documentId, noteId))
    .all();

  for (const b of remaining) {
    if (b.position > target.position) {
      await db
        .update(blocks)
        .set({ position: b.position - 1 })
        .where(eq(blocks.id, b.id))
        .run();
    }
  }
}

export async function reorderBlocks(
  noteId: string,
  blockIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (let i = 0; i < blockIds.length; i++) {
      await tx
        .update(blocks)
        .set({ position: i })
        .where(eq(blocks.id, blockIds[i]))
        .run();
    }
  });
}

export async function createChatSession(
  id: string,
  userId: string,
  title: string,
): Promise<void> {
  const now = Date.now();
  await db
    .insert(chatSessions)
    .values({ id, userId, title, createdAt: now, updatedAt: now })
    .run();
}

export async function getChatSessions(userId: string) {
  return await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .all();
}

export async function getChatSession(id: string, userId: string) {
  return await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .get();
}

export async function updateChatSessionTitle(
  id: string,
  userId: string,
  title: string,
): Promise<void> {
  await db
    .update(chatSessions)
    .set({ title, updatedAt: Date.now() })
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .run();
}

export async function deleteChatSession(
  id: string,
  userId: string,
): Promise<boolean> {
  const session = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
    .get();
  if (!session) return false;

  await db.delete(chatMessages).where(eq(chatMessages.sessionId, id)).run();
  await db.delete(chatSessions).where(eq(chatSessions.id, id)).run();
  return true;
}

export async function addChatMessage(
  id: string,
  sessionId: string,
  role: string,
  content: string,
): Promise<void> {
  await db
    .insert(chatMessages)
    .values({ id, sessionId, role, content, createdAt: Date.now() })
    .run();
  await db
    .update(chatSessions)
    .set({ updatedAt: Date.now() })
    .where(eq(chatSessions.id, sessionId))
    .run();
}

export async function getChatMessages(sessionId: string) {
  return await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
    .all();
}
