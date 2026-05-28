import { db, ensureSeeded } from './index';
import { documents, blocks, blockEmbeddings } from './schema';
import { eq, asc } from 'drizzle-orm';
import { embedAndStoreBlock, backfillMissingEmbeddings } from '@/lib/embedding-store';

// Seed database on first module load (idempotent)
ensureSeeded();
// Backfill embeddings for blocks that don't have them yet
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

// ─── Internal helpers ───

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
      return { ...base, type: 'paragraph', attributes: attrs } as ParagraphBlock;
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

// ─── Exported query functions ───

export async function getAllDocumentsMeta(): Promise<
  Pick<Document, 'id' | 'title' | 'emoji'>[]
> {
  const rows = db
    .select({
      id: documents.id,
      title: documents.title,
      emoji: documents.emoji,
    })
    .from(documents)
    .all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    emoji: r.emoji ?? undefined,
  }));
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const doc = db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .get();
  if (!doc) return null;

  const blockRows = db
    .select()
    .from(blocks)
    .where(eq(blocks.documentId, id))
    .orderBy(asc(blocks.position))
    .all() as BlockRow[];

  return {
    id: doc.id,
    title: doc.title,
    emoji: doc.emoji ?? undefined,
    coverImage: doc.coverImage ?? undefined,
    tags: parseTags(doc.tags),
    lastAccessedAt: doc.lastAccessedAt,
    blocks: blockRows.map(dbRowToBlock),
    backlinks: [], // Computed at runtime by caller (getBacklinksForNote)
  };
}

export async function getAllDocumentsWithBlocks(): Promise<Document[]> {
  const docs = db.select().from(documents).all();
  const allBlocks = db
    .select()
    .from(blocks)
    .orderBy(asc(blocks.position))
    .all() as BlockRow[];

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

export async function updateBlock(
  noteId: string,
  blockId: string,
  updates: Partial<Block>,
): Promise<void> {
  const existing = db
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

  db.update(blocks)
    .set({
      content: updates.content !== undefined ? updates.content : existing.content,
      attributes: mergedAttributes,
      updatedAt: Date.now(),
    })
    .where(eq(blocks.id, blockId))
    .run();

  // Re-embed if content changed (fire-and-forget)
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
  // Find the position of the afterBlock
  const afterBlock = db
    .select({ position: blocks.position })
    .from(blocks)
    .where(eq(blocks.id, afterBlockId))
    .get();

  const insertPosition = afterBlock ? afterBlock.position + 1 : 0;

  // Shift all blocks at or after insertPosition up by 1
  const allBlocks = db
    .select({ id: blocks.id, position: blocks.position })
    .from(blocks)
    .where(eq(blocks.documentId, noteId))
    .all();

  for (const b of allBlocks) {
    if (b.position >= insertPosition) {
      db.update(blocks)
        .set({ position: b.position + 1 })
        .where(eq(blocks.id, b.id))
        .run();
    }
  }

  const now = Date.now();
  db.insert(blocks)
    .values({
      id: newBlock.id,
      documentId: noteId,
      type: newBlock.type,
      position: insertPosition,
      parentId: newBlock.parentId ?? null,
      content: newBlock.content ?? null,
      attributes: newBlock.attributes ? JSON.stringify(newBlock.attributes) : null,
      createdAt: newBlock.metadata?.createdAt ?? now,
      updatedAt: newBlock.metadata?.updatedAt ?? now,
      authorId: newBlock.metadata?.authorId ?? null,
    })
    .run();

  // Embed new block (fire-and-forget)
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
  const target = db
    .select({ position: blocks.position })
    .from(blocks)
    .where(eq(blocks.id, blockId))
    .get();
  if (!target) return;

  db.delete(blocks).where(eq(blocks.id, blockId)).run();
  // Explicitly delete embedding (CASCADE also handles this)
  db.delete(blockEmbeddings).where(eq(blockEmbeddings.blockId, blockId)).run();

  // Shift blocks after the deleted one down by 1
  const remaining = db
    .select({ id: blocks.id, position: blocks.position })
    .from(blocks)
    .where(eq(blocks.documentId, noteId))
    .all();

  for (const b of remaining) {
    if (b.position > target.position) {
      db.update(blocks)
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
  db.transaction(() => {
    for (let i = 0; i < blockIds.length; i++) {
      db.update(blocks)
        .set({ position: i })
        .where(eq(blocks.id, blockIds[i]))
        .run();
    }
  });
}
