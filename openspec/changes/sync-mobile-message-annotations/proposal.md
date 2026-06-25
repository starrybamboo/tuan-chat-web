## Why

Web 端消息标注体系已经改为按消息类型筛选和展示，移动端目前只在底层发送 mutation 支持 `annotations` 字段，缺少选择、展示和按消息类型过滤。两端不一致会导致移动端无法正确发送 BGM/背景/立绘/控制类标注，也可能把不适用的标注写到媒体消息上。

## What Changes

- 移动端聊天输入区增加消息标注入口，使用共享 annotation catalog。
- 移动端标注选择器按待发送消息类型过滤可选项，并保留当前已选标注展示。
- 移动端发送普通文本、状态事件和上传附件 draft 时携带适用的 annotations；附件拆分后的每条 draft 按自身 `messageType` 再过滤。
- 移动端消息列表展示已有 annotations，便于识别 BGM、背景、立绘、控制等语义。
- 不恢复 Web 端已删除的 Gal Copilot/AI authoring 模块；这些删除不需要移动端同步。

## Capabilities

### New Capabilities
- `mobile-message-annotations`: 移动端消息标注的选择、展示与发送语义。

### Modified Capabilities
- 无。

## Impact

- `apps/mobile/src/features/chat`: 聊天输入区、消息 item、移动端 annotation UI。
- `apps/mobile/src/features/messages`: 房间消息发送 helper 的 annotation 过滤与透传。
- `@tuanchat/domain/annotation-catalog`: 复用 web 已引入的按消息类型过滤语义。
- 测试影响：补充移动端 annotation 过滤 helper 单元测试，运行移动端 typecheck 和相关 Vitest。
