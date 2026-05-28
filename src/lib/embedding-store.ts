// src/lib/embedding-store.ts
// Vector storage, cosine similarity, and semantic search over SQLite

import { db } from '@/db';
import { blockEmbeddings, blocks, documents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { embedText, embedBatch } from './embedding';
import { stripHtml } from './strip-html';
import type { SearchResultFragment } from '@/types';

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Helpers ───

function vecToBuffer(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

function bufferToVec(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

function prepareText(content: string): string {
  const plain = stripHtml(content).replace(/\[\[([^\]]+)\]\]/g, '$1');
  return plain.slice(0, 8000);
}

// ─── Storage ───

export async function storeEmbedding(
  blockId: string,
  vec: Float32Array,
): Promise<void> {
  const existing = db
    .select()
    .from(blockEmbeddings)
    .where(eq(blockEmbeddings.blockId, blockId))
    .get();

  if (existing) {
    db.update(blockEmbeddings)
      .set({ embedding: vecToBuffer(vec), updatedAt: Date.now() })
      .where(eq(blockEmbeddings.blockId, blockId))
      .run();
  } else {
    db.insert(blockEmbeddings)
      .values({ blockId, embedding: vecToBuffer(vec), updatedAt: Date.now() })
      .run();
  }
}

export async function embedAndStoreBlock(
  blockId: string,
  content: string,
): Promise<void> {
  if (!content || !content.trim()) return;
  const text = prepareText(content);
  if (!text) return;
  const vec = await embedText(text);
  await storeEmbedding(blockId, vec);
}

// ─── Backfill ───

export async function backfillMissingEmbeddings(): Promise<number> {
  const allBlocks = db
    .select({ id: blocks.id, content: blocks.content })
    .from(blocks)
    .all()
    .filter((b) => b.content && b.content.trim());

  const existing = db
    .select({ blockId: blockEmbeddings.blockId })
    .from(blockEmbeddings)
    .all();
  const existingSet = new Set(existing.map((r) => r.blockId));

  const missing = allBlocks.filter((b) => !existingSet.has(b.id));
  if (missing.length === 0) return 0;

  console.log(`[Embedding] Backfilling ${missing.length} blocks...`);
  const texts = missing.map((b) => prepareText(b.content!));
  const vectors = await embedBatch(texts);

  for (let i = 0; i < missing.length; i++) {
    await storeEmbedding(missing[i].id, vectors[i]);
  }

  console.log(`[Embedding] Backfill complete: ${missing.length} blocks embedded.`);
  return missing.length;
}

// ─── Search ───

export async function semanticSearch(
  query: string,
  topK: number = 5,
): Promise<SearchResultFragment[]> {
  if (!query || !query.trim()) return [];

  const queryVec = await embedText(query);

  const rows = db
    .select({
      blockId: blockEmbeddings.blockId,
      embedding: blockEmbeddings.embedding,
    })
    .from(blockEmbeddings)
    .all();

  if (rows.length === 0) return [];

  const scored = rows.map((row) => ({
    blockId: row.blockId,
    score: cosine(queryVec, bufferToVec(row.embedding as Buffer)),
  }));

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, topK);

  // Enrich with block content and document metadata
  const fragments: SearchResultFragment[] = [];
  for (const result of topResults) {
    const blockRow = db
      .select()
      .from(blocks)
      .where(eq(blocks.id, result.blockId))
      .get();
    if (!blockRow || !blockRow.content) continue;

    const docRow = db
      .select()
      .from(documents)
      .where(eq(documents.id, blockRow.documentId))
      .get();
    if (!docRow) continue;

    const plainContent = stripHtml(blockRow.content);
    fragments.push({
      blockId: result.blockId,
      noteId: blockRow.documentId,
      score: result.score,
      content:
        plainContent.length > 200
          ? plainContent.slice(0, 200) + '...'
          : plainContent,
      noteTitle: docRow.title,
    });
  }

  return fragments;
}
