# 阶段四执行清单：交互深化与知识网络

> 更新时间：2026-05-13
> 目标：深化编辑器交互体验（拖拽排序、区块删除）与 AI 能力（局部重写），并引入知识网络（MOC + 图谱可视化），使项目达到面试可讲、Demo 可演的完整形态。
> 完成状态的权威记录见 `docs/Current-Status.md`，本文档侧重执行计划、依赖关系与面试讲点。

## P0：Block 删除 + 拖拽排序（任务 4.1）

### 目标

- 实现 Block 级别拖拽重排（`@dnd-kit/sortable`）
- 实现 Block 删除（hover 菜单 + 删除按钮）
- 复用现有双缓冲 + 回滚架构，保证乐观更新与失败恢复

### 目标文件

| 文件 | 变更 |
|------|------|
| `src/actions/note.ts` | 新增 `deleteBlockAction` + `reorderBlocksAction` |
| `src/components/editor/BlockRenderer.tsx` | 包裹 `DndContext` + `SortableContext`，新增删除 handler 与 reorder 乐观更新 |
| `src/components/editor/blocks/*.tsx` | 新增拖拽手柄 + 删除按钮（hover 显示） |
| `package.json` | 新增 `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` |

### 实现步骤

1. **Server Actions**：`deleteBlockAction(noteId, blockId)` 与 `reorderBlocksAction(noteId, blockIds[])`，沿用 `simulateNetwork` 模式
2. **BlockRenderer DnD 集成**：`DndContext` + `SortableContext` 包裹渲染循环，`onDragEnd` 时 `arrayMove` 本地重排 + 乐观更新 + 服务端同步 + 失败回滚
3. **Block 组件交互层**：拖拽手柄（grip icon，左侧 hover 显示）+ 删除按钮（trash icon，右侧 hover 显示），删除触发乐观移除 + 服务端同步
4. **边界防护**：最后一个 Block 不可删除；拖拽手柄不干扰富文本选区

### 面试讲点

- "为什么选 @dnd-kit？" — 无障碍优先、体积小、维护活跃、原生支持虚拟化列表
- "拖拽如何应对网络失败？" — 与编辑保存相同的双缓冲 + 回滚架构，本地先动，服务端确认后推进快照

---

## P1：AI 局部重写（任务 4.2）

### 目标

- 选中文字 → 浮现工具栏 → 选择改写指令（扩写/精简/翻译/自定义）
- AI 流式返回改写结果，实时替换选区文字
- 复用现有 Tiptap + streaming 基础设施

### 目标文件

| 文件 | 变更 |
|------|------|
| `src/components/editor/RichTextEditor.tsx` | 监听 `selectionUpdate`，检测选区 → 触发浮动工具栏 |
| `src/components/editor/RewriteToolbar.tsx` | **新建** — 浮动工具栏（扩写/精简/翻译/自定义输入） |
| `src/app/api/rewrite/route.ts` | **新建** — 改写专用 API Route（Edge Runtime + streamText） |
| `src/components/editor/blocks/ParagraphBlock.tsx` | 透传 `onRewrite` 回调至 RichTextEditor |
| `src/components/editor/blocks/HeadingBlock.tsx` | 同上 |
| `src/store/index.ts` | 新增 `rewriteTarget` 状态（跨组件协调改写目标） |

### 实现步骤

1. **选区检测**：`editor.on('selectionUpdate')` + `editor.state.doc.textBetween(from, to)` 提取选中文字
2. **浮动工具栏**：定位在选区附近，提供"扩写/精简/翻译/自定义"四个指令按钮
3. **改写 API Route**：`/api/rewrite`，system prompt 仅返回改写文本，不附带解释；接收 `{ text, instruction, context }`
4. **流式原位替换**：token 到达时用 `editor.chain().deleteRange().insertContent()` 原子替换；完成后走 `updateBlockData` 持久化；失败时恢复原文 + toast
5. **Accept/Reject（可选增强）**：改写完成后高亮新文本，用户可确认或撤销

### 面试讲点

- "流式替换不会破坏编辑器吗？" — Tiptap 的 transaction API 支持原子内容替换，最终结果走防抖保存，不会打乱 save pipeline
- "为什么单独一个 API Route？" — 改写的 system prompt、token 限制、错误语义都与 chat 不同，隔离更清晰

---

## P2：知识网络 — MOC + 图谱（任务 4.3）

### 目标

- 支持 `[[笔记标题]]` 双向链接语法
- 力导向图谱可视化（`d3-force`）
- 反向链接面板（当前笔记被哪些笔记引用）

### 目标文件

| 文件 | 变更 |
|------|------|
| `src/types/index.ts` | 新增 `Wikilink` 接口，`Document` 扩展 `wikilinks` 字段 |
| `src/mock/data.ts` | 补充 wikilink 样例数据 |
| `src/lib/wikilink-parser.ts` | **新建** — `[[title]]` 正则解析 + targetId 解析 |
| `src/components/editor/RichTextEditor.tsx` | 自定义 Tiptap 扩展：`[[...]]` 语法高亮 + 点击跳转 |
| `src/components/knowledge/GraphView.tsx` | **新建** — `d3-force` 力导向图谱 |
| `src/components/knowledge/BacklinksPanel.tsx` | **新建** — 反向链接面板 |
| `src/app/app/graph/page.tsx` | **新建** — 全屏图谱页面 |
| `src/app/app/layout.tsx` | 侧边栏新增图谱入口 |
| `package.json` | 新增 `d3-force` + `@types/d3-force` |

### 实现步骤

1. **数据模型**：`Wikilink { sourceId, targetId, sourceTitle, targetTitle, contextPreview }`；mock 数据中 2-3 篇文档互相引用
2. **解析器**：`parseWikilinks(content)` — 正则 `/\[\[([^\]]+)\]\]/g`，每次保存时重算文档的 wikilinks
3. **Tiptap 扩展**：识别 `[[...]]` 渲染为可点击链接，支持自动补全下拉
4. **图谱可视化**：`d3-force` 布局，节点 = 文档（大小按反向链接数加权），边 = wikilinks；点击节点跳转
5. **反向链接面板**：展示引用当前笔记的所有文档，含上下文预览

### 面试讲点

- "为什么用力导向图？" — 聚类自然涌现，无需手动分类；节点大小反映知识密度
- "断链怎么处理？" — 无匹配目标的 wikilink 渲染为图谱中的"幽灵节点"，提示用户创建笔记

---

## 依赖关系

```
✅ 3.7 (部署) ──→ 4.1 (拖拽 + 删除) ──→ 4.2 (局部重写)
                                        ──→ 4.3 (MOC + 图谱)
```

4.2 与 4.3 相互独立，可并行推进。
