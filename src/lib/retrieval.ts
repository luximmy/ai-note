// src/lib/retrieval.ts
// Semantic vector search using DashScope Qwen3 Embedding

import type { SearchResultFragment } from '@/types';
import { semanticSearch } from './embedding-store';

/**
 * Search across all documents for blocks relevant to the query.
 * Uses semantic vector search with DashScope embeddings.
 * Returns top-K results sorted by relevance score descending.
 */
export async function searchNotes(
  query: string,
  topK: number = 5,
): Promise<SearchResultFragment[]> {
  if (!query || !query.trim()) return [];
  return semanticSearch(query, topK);
}
