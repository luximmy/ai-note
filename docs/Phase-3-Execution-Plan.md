# 阶段三执行清单（质量收敛与可扩展性）

> 更新时间：2026-04-29  
> 目标：在阶段二功能闭环已达成的基础上，完成工程质量收口，并为真实后端接入做好协议与观测准备。

## P0（本周必须完成）

1. **类型收敛：Schema 源头与动态注册表边界** ✅
   - 目标文件：`src/types/index.ts`、`src/components/editor/BlockRenderer.tsx`、`src/components/editor/blocks/GenerativeUIBlock.tsx`
   - 完成状态：`BlockRenderer` 通过映射类型约束注册表，动态分发豁免压缩到 `React.ElementType` 单一调用点；`GenerativeUIBlock` 导出 `KNOWN_COMPONENT_IDS` 白名单，新增 `sanitizeProps` 运行时防护，移除所有 `as any` 断言。
   - 交付标准：已达成。Schema 源头使用 `Record<string, unknown>`；白名单与 props 防护已落地。

2. **保存链路可观测性** ✅
   - 目标：为”提交成功/失败/回滚/乱序丢弃”增加统一事件埋点接口（先 mock sink，再接真实平台）。
   - 完成状态：已新增 `src/lib/telemetry.ts`，定义 `SaveEvent` 类型与 `emitSaveEvent` 函数；`BlockRenderer` 中所有 console 日志已替换为结构化事件，支持 success/failure/rollback/out_of_order 四种事件类型。
   - 交付标准：已达成。异常事件包含 `noteId`、`blockId`、`seq`、`error` 字段。

## P1（阶段内完成）

3. **真实后端协议草案**
   - 输出文档：请求载荷、版本字段、冲突策略、幂等键、错误码约定。
   - 交付标准：`src/actions/note.ts` 可按开关切换 Mock/真实实现而不改调用方。

4. **Generative UI 安全与回归**
   - 目标：为组件注册表增加白名单与未知组件降级策略测试。
   - 交付标准：对未知 `componentId`、异常 `props`、错误状态均有可预期 UI。

## P2（持续优化）

5. **端到端编辑流验证**
   - 场景：跨区块快速编辑、路由切换中断、失败回滚、刷新后状态一致性。
   - 交付标准：形成可重复执行的 E2E 用例集。

## 负责人建议

- **编辑器链路 owner**：任务 1、2、4
- **数据协议 owner**：任务 3
- **测试与质量 owner**：任务 5
