// src/lib/embedding.ts
// DashScope Qwen3 Embedding client via OpenAI-compatible API

import { createOpenAI } from '@ai-sdk/openai';
import { embed } from 'ai';

const dashscope = createOpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.DASHSCOPE_API_KEY || '',
});

const embeddingModel = dashscope.embedding('text-embedding-v3');

/**
 * Generate an embedding vector for a single text string.
 * Returns a Float32Array of 1024 dimensions.
 */
export async function embedText(text: string): Promise<Float32Array> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return new Float32Array(embedding);
}

/**
 * Generate embeddings for a batch of texts.
 * Processes in chunks to respect API rate limits.
 */
export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  const BATCH_SIZE = 6;
  const results: Float32Array[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const chunk = texts.slice(i, i + BATCH_SIZE);
    const chunkResults = await Promise.all(chunk.map((t) => embedText(t)));
    results.push(...chunkResults);

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
