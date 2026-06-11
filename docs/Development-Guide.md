# 开发指南

> 更新时间：2026-05-29

## 1. 环境准备

### 1.1 前置条件

- Node.js >= 18
- pnpm（项目统一包管理器）

### 1.2 安装依赖

```bash
pnpm install
```

首次安装时 `better-sqlite3` 需要编译原生模块，pnpm 会自动处理（已在 `package.json` 的 `pnpm.onlyBuiltDependencies` 中配置）。

### 1.3 环境变量

复制 `.env.example` 为 `.env.local`，填入 API Key：

```bash
cp .env.example .env.local
```

| 变量 | 获取方式 | 用途 |
|------|---------|------|
| `DEEPSEEK_API_KEY` | [DeepSeek Platform](https://platform.deepseek.com/) | AI 聊天 + 重写 + 组件生成 |
| `DASHSCOPE_API_KEY` | [DashScope 控制台](https://dashscope.console.aliyun.com/) | 语义向量检索 |
| `AUTH_SECRET` | 自定义（任意随机字符串） | JWT 签名/验证密钥 |

### 1.4 启动开发服务器

```bash
pnpm dev
```

首次启动时会自动：
1. 创建 `data/ai-note.db` 数据库
2. 建表（users, documents, blocks, block_embeddings, chat_sessions, chat_messages — 共 6 张）
3. 运行数据迁移（添加 user_id 列、创建默认用户）
4. 填充 9 篇种子文档（关联 `user_default` 用户）
5. 为所有区块生成 embedding（需要 DASHSCOPE_API_KEY）
6. 首个注册用户自动接管种子文档

## 2. 项目结构

```
src/
├── actions/           # Server Actions（note.ts — 10 个函数：CRUD + 图谱 + 反链）
├── app/
│   ├── (auth)/        # 认证页面（login, register）
│   ├── api/
│   │   ├── auth/      # 认证接口（login, register, me, logout）
│   │   ├── chat/      # AI 聊天 streaming 端点 + 会话/消息 CRUD
│   │   ├── generate-ui/ # AI 组件生成 streaming 端点
│   │   └── rewrite/   # AI 局部重写 streaming 端点
│   └── app/
│       ├── layout.tsx  # Server Component — 认证检查 + 从 DB 获取文档列表
│       ├── page.tsx    # 仪表盘（提示选择笔记）
│       ├── graph/      # 知识图谱全屏页面
│       └── note/[id]/  # 笔记详情页
├── components/
│   ├── ai/            # ChatPanel, CitationChip, CitationSources, InsertPreview, TaskBoard, DataTable, MermaidDiagram, Timeline
│   ├── editor/        # BlockRenderer, RichTextEditor, SlashMenu, RewriteToolbar, SortableBlockItem
│   │   ├── blocks/    # ParagraphBlock, HeadingBlock, CodeBlock, TodoBlock, GenerativeUIBlock
│   │   └── extensions/# wikilink-decoration (ProseMirror 插件)
│   ├── knowledge/     # GraphView (d3-force), BacklinksPanel
│   ├── layout/        # AppShell (Client Component)
│   └── ui/            # shadcn/ui 组件
├── db/                # 数据库层（SQLite + Drizzle ORM）
│   ├── schema.ts      # Drizzle 表定义（6 张表）
│   ├── index.ts       # 连接单例 (globalThis) + 自动建表
│   ├── queries.ts     # 数据访问层（用户 + 文档 + 区块 + 聊天）
│   ├── migrate.ts     # 数据迁移脚本（user_id 列、默认用户）
│   ├── seed.ts        # 幂等 seed 脚本
│   └── seed-data.ts   # 种子数据（9 篇文档）
├── lib/               # 工具函数
│   ├── auth.ts        # JWT 认证（jose + bcryptjs）
│   ├── embedding.ts   # DashScope Qwen3 embedding 客户端
│   ├── embedding-store.ts # 向量存储与余弦相似度搜索
│   ├── retrieval.ts   # searchNotes() 搜索接口
│   ├── parse-markdown-to-blocks.ts # Markdown → Block 解析引擎
│   ├── strip-html.ts  # HTML ↔ 纯文本转换
│   ├── wikilink-parser.ts # [[wikilink]] 解析
│   └── telemetry.ts   # 保存事件埋点
├── store/             # Zustand 全局状态
└── types/             # TypeScript 接口定义
```

## 3. 常用命令

| 命令 | 用途 |
|------|------|
| `pnpm dev` | 启动开发服务器（默认 http://localhost:3000） |
| `pnpm build` | 生产构建（含 TypeScript 类型检查） |
| `pnpm test` | 运行测试（Vitest） |
| `pnpm test:watch` | 测试监听模式 |
| `pnpm lint` | ESLint 检查 |

## 4. 测试

### 4.1 测试框架

- **Vitest** — 测试运行器
- **@testing-library/react** — 组件测试
- **jsdom** — DOM 环境模拟

### 4.2 测试文件

```
src/app/app/note/[id]/
├── error.test.tsx                    # 错误边界组件测试
└── loading.test.tsx                  # 加载态组件测试

src/components/editor/__tests__/
└── BlockRenderer.test.tsx            # 保存成功/失败回滚

src/components/editor/blocks/__tests__/
└── GenerativeUIBlock.utils.test.ts   # sanitizeProps + extractJsonFromStream（19 case）

src/components/editor/blocks/
└── GenerativeUIBlock.test.tsx        # streaming/error/未知组件/异常 props

src/lib/__tests__/
├── strip-html.test.ts                # stripHtml/markdownToHtml/ensureHtml（29 case）
├── parse-markdown-to-blocks.test.ts  # Markdown → Block 解析（30 case）
├── embedding-store.test.ts           # cosine/vecToBuffer/bufferToVec（11 case）
└── wikilink-parser.test.ts           # 12 个用例覆盖解析逻辑
```

### 4.3 运行测试

```bash
pnpm test           # 单次运行
pnpm test:watch     # 监听模式
```

## 5. 数据库管理

### 5.1 重置数据库

```bash
rm data/ai-note.db
pnpm dev  # 自动重建 + seed
```

### 5.2 查看数据

使用 Drizzle Studio：
```bash
npx drizzle-kit studio
```

或直接用 SQLite 客户端：
```bash
sqlite3 data/ai-note.db
```

### 5.3 Schema 变更

修改 `src/db/schema.ts` 后，`src/db/index.ts` 中的 `CREATE TABLE IF NOT EXISTS` 会在下次启动时自动创建新表。对于已有表的列变更，需要手动迁移或重建数据库。

## 6. 部署

### 6.1 Vercel 部署

项目已配置 Vercel 部署。环境变量需在 Vercel 控制台设置：
- `DEEPSEEK_API_KEY`
- `DASHSCOPE_API_KEY`
- `AUTH_SECRET`

**注意**：Vercel 的 Serverless 环境是无状态的，SQLite 文件会在每次冷启动时重建。生产环境应考虑使用持久化数据库（如 Turso/libsql）。

### 6.2 构建检查

提交前运行：
```bash
pnpm build && pnpm test
```

确保 TypeScript 类型检查和测试全部通过。

## 7. 常见问题

**Q: 启动时报 `SQLITE_BUSY`**
A: 关闭其他正在运行的 dev server 实例。SQLite 单写锁，多进程同时打开会冲突。

**Q: embedding backfill 失败**
A: 检查 `DASHSCOPE_API_KEY` 是否正确配置。无 key 时 backfill 静默失败，AI 聊天的 RAG 检索会返回空结果。

**Q: 段落分隔消失**
A: 确保使用最新代码。旧版本用 `getText()` 保存纯文本，新版本用 `getHTML()` 保存 HTML。加载时 `ensureHtml()` 会自动转换旧数据。

**Q: Tiptap 编辑器类型报错**
A: 确保 `@tiptap/*` 全家桶版本一致（当前为 3.23.6）。运行 `pnpm install` 重新对齐。
