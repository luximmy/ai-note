# 2026-05-15 工作日志

## 优化与修复

### AI 局部重写体验优化 ✅

**目标**：解决选区检测闪烁与改写时"空白等待"体验问题。

**实现内容**：

1. **选区防抖（`RichTextEditor.tsx`）**
   - 新增 `selectionTimerRef` + 300ms 防抖：选区变化时立即隐藏菜单（防止拖拽闪烁），300ms 后才检测选区并决定是否弹出
   - 替换原来的一次性检测逻辑，避免快速拖拽时菜单反复闪烁

2. **延迟删除 + Loading 态（`RichTextEditor.tsx`）**
   - `handleRewrite` 不再立即 `deleteRange` 删除原文，改为先弹出 `toast.loading('✨ AI 正在思考，请稍候...')`
   - 仅在收到第一波 chunk 数据时才删除旧文字并关闭 loading，用户不会看到空白闪烁
   - 错误路径同步 `toast.dismiss(toastId)` 清理 loading 状态

**技术决策**：
- 300ms 防抖时间：平衡响应速度与防抖效果，用户短暂停留即触发，快速拖拽不会误触
- 延迟删除策略：避免网络延迟期间用户看到选区文字突然消失的"惊吓感"

---

## 完成任务

### 任务 4.2：AI 局部重写 ✅

**目标**：在编辑器中实现选中文字 → 浮现工具栏 → AI 流式原位改写，复用现有 Tiptap + streaming 基础设施。

**实现内容**：

1. **`/api/rewrite` Route Handler（新建）**
   - Edge Runtime + `streamText` 调用 DeepSeek API
   - 接收 `{ text, instruction, context }` 参数
   - system prompt 约束 AI 只输出改写文本，不附带解释、不包裹代码块
   - `temperature: 0.3` 保证改写稳定性

2. **`RewriteToolbar` 浮动工具栏（新建）**
   - `createPortal` 挂载至 `document.body`，定位在选区正上方
   - 四个快捷指令：智能润色、扩写段落、精简提炼、翻译为英文
   - 自定义指令输入框，支持回车提交
   - `onMouseDown` 阻止冒泡，防止点击菜单时 Tiptap 丢失选区

3. **`RichTextEditor` 选区检测与流式替换（修改）**
   - 新增 `rewriteMenuState` 管理工具栏的开/关、坐标、选中文本及位置
   - `editor.on('selectionUpdate')` 监听选区变化：有选区时提取纯文本 + 计算屏幕坐标 → 打开工具栏；无选区时关闭
   - `handleRewrite`：关闭菜单 → `deleteRange` 删除原文 → `fetch('/api/rewrite')` 发起流式请求 → 逐 chunk `insertContent` 打字机式插入 → 完成后触发保存同步 + toast；失败时 toast 提示用户 Ctrl+Z 撤销

4. **Zustand Store 扩展（修改）**
   - 新增 `RewriteTarget` 类型与 `rewriteTarget` 状态字段
   - 新增 `setRewriteTarget` 方法，预留跨组件协调改写目标的能力

**技术决策**：
- 流式原位替换策略：先删除原文再逐 token 插入，利用 Tiptap 的 transaction API 保证原子性
- 改写 API 独立于 `/api/chat`：system prompt、temperature、错误语义均与对话不同，隔离更清晰
- 工具栏用 `createPortal` 渲染，避免被编辑器的 `overflow: hidden` 裁剪

---

# 2026-05-14 工作日志

## 完成任务

### 任务 4.1：Block 删除 + 拖拽排序 ✅

**目标**：在编辑器中实现 Block 级别的拖拽重排和删除功能，沿用已有的双缓冲 + 回滚架构。

**实现内容**：

1. **依赖安装**
   - 新增 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`

2. **`SortableBlockItem` 组件（新建）**
   - 基于 `useSortable` 的包裹组件，为每个 Block 提供拖拽手柄（左侧 GripVertical 图标，hover 显示）和删除按钮（右侧 Trash2 图标，hover 显示）
   - 拖拽时自动提升层级 + 降低透明度的视觉反馈
   - 最后一个 Block 时隐藏删除按钮（`isOnlyBlock` 防护）

3. **`BlockRenderer` DnD 集成（修改）**
   - `DndContext` + `SortableContext` 包裹整个渲染循环
   - `PointerSensor` 设置 `distance: 5px` 激活约束，保护富文本选区不被拖拽误触
   - `DragOverlay` 实现悬浮预览层，带有弹簧回弹动画和毛玻璃阴影效果
   - `handleDragEnd`：`arrayMove` 本地乐观重排 → `reorderBlocksAction` 服务端同步 → 失败回滚
   - `handleDeleteBlock`：本地乐观移除 → `deleteBlockAction` 服务端同步 → 失败回滚

4. **Server Actions（修改）**
   - `deleteBlockAction(noteId, blockId)`：从 mock 数据中过滤删除目标 Block
   - `reorderBlocksAction(noteId, blockIds[])`：按传入 ID 数组重排 mock 数据的 blocks
   - 两个 Action 均沿用 `simulateNetwork` 模式（500ms 延迟 + 15% 失败率）

**技术决策**：
- 选择 `@dnd-kit` 而非 `react-beautiful-dnd`：体积小、无障碍优先、维护活跃、原生支持虚拟化
- 拖拽与删除均复用已有的双缓冲 + 回滚架构（乐观更新 → 服务端确认 → 推进快照 / 失败回滚）

## 文档更新

- `docs/Current-Status.md`：标记任务 4.1 完成，更新当前重心为 4.2（AI 局部重写）
- `docs/Phase-4-Execution-Plan.md`：标记 P0 完成，补充交付物清单，更新依赖关系图

## 下一步

- 任务 4.2（P1）：AI 局部重写 — 选中文字 → 浮现工具栏 → AI 流式原位改写
- 任务 4.3（P2）：知识网络 — `[[wikilink]]` 双向链接 + 力导向图谱可视化
