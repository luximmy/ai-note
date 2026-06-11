// src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient, Client } from '@libsql/client';
import * as schema from './schema';

// 扩展 NodeJS 全局类型，防止 TypeScript 报错
declare global {
  var _libsqlClient: Client | undefined;
}

let client: Client;

// 根据环境变量动态决定是否使用单例
if (process.env.NODE_ENV === 'production') {
  // 生产环境（Vercel Serverless）：每个无服务器实例独享一个客户端，直接创建
  client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
} else {
  // 本地开发环境：使用全局对象缓存，防止 HMR 热更新导致无限创建连接
  if (!globalThis._libsqlClient) {
    globalThis._libsqlClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }
  client = globalThis._libsqlClient;
}

// 导出单例 Drizzle 实例
export const db = drizzle(client, { schema });

// 线上数据库已经有表结构和数据了，不需要再每次连接时建表和 seed
export function ensureSeeded() {
  console.log('[DB] Connected to Turso.');
}
