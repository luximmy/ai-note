# API 参考

> 更新时间：2026-05-28

## 1. Server Actions

定义在 `src/actions/note.ts`，通过 `'use server'` 指令暴露为服务端函数。客户端组件直接调用，无需 fetch。

### 1.1 getNoteById

```ts
getNoteById(id: string): Promise<Document>
```

获取单篇笔记详情（含所有 blocks）。

- **参数**：`id` — 笔记 ID（如 `'doc_001'`）
- **返回**：完整的 `Document` 对象
- **错误**：笔记不存在时抛出 `'404 - 笔记未找到'`
- **调用方**：`app/app/note/[id]/page.tsx`（Server Component）

### 1.2 updateBlockAction

```ts
updateBlockAction(noteId: string, blockId: string, updatedBlock: Partial<Block>): Promise<{ success: boolean; timestamp: number }>
```

更新区块内容。触发 embedding 重新计算（fire-and-forget）。

- **调用方**：`BlockRenderer` 的防抖保存链路

### 1.3 addBlockAction

```ts
addBlockAction(noteId: string, afterBlockId: string, newBlock: Block): Promise<{ success: boolean; blockId: string; timestamp: number }>
```

在指定区块后插入新区块。触发 embedding 计算。

- **调用方**：`BlockRenderer` 的斜杠指令插入、AI → 编辑器插入

### 1.4 deleteBlockAction

```ts
deleteBlockAction(noteId: string, blockId: string): Promise<{ success: boolean; timestamp: number }>
```

删除区块。CASCADE 自动删除关联的 embedding。

- **调用方**：`SortableBlockItem` 的删除按钮

### 1.5 reorderBlocksAction

```ts
reorderBlocksAction(noteId: string, blockIds: string[]): Promise<{ success: boolean; timestamp: number }>
```

按传入的 ID 顺序重新排列区块。

- **调用方**：`BlockRenderer` 的 `handleDragEnd`

### 1.6 getGraphData

```ts
getGraphData(): Promise<GraphData>
```

获取知识图谱数据（节点 + 边）。遍历所有文档的 blocks，解析 `[[wikilink]]` 构建图。

- **返回**：`{ nodes: GraphNode[], edges: GraphEdge[] }`
- **调用方**：`app/app/graph/page.tsx`

### 1.7 getBacklinksForNote

```ts
getBacklinksForNote(noteId: string): Promise<Wikilink[]>
```

获取指定笔记的所有反向链接。

- **返回**：`Wikilink[]`（包含来源笔记 ID、标题、上下文预览）
- **调用方**：`BacklinksPanel`

## 2. API Routes

### 2.1 POST /api/chat

AI 聊天 streaming 端点。Node.js Runtime。

**请求体**：
```ts
{
  messages: UIMessage[];     // 聊天历史
  noteContext?: string;      // 当前笔记内容（纯文本）
}
```

**处理流程**：
1. 提取最后一条用户消息作为 RAG query
2. 调用 `searchNotes(query, 5)` 语义检索
3. 构建 system prompt（含检索结果 + 引用规则 + 笔记上下文）
4. `streamText(DeepSeek)` 流式响应
5. 注入 `data-citations` 自定义数据 part

**响应**：`createUIMessageStreamResponse` — 流式 UI 消息，包含文本 parts 和 `data-citations` part。

### 2.2 POST /api/rewrite

AI 局部重写 streaming 端点。Edge Runtime。

**请求体**：
```ts
{
  text: string;          // 选中的文本
  instruction: string;   // 改写指令（"扩写"/"精简"/"翻译"/自定义）
  context?: string;      // 当前笔记上下文
}
```

**响应**：纯文本流（`toTextStreamResponse`）。客户端逐 chunk 接收后拼接为 HTML 段落。

## 3. 数据访问层 (queries.ts)

`src/db/queries.ts` 提供的函数供 Server Actions 和 API Routes 调用：

| 函数 | 签名 | 说明 |
|------|------|------|
| `getAllDocumentsMeta()` | `→ Pick<Document, 'id'\|'title'\|'emoji'>[]` | 侧边栏列表 |
| `getDocumentById(id)` | `→ Document \| null` | 含 blocks + 空 backlinks |
| `getAllDocumentsWithBlocks()` | `→ Document[]` | 全量扫描 |
| `updateBlock(noteId, blockId, updates)` | `→ void` | 更新 + 触发 embed |
| `addBlock(noteId, afterBlockId, newBlock)` | `→ void` | 插入 + 触发 embed |
| `deleteBlock(noteId, blockId)` | `→ void` | 删除 + 清理 embed |
| `reorderBlocks(noteId, blockIds[])` | `→ void` | 事务内批量更新 position |

## 4. 搜索接口 (retrieval.ts)

```ts
searchNotes(query: string, topK?: number): Promise<SearchResultFragment[]>
```

语义向量搜索。内部调用 `embedding-store.semanticSearch`。

- **query**：用户提问文本
- **topK**：返回结果数（默认 5）
- **返回**：`SearchResultFragment[]`（含 blockId, noteId, score, content, noteTitle）
