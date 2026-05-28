# AI 与 RAG 架构

> 更新时间：2026-05-28

## 1. 概述

项目有三条 AI 能力线：

| 能力 | 实现方式 | 入口 |
|------|---------|------|
| **AI 聊天** | DeepSeek streaming + 笔记上下文注入 | `/api/chat` → `ChatPanel` |
| **AI 局部重写** | DeepSeek streaming + 选区替换 | `/api/rewrite` → `RewriteToolbar` |
| **RAG 语义检索** | Qwen3 Embedding + 余弦相似度 | `embedding-store.ts` → `retrieval.ts` |

## 2. AI 聊天链路

### 2.1 数据流

```
用户输入 → ChatPanel.sendMessage()
  → POST /api/chat { messages, noteContext }
    → 提取最后一条用户消息作为 RAG query
    → semanticSearch(query, 5) → SearchResultFragment[]
    → 构建 system prompt（含检索结果 + 引用规则 + 笔记上下文）
    → streamText(DeepSeek) → 流式响应
    → createUIMessageStream 注入 data-citations part
  → ChatPanel 解析 [N] 标记 → CitationChip + CitationSources
```

### 2.2 上下文注入

`BlockRenderer` 通过 `useEffect` 实时将区块内容序列化为纯文本（`stripHtml` 清理 HTML），写入 Zustand `noteContext`。`ChatPanel` 发送消息时通过 `body.noteContext` 传给 API Route。

### 2.3 AI → 编辑器插入

ChatPanel 内置 **Markdown-to-Blocks 解析引擎**：
- JSON 代码块 → `generative_ui` 区块
- 代码块 → `code` 区块
- `#` 标题 → `heading` 区块
- `- [ ]` / `- [x]` → `todo` 区块
- 其他 → `paragraph` 区块

解析后通过 Zustand `pendingInsertBlocks` 事件总线派发，`BlockRenderer` 监听并批量调用 `addBlockAction` 插入。

### 2.4 Generative UI 联动

AI system prompt 引导返回结构化 JSON：
```json
{ "componentId": "TaskBoard", "props": { "tasks": [...] } }
```

`GenerativeUIBlock` 根据 `componentId` 渲染对应组件（`TaskBoard` 等），支持通过 `onUpdateProps` 回调将用户交互同步回编辑器 attributes。

## 3. AI 局部重写

### 3.1 数据流

```
用户选中文字 → selectionUpdate (300ms 防抖)
  → RewriteToolbar 浮现（扩写/精简/翻译/自定义）
  → POST /api/rewrite { text, instruction, context }
  → 流式接收 → 逐块 insertContent（<br> 换行保持实时反馈）
  → 流结束后 deleteRange + insertContentAt 用 <p> HTML 替换
  → onUpdateRef.current(editor.getHTML()) 触发保存
```

### 3.2 段落处理

- **流式阶段**：每个 chunk 的换行转 `<br>` 后 `insertContent`，保持实时视觉反馈
- **流结束后**：删除已插入内容，用正确的 `<p>` HTML 重新插入，确保持久化后段落不丢失

## 4. RAG 语义检索架构

### 4.1 系统组成

```
src/lib/embedding.ts       ← DashScope Qwen3 Embedding 客户端
src/lib/embedding-store.ts ← 向量存储 + 余弦相似度 + backfill + 语义搜索
src/lib/retrieval.ts       ← searchNotes() 对外接口
src/db/schema.ts           ← block_embeddings 表定义
src/db/queries.ts          ← block 写入时触发 embedAndStoreBlock (fire-and-forget)
```

### 4.2 Embedding 流程

**模型**：Qwen3 `text-embedding-v3` via DashScope OpenAI 兼容 API
- 端点：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 维度：1024
- 需要 `DASHSCOPE_API_KEY` 环境变量

**文本预处理**：
1. `stripHtml(content)` — 去除 HTML 标签
2. `replace(/\[\[([^\]]+)\]\]/g, '$1')` — 去除 wikilink 语法
3. `slice(0, 8000)` — 截断防超限

**存储**：`Float32Array` → `Buffer` → SQLite BLOB（4KB/行）

### 4.3 搜索流程

```
用户提问 → semanticSearch(query, topK)
  → embedText(query) → 1024 维 query 向量
  → 加载 block_embeddings 全表
  → 遍历计算余弦相似度
  → 排序取 top-K
  → 关联 block content + document metadata
  → 返回 SearchResultFragment[]
```

**性能**：500 blocks × 1024 维余弦相似度 < 5ms（纯 JS 计算）。

### 4.4 增量更新策略

| 触发时机 | 行为 | 模式 |
|---------|------|------|
| 区块保存 (`updateBlock`) | 内容变更后重新 embed | fire-and-forget |
| 区块创建 (`addBlock`) | 新区块 embed | fire-and-forget |
| 区块删除 (`deleteBlock`) | CASCADE 自动删除 + 显式删除 | 同步 |
| 服务器启动 | backfillMissingEmbeddings() | 幂等批量 |

**Fire-and-forget**：embedding API 调用 200-500ms，不阻塞用户保存操作。失败后下次启动 backfill 重试。

### 4.5 从 TF-IDF 到语义搜索

| 维度 | TF-IDF（旧） | 语义搜索（新） |
|------|-------------|--------------|
| 匹配方式 | 关键词字面匹配 | 向量余弦相似度 |
| "乐观更新" → "optimistic state" | 找不到 | 能找到 |
| "编辑器崩溃" → "容灾演练" | 找不到 | 能找到 |
| 索引方式 | 无索引，每次实时计算 | 预计算 embedding 存 DB |
| 依赖 | 无 | DashScope API Key |

## 5. 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `DEEPSEEK_API_KEY` | AI 聊天 + 重写 | 是 |
| `DASHSCOPE_API_KEY` | Qwen3 Embedding 语义搜索 | 是（无 key 则 RAG 降级为空结果） |

## 6. 注意事项

- `/api/chat` 使用 Node.js runtime（非 Edge），因为 better-sqlite3 需要原生模块
- `/api/rewrite` 仍使用 Edge Runtime（不访问数据库）
- embedding 存储在 SQLite 中，随数据库文件一起备份/迁移
- 更换 embedding 模型需要清空 `block_embeddings` 表重新 backfill
