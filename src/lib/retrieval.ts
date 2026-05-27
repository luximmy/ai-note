// src/lib/retrieval.ts
// Mock TF-IDF keyword search engine for RAG retrieval.
// Lightweight, Edge Runtime compatible, stateless per request.

import { Document, SearchResultFragment } from '@/types';

/**
 * Tokenize text into searchable terms.
 * CJK characters become individual tokens; English words are lowercased (>=2 chars).
 * Wikilink syntax [[...]] is stripped to plain title.
 */
function tokenize(text: string): string[] {
  if (!text) return [];

  const cleaned = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
  const tokens: string[] = [];
  const re = /[一-鿿]|[a-zA-Z0-9]+/g;
  let match;
  while ((match = re.exec(cleaned)) !== null) {
    const t = match[0].toLowerCase();
    if (t.length >= 2 || /[一-鿿]/.test(t)) {
      tokens.push(t);
    }
  }
  return tokens;
}

/**
 * Compute TF-IDF score for a block against a query.
 */
function scoreBlock(
  queryTokens: string[],
  blockTokens: string[],
  idf: Map<string, number>,
): number {
  if (blockTokens.length === 0 || queryTokens.length === 0) return 0;

  const termFreq = new Map<string, number>();
  for (const t of blockTokens) {
    termFreq.set(t, (termFreq.get(t) || 0) + 1);
  }

  let score = 0;
  for (const qt of queryTokens) {
    const tf = (termFreq.get(qt) || 0) / blockTokens.length;
    const idfVal = idf.get(qt) || 0;
    score += tf * idfVal;
  }
  return score;
}

/**
 * Search across all documents for blocks relevant to the query.
 * Uses TF-IDF keyword scoring. Returns top-K results sorted by score descending.
 */
export async function keywordSearch(
  query: string,
  documents: Document[],
  topK: number = 5,
): Promise<SearchResultFragment[]> {
  // Simulate network latency (200ms, 0% failure — search should not randomly fail)
  await new Promise((r) => setTimeout(r, 200));

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Build corpus: collect all searchable blocks with their tokens
  const corpus: {
    blockId: string;
    noteId: string;
    noteTitle: string;
    content: string;
    tokens: string[];
  }[] = [];

  for (const doc of documents) {
    for (const block of doc.blocks) {
      if (!block.content) continue; // skip generative_ui and empty blocks
      const tokens = tokenize(block.content);
      if (tokens.length === 0) continue;
      corpus.push({
        blockId: block.id,
        noteId: doc.id,
        noteTitle: doc.title,
        content: block.content,
        tokens,
      });
    }
  }

  if (corpus.length === 0) return [];

  // Compute IDF: log(total_blocks / blocks_containing_term)
  const idf = new Map<string, number>();
  const docFreq = new Map<string, number>();
  for (const entry of corpus) {
    const seen = new Set(entry.tokens);
    for (const t of seen) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }
  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log(corpus.length / freq));
  }

  // Score all blocks and sort
  const scored = corpus
    .map((entry) => ({
      blockId: entry.blockId,
      noteId: entry.noteId,
      noteTitle: entry.noteTitle,
      content: entry.content.length > 200 ? entry.content.slice(0, 200) + '...' : entry.content,
      score: scoreBlock(queryTokens, entry.tokens, idf),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}
