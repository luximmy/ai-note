# MVP 规格说明：斜杠指令菜单与区块插入

> 创建时间：2026-05-07
> 目标：补齐画布核心创作能力——用户可通过斜杠指令菜单（Slash Commands）新建任意类型区块，使笔记从"可编辑"升级为"可创作"。

## 1. 背景与动机

### 1.1 现状缺口

当前编辑器已具备区块渲染、防抖保存、失败回滚等完整编辑链路，但存在一个根本性限制：**无法通过 UI 创建新区块**。

- `RichTextEditor` 的 placeholder `输入内容，或输入 "/" 唤起菜单...` 仅为静态文本。
- 所有区块均来自 `src/mock/data.ts` 的初始数据，用户无法主动添加 Heading、Todo、Code 或 Generative UI 区块。
- 画布的内容创作流是断裂的——可以编辑已有内容，但无法从零构建文档。

### 1.2 MVP 定位

本 MVP 是 PRD 3.1 核心画布中"斜杠指令（规划中）"的首次落地，同时也是后续"拖拽排序"和"AI Agent 交互"的前置依赖。优先级高于阶段三的质量收歛建设（类型安全、可观测性），因为后者优化的是工程质量，而本 MVP 解锁的是产品核心功能。

## 2. 功能范围

### 2.1 In Scope（本次交付）

| 功能 | 描述 |
|------|------|
| 斜杠触发 | 在 `RichTextEditor` 中输入 `/` 键，弹出悬浮菜单 |
| 菜单导航 | 支持键盘上下键移动高亮、回车选中、Escape 关闭 |
| 区块插入 | 选中菜单项后，在当前区块后方插入对应类型的新区块 |
| 区块类型覆盖 | Paragraph、Heading (H1/H2)、Todo、Code、Generative UI |
| 乐观插入 | 新区块立即出现在 UI，后台通过 `addBlockAction` 持久化 |
| 失败回滚 | 插入失败时移除临时区块，toast 提示，与现有回滚机制一致 |
| 焦点转移 | 新区块创建后自动获得焦点（文本类区块聚焦编辑器） |
| Heading/Code 可编辑化 | 将当前只读的 `HeadingBlock` 和 `CodeBlock` 升级为可编辑 |

### 2.2 Out of Scope（后续迭代）

- 拖拽排序（PRD 3.1 规划中）
- 菜单模糊搜索 / 过滤
- 区块嵌套（parentId 逻辑）
- 真实后端接入（当前仍为 Mock-First）
- 移动端适配

## 3. 技术设计

### 3.1 组件架构

```
BlockRenderer (insertBlock 调度)
  └── Block 组件 (ParagraphBlock / HeadingBlock / ...)
        └── RichTextEditor (Tiptap + Suggestion 扩展)
              └── SlashMenu (悬浮 UI，Portal 渲染)
```

### 3.2 Tiptap 扩展：`/` 键拦截

在 `RichTextEditor` 中引入 Tiptap 的 `Suggestion` 扩展（或自定义 `Extension`），监听 `/` 字符输入：

- **触发条件**：用户在空段落或行首输入 `/`，或在任意位置输入 `/` 后紧跟空格不成立时直接触发。
- **位置计算**：使用 Tiptap 的 `editor.view.coordsAtPos()` 获取光标屏幕坐标，传递给 `SlashMenu` 定位。
- **关闭逻辑**：输入非 `/` 字符、点击外部、按 Escape 或选中菜单项后关闭。

### 3.3 SlashMenu 组件

- **渲染方式**：`createPortal` 到 `document.body`，避免被编辑器 `overflow` 裁剪。
- **交互**：键盘上下键导航（循环）、回车选中、Escape 关闭、鼠标悬浮高亮 + 点击选中。
- **菜单位置**：基于光标坐标定位，自动检测边界翻转（下方空间不足时向上展开）。
- **初始数据**：已有 `SlashMenuItem[]` 配置，包含 6 个菜单项（paragraph, heading×2, todo, code, generative_ui）。

