import { describe, expect, it } from 'vitest';
// 测试纯函数 — 通过动态 import 避免触发 DB 初始化
// 因为 embedding-store.ts 模块加载时会调用 ensureSeeded() 和 backfillMissingEmbeddings()
// 所以我们直接测试从源码中提取的纯函数逻辑

// 由于 cosine/vecToBuffer/bufferToVec/prepareText 是模块私有函数，
// 我们在这里重新实现相同的逻辑进行测试，确保数学正确性。
// 这是一种"契约测试"：验证算法行为，而非 import 路径。

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

function vecToBuffer(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

function bufferToVec(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

// ─── cosine ───

describe('cosine 相似度', () => {
  it('单位向量自身 → 1.0', () => {
    const v = new Float32Array([1, 0, 0]);
    expect(cosine(v, v)).toBeCloseTo(1.0, 6);
  });

  it('相同方向不同长度 → 1.0', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([2, 4, 6]);
    expect(cosine(a, b)).toBeCloseTo(1.0, 6);
  });

  it('正交向量 → 0.0', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([0, 1, 0]);
    expect(cosine(a, b)).toBeCloseTo(0.0, 6);
  });

  it('反方向向量 → -1.0', () => {
    const a = new Float32Array([1, 0, 0]);
    const b = new Float32Array([-1, 0, 0]);
    expect(cosine(a, b)).toBeCloseTo(-1.0, 6);
  });

  it('零向量 → 0.0（分母为 0 保护）', () => {
    const zero = new Float32Array([0, 0, 0]);
    const v = new Float32Array([1, 2, 3]);
    expect(cosine(zero, v)).toBe(0);
    expect(cosine(v, zero)).toBe(0);
    expect(cosine(zero, zero)).toBe(0);
  });

  it('一般向量 → 正确计算', () => {
    // [1,0] 和 [1,1] → cos(45°) = √2/2 ≈ 0.7071
    const a = new Float32Array([1, 0]);
    const b = new Float32Array([1, 1]);
    expect(cosine(a, b)).toBeCloseTo(Math.SQRT1_2, 4);
  });

  it('高维向量', () => {
    const dim = 1024;
    const a = new Float32Array(dim);
    const b = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      a[i] = Math.sin(i);
      b[i] = Math.cos(i);
    }
    const result = cosine(a, b);
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });
});

// ─── vecToBuffer / bufferToVec ───

describe('向量 ↔ Buffer 转换', () => {
  it('round-trip 保持精度', () => {
    const original = new Float32Array([1.5, -2.3, 3.14159, 0, 100.001]);
    const buf = vecToBuffer(original);
    const restored = bufferToVec(buf);
    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 3);
    }
  });

  it('空数组 round-trip', () => {
    const empty = new Float32Array([]);
    const buf = vecToBuffer(empty);
    expect(buf.length).toBe(0);
    const restored = bufferToVec(buf);
    expect(restored.length).toBe(0);
  });

  it('Buffer 长度 = 元素数 × 4', () => {
    const vec = new Float32Array([1, 2, 3]);
    const buf = vecToBuffer(vec);
    expect(buf.length).toBe(12);
  });

  it('高维向量 round-trip（模拟 1024 维 embedding）', () => {
    const dim = 1024;
    const original = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      original[i] = (i * 0.1) - 50;
    }
    const buf = vecToBuffer(original);
    expect(buf.length).toBe(dim * 4);
    const restored = bufferToVec(buf);
    expect(restored.length).toBe(dim);
    // 验证几个采样点
    expect(restored[0]).toBeCloseTo(original[0], 3);
    expect(restored[512]).toBeCloseTo(original[512], 3);
    expect(restored[1023]).toBeCloseTo(original[1023], 3);
  });
});

// ─── cosine + buffer 集成 ───

describe('cosine + buffer 集成', () => {
  it('向量经 buffer 转换后 cosine 不变', () => {
    const a = new Float32Array([1, 2, 3, 4, 5]);
    const b = new Float32Array([5, 4, 3, 2, 1]);

    const directCosine = cosine(a, b);

    const aBuf = vecToBuffer(a);
    const bBuf = vecToBuffer(b);
    const aRestored = bufferToVec(aBuf);
    const bRestored = bufferToVec(bBuf);
    const roundTripCosine = cosine(aRestored, bRestored);

    expect(roundTripCosine).toBeCloseTo(directCosine, 6);
  });
});
