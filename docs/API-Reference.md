# API 参考

> 更新时间：2026-05-29

## 1. Server Actions

定义在 `src/actions/note.ts`，通过 `'use server'` 指令暴露为服务端函数。客户端组件直接调用，无需 fetch。所有操作均需登录（通过 `getSession()` 验证），未登录时抛出 `'未登录'` 错误。

### 1.1 createNote

```ts
createNote(title?: string, emoji?: string): Promise<{ id: string }>
```

创建新笔记。自动生成 UUID，同时创建一个默认空段落区块。

- **参数**：`title` — 标题（默认 `'无标题笔记'`）；`emoji` — 图标（可选）
- **返回**：新笔记的 `{ id }`
- **调用方**：`AppShell` 侧边栏的"新建笔记"按钮

### 1.2 deleteNote

```ts
deleteNote(id: string): Promise<boolean>
```

删除笔记及其所有区块（CASCADE 级联删除 embedding）。

- **参数**：`id` — 笔记 ID
- **返回**：`true`（成功）；笔记不存在时返回 `false`
- **调用方**：`AppShell` 侧边栏的删除按钮

### 1.3 updateNote

```ts
updateNote(id: string, updates: { title?: string; emoji?: string }): Promise<boolean>
```

更新笔记标题和/或图标。

- **参数**：`id` — 笔记 ID；`updates` — 要更新的字段
- **返回**：`true`（成功）；笔记不存在时返回 `false`
- **调用方**：`NoteHeader` 的标题编辑和 Emoji 选择器

### 1.4 getNoteById

```ts
getNoteById(id: string): Promise<Document>
```

获取单篇笔记详情（含所有 blocks）。

- **参数**：`id` — 笔记 ID（如 `'doc_001'`）
- **返回**：完整的 `Document` 对象
- **错误**：笔记不存在时抛出 `'404 - 笔记未找到'`
- **调用方**：`app/app/note/[id]/page.tsx`（Server Component）

### 1.5 updateBlockAction

```ts
updateBlockAction(noteId: string, blockId: string, updatedBlock: Partial<Block>): Promise<{ success: boolean; timestamp: number }>
```

更新区块内容。触发 embedding 重新计算（fire-and-forget）。

- **调用方**：`BlockRenderer` 的防抖保存链路

### 1.6 addBlockAction

```ts
addBlockAction(noteId: string, afterBlockId: string, newBlock: Block): Promise<{ success: boolean; blockId: string; timestamp: number }>
```

在指定区块后插入新区块。触发 embedding 计算。

- **调用方**：`BlockRenderer` 的斜杠指令插入、AI → 编辑器插入

### 1.7 deleteBlockAction

```ts
deleteBlockAction(noteId: string, blockId: string): Promise<{ success: boolean; timestamp: number }>
```

删除区块。CASCADE 自动删除关联的 embedding。

- **调用方**：`SortableBlockItem` 的删除按钮

### 1.8 reorderBlocksAction

```ts
reorderBlocksAction(noteId: string, blockIds: string[]): Promise<{ success: boolean; timestamp: number }>
```

按传入的 ID 顺序重新排列区块。

- **调用方**：`BlockRenderer` 的 `handleDragEnd`

### 1.9 getGraphData

```ts
getGraphData(): Promise<GraphData>
```

获取知识图谱数据（节点 + 边）。遍历所有文档的 blocks，解析 `[[wikilink]]` 构建图。

- **返回**：`{ nodes: GraphNode[], edges: GraphEdge[] }`
- **调用方**：`app/app/graph/page.tsx`

### 1.10 getBacklinksForNote

```ts
getBacklinksForNote(noteId: string): Promise<Wikilink[]>
```

获取指定笔记的所有反向链接。

- **返回**：`Wikilink[]`（包含来源笔记 ID、标题、上下文预览）
- **调用方**：`BacklinksPanel`

## 2. API Routes

### 2.1 POST /api/auth/login

用户登录。验证邮箱密码后设置 JWT cookie。

**请求体**：
```ts
{
  email: string;
  password: string;
}
```

**响应**：
- 成功：`{ success: true, user: { id, email, name } }` + Set-Cookie
- 失败：`{ error: string }` + 400/401/500

### 2.2 POST /api/auth/register

用户注册。创建用户并自动接管默认种子文档。

**请求体**：
```ts
{
  email: string;      // 必须包含 @
  password: string;   // 至少 8 字符
  name: string;       // 非空
}
```

**响应**：
- 成功：`{ success: true, user: { id, email, name } }` + Set-Cookie
- 失败：`{ error: string }` + 400/409/500

### 2.3 GET /api/auth/me

获取当前登录用户信息。通过 JWT cookie 验证。

**响应**：
- 成功：`{ user: { id, email, name } }`
- 未登录：`{ error: '未登录' }` + 401

### 2.4 POST /api/auth/logout

登出。清除 session cookie。

