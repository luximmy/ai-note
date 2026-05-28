# 数据库架构：SQLite + Drizzle ORM

> 更新时间：2026-05-28

## 1. 概述

项目使用 SQLite 文件数据库（`data/ai-note.db`）作为持久化层，通过 Drizzle ORM 进行类型安全的数据库操作。数据库在首次启动时自动创建表结构并填充种子数据。

| 特性 | 选择 | 原因 |
|------|------|------|
| 数据库 | SQLite | 零基础设施依赖，文件级部署，单用户 demo 足够 |
| ORM | Drizzle ORM | 轻量、类型安全、零运行时开销 |
| 驱动 | better-sqlite3 | 同步 API，性能最优 |
| 日志模式 | WAL | 支持读写并发，提升构建时多 worker 访问稳定性 |

## 2. 表结构 (Schema)

定义在 `src/db/schema.ts`，共三张表：

### 2.1 documents 表

```sql
CREATE TABLE documents (
  id          TEXT PRIMARY KEY,        -- 如 'doc_001'
  title       TEXT NOT NULL,
  emoji       TEXT,                    -- 如 '🧠'
  cover_image TEXT,
  tags        TEXT,                    -- JSON 序列化的 string[]
  last_accessed_at INTEGER NOT NULL    -- Unix 时间戳 (ms)
);
```

### 2.2 blocks 表

```sql
CREATE TABLE blocks (
  id          TEXT PRIMARY KEY,        -- 如 'blk_1'
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,           -- 'paragraph'|'heading'|'code'|'todo'|'generative_ui'
  position    INTEGER NOT NULL,        -- 0-based 排序
  parent_id   TEXT,                    -- 预留嵌套，当前未使用
  content     TEXT,                    -- 文本内容（HTML 格式）
  attributes  TEXT,                    -- JSON 序列化的类型专属字段
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  author_id   TEXT                     -- 预留多用户，当前未使用
);
```

**content 字段格式**：自段落持久化修复后，content 存储 HTML（`<p>` 标签保留段落结构）。加载时通过 `ensureHtml()` 向后兼容旧的纯文本数据。

**attributes 字段**：按 block type 序列化不同的 JSON 结构：
- `paragraph`: `{ textAlign?: 'left'|'center'|'right' }`
- `heading`: `{ level: 1|2|3, textAlign? }`
- `code`: `{ language: string, isExecuting?: boolean }`
- `todo`: `{ checked: boolean }`
- `generative_ui`: `{ componentId, status, props, rawResponse? }`

### 2.3 block_embeddings 表

```sql
CREATE TABLE block_embeddings (
  block_id   TEXT PRIMARY KEY REFERENCES blocks(id) ON DELETE CASCADE,
  embedding  BLOB NOT NULL,           -- Float32Array 序列化为 Buffer (1024 维 × 4 字节 = 4KB)
  updated_at INTEGER NOT NULL
);
```

用于语义向量检索。每个有文本内容的 block 对应一行 embedding 向量。

## 3. 连接管理

`src/db/index.ts` 使用 **globalThis 单例模式**：

```ts
const globalForDb = globalThis as unknown as {
  __aiNoteDb: ReturnType<typeof drizzle>;
  __aiNoteSqlite: Database.Database;
  __aiNoteSeeded: boolean;
};
```

**为什么用 globalThis？** Next.js build 时使用 10 个 worker 并发，每个 worker 独立导入模块。如果不共享连接，多个 worker 同时打开同一个 SQLite 文件会导致 `SQLITE_BUSY`。globalThis 单例确保同一进程中只有一个数据库连接。

**初始化流程**：
1. 打开 `data/ai-note.db`
2. 设置 WAL 模式 + 外键约束 + busy_timeout 10s
3. 执行 `CREATE TABLE IF NOT EXISTS` 建表（幂等）
4. 导出 `db` (Drizzle 实例) 和 `ensureSeeded()` 函数

## 4. 数据访问层

`src/db/queries.ts` 集中所有数据库操作，返回值匹配 `src/types/index.ts` 接口：

| 函数 | 用途 | 调用方 |
|------|------|--------|
| `getAllDocumentsMeta()` | 侧边栏列表（id/title/emoji） | layout.tsx, note page |
| `getDocumentById(id)` | 详情页（含 blocks + backlinks） | Server Action |
| `getAllDocumentsWithBlocks()` | 图谱全量扫描 | getGraphData, getBacklinksForNote |
| `updateBlock(noteId, blockId, updates)` | 区块编辑 | Server Action |
| `addBlock(noteId, afterBlockId, newBlock)` | 区块插入 | Server Action |
| `deleteBlock(noteId, blockId)` | 区块删除 | Server Action |
| `reorderBlocks(noteId, blockIds[])` | 拖拽排序 | Server Action |

**反序列化**：`dbRowToBlock(row)` 根据 `type` 列将 JSON `attributes` 还原为正确的 Block 联合类型。

## 5. Seed 机制

`src/db/seed.ts` 从 `src/db/seed-data.ts`（原 `mock/data.ts`）读取种子数据，在 `ensureSeeded()` 中调用。

- **幂等**：检查 `SELECT count(*) FROM documents`，有数据则跳过
- **原子性**：整个插入过程在一个事务中执行
- **自动触发**：`queries.ts` 模块加载时调用 `ensureSeeded()`

## 6. Embedding 存储与搜索

详见 `docs/AI-RAG-Architecture.md`。

## 7. 注意事项

- `data/` 目录已加入 `.gitignore`，数据库文件不提交到 Git
- 删除 `data/ai-note.db` 后重启会自动重建并重新 seed
- `better-sqlite3` 是原生 Node.js 模块，不兼容 Edge Runtime（`/api/chat` 已改为 Node.js runtime）