### 3.4 区块插入调度

在 `BlockRenderer` 中新增 `insertBlock(afterBlockId: string, newBlock: Block)` 方法：

1. **生成临时 ID**：`crypto.randomUUID()` 或 `nanoid()`。
2. **乐观更新**：在 `blocks` 数组中找到 `afterBlockId` 的 index，在其后插入新区块。
3. **同步更新 `safeSnapshot`**：插入操作是原子的，不走防抖，直接同步两个 buffer。
4. **焦点转移**：通过 `autoFocusToken`（递增计数器）通知目标区块的 `RichTextEditor` 在 mount 时 grab focus。
5. **持久化**：调用 `addBlockAction(noteId, newBlock)`，成功后用返回的真实 ID 替换临时 ID；失败则移除临时区块并 rollback。

### 3.5 Server Action：`addBlockAction`

在 `src/actions/note.ts` 中新增：

```ts
export async function addBlockAction(
  noteId: string,
  afterBlockId: string,
  newBlock: Block
): Promise<{ success: boolean; blockId: string; timestamp: number }>
```

- Mock 行为：模拟 500ms 延迟，15% 失败率（与 `updateBlockAction` 一致）。
- 成功时：将 `newBlock` 插入 `mockDocuments` 中对应 note 的 `blocks` 数组。
- 返回值：`blockId` 用于替换临时 ID，`timestamp` 用于 `safeSnapshot` 对齐。

### 3.6 HeadingBlock / CodeBlock 可编辑化

当前这两个区块是只读渲染，插入后用户无法编辑内容。需要：

- **HeadingBlock**：根据 `attributes.level` 渲染对应 heading 标签，内部嵌入 `RichTextEditor` 或 `contentEditable`，支持文本输入并通过 `onUpdate` 同步。
- **CodeBlock**：渲染 `<pre><code>` 区域可编辑，至少支持纯文本输入（语法高亮为后续优化）。

## 4. 数据流

```
用户输入 "/"
  → Tiptap Suggestion 检测到触发字符
  → 读取光标坐标，打开 SlashMenu
  → 用户选择菜单项（键盘或鼠标）
  → SlashMenu 调用 onSelect(item)
  → RichTextEditor 转发事件给 Block 组件
  → Block 组件调用 BlockRenderer.insertBlock(currentBlockId, newBlock)
  → 乐观更新：blocks 数组立即插入新区块
  → 焦点转移到新区块的 RichTextEditor
  → 调用 addBlockAction(noteId, afterBlockId, newBlock)
  → 成功：替换临时 ID，advance safeSnapshot
  → 失败：移除临时区块，rollback blocks，toast.error，router.refresh()
```

## 5. 任务拆解与交付标准

### Task 1：SlashMenu 组件（UI 层）

- **目标文件**：`src/components/editor/SlashMenu.tsx`
- **已有基础**：初始实现已存在（含菜单数据、键盘监听、基础渲染）
- **待完成**：
  - [ ] `createPortal` 渲染到 `document.body`
  - [ ] 基于传入 `position` 的绝对定位 + 边界翻转
  - [ ] 鼠标悬浮高亮与点击选中
  - [ ] 打开时重置 `selectedIndex` 到 0
- **交付标准**：可独立展示，键盘 + 鼠标交互均正常，脱离编辑器可单独测试。

### Task 2：Tiptap `/` 键拦截与 Suggestion 集成

- **目标文件**：`src/components/editor/RichTextEditor.tsx`
- **待完成**：
  - [ ] 引入或自定义 Tiptap Suggestion 扩展
  - [ ] 监听 `/` 触发，计算光标坐标，传递给 `SlashMenu`
  - [ ] 处理关闭逻辑（Escape、外部点击、选中后）
  - [ ] 选中菜单项后清除 `/` 字符并触发回调
