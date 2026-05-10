# Editor

这份文档定义的是 Tuanchat 编辑器的目标入口，不是现状说明。

当前仓库里已经有一套基于 Blocksuite 的编辑器装配链路；这里要明确的是后续 Editor 的目标边界：做一个基于 `message schema` 的全局线性编辑器，让用户以连续文档的方式编辑内容，但底层仍然落在现有的消息模型上。

## 这是什么

它是一个面向消息流的编辑器目标，而不是一个新的通用富文本系统。

在这个目标里：

- 用户看到的是一条连续的编辑流。
- 系统保存的是线性的 `MessageDraft[]` / `Message[]`。
- 每条消息都可以视为一个 block。
- block 的语义由 `messageType`、`extra`、`annotations`、`webgal` 共同承载。

这里描述的是目标能力和边界，不代表这些能力已经全部实现。

## 核心模型

现有消息模型不是文档 AST，而是 `envelope + typed payload`。

- `Message` 是已落库、已进入历史流的消息实体，包含 `messageId`、`syncId`、`roomId`、`position` 等持久化与排序字段。
- `MessageDraft` 是发送前或编辑态使用的消息草稿，最终仍要归一到请求和消息链路。
- `messageType` 定义消息的大类。
- `extra` 按类型挂接子 payload，例如 `imageMessage`、`soundMessage`、`fileMessage`、`docCard`、`roomJump`。
- `annotations` 和 `webgal` 承载补充语义，而不是另一套主数据结构。

这意味着编辑器的主模型应该继续围绕消息序列展开，而不是额外引入树状文档模型作为保存格式。

相关源码入口：

- [Message.ts](../../../../../../../packages/tuanchat-openapi-client/src/models/Message.ts)
- [messageDraft.ts](../../../../../../../packages/tuanchat-domain/src/messageDraft.ts)
- [messageType.ts](../../../../../../../packages/tuanchat-domain/src/messageType.ts)
- [MessageExtra.ts](../../../../../../../packages/tuanchat-openapi-client/src/models/MessageExtra.ts)

## 目标

- 用同一份底层消息数据同时支撑聊天室视图和文档视图。
- 让文本消息、标题消息和现有媒体/卡片类消息进入同一条线性编辑流。
- 让 AI 可以直接基于 `message[]` 做插入、改写、重排，而不依赖额外 AST 转换层。
- 把运行时编辑结构限制在编辑器内部，保存态仍回到现有消息模型。

## 不做什么

- 不做通用富文本编辑器。
- 不把树状 AST 引入为新的主内容模型。
- 不做任意块嵌套、复杂布局容器、开放式插件平台。
- 不为了编辑器额外维护一套与消息模型脱钩的持久化格式。

## 本期范围

本期讨论的是目标边界，不是实现完成度。

范围按目标收敛到以下几类能力：

- 连续文本编辑。
- 分级标题，至少覆盖 `heading1`、`heading2`、`heading3`。
- 最小行内样式集合，例如粗体、斜体、行内代码、高亮、颜色。
- 图片、音频、文件、文档卡片等现有消息类型在同一编辑流中的插入与编辑。
- 未知块类型的保留与回显，不静默丢失数据。

这些内容表示目标覆盖范围，不表示仓库当前已经具备完整支持。

## Editor.js 参考关系

这里借鉴的是 Editor.js 的分层方式，不是它的内容模型。

可参考的方向包括：

- `core` 负责生命周期和模块协作。
- `block manager` 负责线性 block 序列。
- `renderer` 负责把 block 序列变成可编辑视图。
- `saver` 负责把运行时状态收敛回可保存数据。

不直接照搬的部分也要明确：

- 不采用 Editor.js 的输出格式作为主存储。
- 不把编辑器 block 数据独立成另一套长期持久化协议。
- 不把仓库里的消息模型降级为“只是导出时才用”的兼容层。

## 阅读路径

先读这份入口文档，再按下面的路径继续：

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [INTEGRATION.md](./INTEGRATION.md)
3. [MOUNTING.md](./MOUNTING.md)
4. [PLUGINS.md](./PLUGINS.md)

如果要对照当前实现，再看现有 Blocksuite 装配入口：

- [createBlocksuiteEditor.browser.ts](../../editors/createBlocksuiteEditor.browser.ts)
- [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
- [blocksuiteEditorAssemblyContext.ts](../../editors/blocksuiteEditorAssemblyContext.ts)
- [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts)
- [extensions/](../../editors/extensions)
