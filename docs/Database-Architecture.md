# 数据库架构：SQLite + Drizzle ORM

> 更新时间：2026-05-29

## 1. 概述

项目使用 SQLite 文件数据库（`data/ai-note.db`）作为持久化层，通过 Drizzle ORM 进行类型安全的数据库操作。数据库在首次启动时自动创建表结构并填充种子数据。

| 特性 | 选择 | 原因 |
|------|------|------|
| 数据库 | SQLite | 零基础设施依赖，文件级部署，单用户 demo 足够 |
| ORM | Drizzle ORM | 轻量、类型安全、零运行时开销 |
| 驱动 | better-sqlite3 | 同步 API，性能最优 |
| 日志模式 | WAL | 支持读写并发，提升构建时多 worker 访问稳定性 |

## 2. 表结构 (Schema)

定义在 `src/db/schema.ts`，共六张表：

### 2.1 users 表

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,           -- bcryptjs 哈希
  name          TEXT NOT NULL,
  created_at    INTEGER NOT NULL,        -- Unix 时间戳 (ms)
  updated_at    INTEGER NOT NULL
);
```

用户账户表。密码使用 bcryptjs（salt rounds = 10）哈希存储。认证采用 JWT（jose 库），token 有效期 7 天，通过 httpOnly cookie 传递。

### 2.2 documents 表

```sql
CREATE TABLE documents (
  id          TEXT PRIMARY KEY,        -- 如 'doc_001'
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  emoji       TEXT,                    -- 如 '🧠'
  cover_image TEXT,
  tags        TEXT,                    -- JSON 序列化的 string[]
  last_accessed_at INTEGER NOT NULL    -- Unix 时间戳 (ms)
);
```

`user_id` 为外键，关联 `users` 表，实现多用户数据隔离。删除用户时 CASCADE 级联删除其所有文档。

### 2.3 blocks 表

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

### 2.4 block_embeddings 表

```sql
CREATE TABLE block_embeddings (
  block_id   TEXT PRIMARY KEY REFERENCES blocks(id) ON DELETE CASCADE,
  embedding  BLOB NOT NULL,           -- Float32Array 序列化为 Buffer (1024 维 × 4 字节 = 4KB)
  updated_at INTEGER NOT NULL
);
```

用于语义向量检索。每个有文本内容的 block 对应一行 embedding 向量。

### 2.5 chat_sessions 表

```sql
CREATE TABLE chat_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

AI 聊天会话元数据。每个用户可创建多个独立对话，按 `updated_at` 降序排列展示。

### 2.6 chat_messages 表

```sql
CREATE TABLE chat_messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,              -- 'user' | 'assistant'
  content    TEXT NOT NULL,              -- JSON 序列化的消息 parts
  created_at INTEGER NOT NULL
);
```

聊天消息记录。`content` 存储 JSON 序列化的消息内容（支持文本、引用等多种 part 类型）。删除会话时 CASCADE 级联删除所有消息。

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
3. 执行 `CREATE TABLE IF NOT EXISTS` 建表（幂等，共 6 张表）
4. 运行 `src/db/migrate.ts` 迁移脚本（为已有数据库添加 `user_id` 列、创建默认用户等）
5. 导出 `db` (Drizzle 实例) 和 `ensureSeeded()` 函数

## 4. 数据访问层

`src/db/queries.ts` 集中所有数据库操作，返回值匹配 `src/types/index.ts` 接口：

**用户相关**：

| 函数 | 用途 | 调用方 |
|------|------|--------|
| `createUser(id, email, passwordHash, name, now)` | 注册新用户 | /api/auth/register |
| `getUserByEmail(email)` | 邮箱查找用户 | /api/auth/login, /api/auth/register |
| `getUserById(id)` | ID 查找用户 | /api/auth/me |
| `migrateDefaultUserDocuments(userId)` | 将默认用户文档迁移至新用户 | /api/auth/register |

**文档相关**（均需 `userId` 参数实现数据隔离）：

| 函数 | 用途 | 调用方 |
|------|------|--------|
| `getAllDocumentsMeta(userId)` | 侧边栏列表（id/title/emoji） | layout.tsx |
| `getDocumentById(id, userId)` | 详情页（含 blocks + backlinks） | Server Action |
| `getAllDocumentsWithBlocks(userId)` | 图谱全量扫描 | getGraphData, getBacklinksForNote |
| `createDocument(id, userId, title, emoji?)` | 创建文档（含默认空段落） | Server Action |
| `deleteDocument(id, userId)` | 删除文档（CASCADE 级联） | Server Action |
| `updateDocument(id, userId, updates)` | 更新标题/图标 | Server Action |
| `updateBlock(noteId, blockId, updates)` | 区块编辑 | Server Action |
| `addBlock(noteId, afterBlockId, newBlock)` | 区块插入 | Server Action |
| `deleteBlock(noteId, blockId)` | 区块删除 | Server Action |
| `reorderBlocks(noteId, blockIds[])` | 拖拽排序 | Server Action |

**聊天相关**：

| 函数 | 用途 | 调用方 |
|------|------|--------|
| `createChatSession(id, userId, title)` | 创建聊天会话 | /api/chat/sessions |
| `getChatSessions(userId)` | 获取用户所有会话列表 | /api/chat/sessions |
| `getChatSession(id, userId)` | 获取单个会话详情 | /api/chat/sessions/[id] |
| `updateChatSessionTitle(id, userId, title)` | 重命名会话 | /api/chat/sessions/[id] |
| `deleteChatSession(id, userId)` | 删除会话及所有消息 | /api/chat/sessions/[id] |
| `addChatMessage(id, sessionId, role, content)` | 添加聊天消息 | /api/chat/sessions/[id]/messages |
| `getChatMessages(sessionId)` | 获取会话所有消息 | /api/chat/sessions/[id]/messages |

**反序列化**：`dbRowToBlock(row)` 根据 `type` 列将 JSON `attributes` 还原为正确的 Block 联合类型。

## 5. 数据迁移

`src/db/migrate.ts` 处理已有数据库的 schema 变更：

- 为 `documents` 表添加 `user_id` 列（如不存在）
- 创建默认用户 `user_default`，将无主文档关联至该用户
- 首个注册用户通过 `/api/auth/register` 调用 `migrateDefaultUserDocuments()` 自动接管默认文档

迁移在 `src/db/index.ts` 初始化时自动执行，幂等安全。

## 6. Seed 机制

`src/db/seed.ts` 从 `src/db/seed-data.ts` 读取 9 篇种子文档，在 `ensureSeeded()` 中调用。

- **幂等**：检查 `SELECT count(*) FROM documents`，有数据则跳过
- **原子性**：整个插入过程在一个事务中执行
- **自动触发**：`queries.ts` 模块加载时调用 `ensureSeeded()`
- **用户关联**：种子数据默认关联 `user_default` 用户，首个注册用户通过 `migrateDefaultUserDocuments()` 自动接管

## 7. Embedding 存储与搜索

详见 `docs/AI-RAG-Architecture.md`。

## 8. 注意事项

- `data/` 目录已加入 `.gitignore`，数据库文件不提交到 Git
- 删除 `data/ai-note.db` 后重启会自动重建并重新 seed
- `better-sqlite3` 是原生 Node.js 模块，不兼容 Edge Runtime（`/api/chat`、`/api/generate-ui` 使用 Node.js runtime；`/api/rewrite` 使用 Edge runtime 但不访问数据库）
- 认证密钥 `AUTH_SECRET` 必须在 `.env.local` 中配置，否则 JWT 签名/验证会抛异常