- **交付标准**：在 RichTextEditor 中输入 `/` 可弹出菜单，选中后正确回调，不影响现有编辑和保存链路。

### Task 3：区块插入调度（BlockRenderer 层）

- **目标文件**：`src/components/editor/BlockRenderer.tsx`
- **待完成**：
  - [ ] 新增 `insertBlock(afterBlockId, newBlock)` 方法
  - [ ] 乐观更新 `blocks` 和 `safeSnapshot`
  - [ ] `autoFocusToken` 机制：新区块 mount 时自动聚焦
  - [ ] 集成 `addBlockAction`，处理成功（替换临时 ID）和失败（回滚）
  - [ ] 请求序号纳入现有 `requestSeqRef` 体系
- **交付标准**：从 UI 触发到 Mock 持久化，形成完整的乐观插入 + 失败回滚闭环。

### Task 4：`addBlockAction` Server Action

- **目标文件**：`src/actions/note.ts`
- **待完成**：
  - [ ] 新增 `addBlockAction(noteId, afterBlockId, newBlock)` 函数
  - [ ] Mock 延迟与失败率配置（与 `updateBlockAction` 对齐）
  - [ ] 在 `mockDocuments` 中正确插入区块
- **交付标准**：调用方可获得 `success`、`blockId`、`timestamp` 返回值。

### Task 5：HeadingBlock / CodeBlock 可编辑化

- **目标文件**：`src/components/editor/blocks/HeadingBlock.tsx`、`CodeBlock.tsx`
- **待完成**：
  - [ ] HeadingBlock：按 `level` 渲染 heading 标签，内嵌可编辑区域
  - [ ] CodeBlock：`<pre><code>` 区域可编辑，支持纯文本输入
  - [ ] 两者均接入 `onUpdate` 回调，融入现有保存链路
  - [ ] 保持 `forceSyncToken` 回滚能力
- **交付标准**：插入 Heading/Code 区块后可立即输入内容，内容可保存。

### Task 6：集成测试与文档更新

- **待完成**：
  - [ ] 为 `insertBlock` 和 `addBlockAction` 编写单元测试
  - [ ] 更新 `Current-Status.md` 记录 MVP 完成状态
  - [ ] 更新 `Data-Schema.md` 如有类型变更
- **交付标准**：测试覆盖成功插入、失败回滚、焦点转移三条核心路径。

## 6. 依赖与风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Tiptap Suggestion 扩展与现有 IME 处理冲突 | 中文输入时斜杠误触发或 compositionend 异常 | 在 `isComposingRef` 为 true 时跳过 Suggestion 触发 |
| `createPortal` 在 SSR 环境报错 | 页面 hydration 失败 | `SlashMenu` 组件内做 `typeof document` 守卫，或确保仅客户端渲染 |
| Heading/Code 可编辑化引入新的 `onUpdate` 路径 | 可能与现有防抖/回滚逻辑不兼容 | 复用 `updateBlockData` 回调，不引入新路径 |
| 临时 ID 替换时序问题 | 用户在 ID 替换前快速编辑新区块导致更新丢失 | 替换 ID 时同步更新 `pendingUpdatesRef` 和 `timersRef` 中的 key |

## 7. 与阶段三任务的关系

本 MVP 完成后，阶段三任务优先级需重新排序：

| 原任务 | 影响 | 新优先级 |
|--------|------|----------|
| 4.1 类型收敛 | SlashMenu 引入新的 `SlashMenuItem` 类型，需纳入收敛范围 | P0（并行） |
| 4.2 可观测性 | `insertBlock` 引入新的成功/失败路径，需补充埋点 | P1（MVP 后） |
| 4.3 后端协议 | `addBlockAction` 需纳入协议草案 | P1（MVP 后） |
| 4.4 Generative UI 安全 | SlashMenu 中的 AI 组件入口需与白名单策略对齐 | P1（并行） |
| 4.5 端到端测试 | MVP 新增的插入流需纳入 E2E 覆盖 | P2 |
