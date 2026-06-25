## Context

Web 端消息标注 UI 已经接入共享 annotation catalog，并在选择器中按消息类型过滤。移动端当前只有 `useSendRoomMessageMutation` 的 `SendMessageContext.annotations` 字段，聊天输入区没有选择入口，消息列表也不展示已有标注。

移动端输入链路还会把一次发送拆成多条 draft：文本、图片、音频、视频可能共用同一 composer 状态。若不按每条 draft 的 `messageType` 过滤，会把 BGM、背景、视频控制等不适用标注写入错误消息类型。

## Goals / Non-Goals

**Goals:**
- 移动端聊天输入区提供轻量 annotation picker。
- picker 使用共享 catalog，并按当前待发送消息类型筛选。
- 发送时保留 web 侧的新语义：调用方选择的是意图，最终写入每条消息前按消息类型再过滤。
- 移动端消息列表展示已有 annotations，包含未知 annotation 的可读 fallback。

**Non-Goals:**
- 不在移动端实现 WebGAL 实时预览或完整 tooltip 文档。
- 不恢复 web 已删除的 Gal Copilot / AI authoring 模块。
- 不改变后端 message schema 或上传 API。

## Decisions

1. **选择器使用 BottomSheetModal，而不是常驻组件。**  
   原因：移动端屏幕空间有限，annotation catalog 项较多，按需打开可以减少聊天主路径渲染成本。替代方案是在 composer 内展开完整列表，但会挤压输入区并影响键盘场景。

2. **catalog 数据从 `@tuanchat/domain/annotation-catalog` 读取。**  
   原因：web 端已把 `messageTypes` 语义推进到共享 domain；移动端不应维护第二份业务真相。移动端只保留 RN 布局分组 helper。

3. **发送前对每条 draft 再执行过滤。**  
   原因：附件发送会拆出不同 `messageType`，composer 级筛选只能表达“当前选择上下文”，不能保证每个 draft 都适用。最终写入前过滤可以避免错误 annotation 持久化。

4. **消息列表只展示 chip，不提供列表内编辑。**  
   原因：移动端长按菜单已承载回复、编辑、删除、线索等操作；列表内编辑 annotation 会增加误触和状态复杂度。后续如需要，可在消息操作菜单里单独扩展。

## Risks / Trade-offs

- [Risk] web 与 mobile 的 picker 分组 helper 存在少量重复。→ 只重复 UI 分组，不重复 catalog 数据；后续可把布局 helper 下沉到 domain 或 shared UI 包。
- [Risk] 当前选择上下文无法完美预测混合附件发送。→ 最终按 draft `messageType` 过滤，保证持久化数据正确。
- [Risk] 移动端无法展示 web tooltip 的完整 WebGAL 行为说明。→ chip 显示 label/category/id，满足移动端识别需求；详细文档继续以 web 为主。