**响应**：`{ success: true }`

### 2.5 POST /api/chat

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

### 2.6 POST /api/rewrite

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

### 2.7 POST /api/generate-ui

AI 组件生成 streaming 端点。Node.js Runtime。根据用户描述生成可交互 React 组件的 JSON 配置。

**请求体**：
```ts
{
  prompt: string;        // 用户描述（如"创建一个任务看板"）
  noteContext?: string;  // 当前笔记上下文（可选）
}
```

**处理流程**：
1. 构建 system prompt，定义 4 种可用组件（TaskBoard、DataTable、MermaidDiagram、Timeline）的 JSON schema
2. `streamText(DeepSeek)` 流式输出 JSON 配置
3. 客户端 `GenerativeUIBlock` 解析 JSON 并渲染对应组件

**响应**：纯文本流（`toTextStreamResponse`），内容为 JSON 代码块。

### 2.8 GET /api/chat/sessions

获取当前用户的所有聊天会话列表（按 `updatedAt` 降序）。

**响应**：`{ sessions: ChatSession[] }`

### 2.9 POST /api/chat/sessions

创建新的聊天会话。

**请求体**：`{ title?: string }`（默认 `'新对话'`）

**响应**：`{ id: string, title: string }`

### 2.10 GET /api/chat/sessions/[id]

获取单个会话详情（验证归属权）。

**响应**：`{ session: ChatSession }`

### 2.11 PATCH /api/chat/sessions/[id]

更新会话标题。

**请求体**：`{ title: string }`

**响应**：`{ success: true }`

### 2.12 DELETE /api/chat/sessions/[id]

删除会话及其所有消息（CASCADE）。

**响应**：`{ success: true }`

### 2.13 GET /api/chat/sessions/[id]/messages

获取会话的所有消息（按 `createdAt` 升序）。

**响应**：`{ messages: ChatMessage[] }`

### 2.14 POST /api/chat/sessions/[id]/messages

向会话添加一条消息。

**请求体**：`{ role: string, content: object }`

**响应**：`{ id: string }`

## 3. 数据访问层 (queries.ts)

`src/db/queries.ts` 提供的函数供 Server Actions 和 API Routes 调用：

**用户相关**：

| 函数 | 签名 | 说明 |
|------|------|------|
| `createUser(id, email, passwordHash, name, now)` | `→ void` | 创建用户 |
| `getUserByEmail(email)` | `→ User \| undefined` | 邮箱查找 |
| `getUserById(id)` | `→ User \| undefined` | ID 查找 |
| `migrateDefaultUserDocuments(userId)` | `→ number` | 接管默认文档，返回迁移数量 |

**文档相关**：

| 函数 | 签名 | 说明 |
|------|------|------|
| `getAllDocumentsMeta(userId)` | `→ Pick<Document, 'id'\|'title'\|'emoji'>[]` | 侧边栏列表 |
| `getDocumentById(id, userId)` | `→ Document \| null` | 含 blocks + 空 backlinks |
| `getAllDocumentsWithBlocks(userId)` | `→ Document[]` | 全量扫描 |
| `createDocument(id, userId, title, emoji?)` | `→ void` | 创建文档 + 默认空段落 |
| `deleteDocument(id, userId)` | `→ boolean` | 删除文档 + CASCADE |
| `updateDocument(id, userId, updates)` | `→ boolean` | 更新标题/图标 |
| `updateBlock(noteId, blockId, updates)` | `→ void` | 更新 + 触发 embed |
| `addBlock(noteId, afterBlockId, newBlock)` | `→ void` | 插入 + 触发 embed |
| `deleteBlock(noteId, blockId)` | `→ void` | 删除 + 清理 embed |
| `reorderBlocks(noteId, blockIds[])` | `→ void` | 事务内批量更新 position |

**聊天相关**：

| 函数 | 签名 | 说明 |
|------|------|------|
| `createChatSession(id, userId, title)` | `→ void` | 创建会话 |
| `getChatSessions(userId)` | `→ ChatSession[]` | 获取用户所有会话 |
| `getChatSession(id, userId)` | `→ ChatSession \| undefined` | 获取单个会话 |
| `updateChatSessionTitle(id, userId, title)` | `→ void` | 重命名会话 |
| `deleteChatSession(id, userId)` | `→ boolean` | 删除会话 + 所有消息 |
| `addChatMessage(id, sessionId, role, content)` | `→ void` | 添加消息 |
| `getChatMessages(sessionId)` | `→ ChatMessage[]` | 获取会话所有消息 |

## 4. 搜索接口 (retrieval.ts)

```ts
searchNotes(query: string, topK?: number): Promise<SearchResultFragment[]>
```

语义向量搜索。内部调用 `embedding-store.semanticSearch`。

- **query**：用户提问文本
- **topK**：返回结果数（默认 5）
- **返回**：`SearchResultFragment[]`（含 blockId, noteId, score, content, noteTitle）
