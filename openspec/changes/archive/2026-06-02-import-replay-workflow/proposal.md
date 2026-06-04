## Why

咕噜噜 replay 复刻暴露出的真正缺口不是“缺一个 replay 导入功能”，而是 AI 代理缺少一组稳定、可脚本化、可复核的团剧共创创作原语。现在角色、头像、BGM、消息流和 WebGAL 导出能力已经存在，应该把它们整理为 CLI/API 原语，让 AI 代理组合使用，而不是为 replay 单独造一套产品功能。

## What Changes

- 新增面向 AI 代理的房间创作 CLI/API 原语，而不是新增面向最终用户的 replay 导入 UI。
- 提供可脚本化的角色创建/复用、头像上传/复用、媒体/BGM 上传与引用、批量消息写入、来源元数据记录、批次复核和清理能力。
- AI 代理可以用这些原语把任意外部素材流，包括咕噜噜 replay，转换并写入统一 room message stream。
- 保留来源元数据，包括外部作品、楼层/片段、原始图片路径、BGM 来源、外部事件序号和每条消息的来源定位，用于审计、回跳、修错和导出。
- WebGAL 导出继续读取普通房间消息、角色、头像、媒体和 message extra，不依赖 replay 专用模型。
- 咕噜噜 1-62 楼 replay 复刻作为第一条验收场景，用来验证这些通用原语足够表达对白、旁白、骰子、BGM、头像切换和来源追踪。

## Capabilities

### New Capabilities

- `agent-room-authoring-primitives`: 定义 AI 代理使用的房间创作 CLI/API 原语，包括资源准备、批量消息写入、批次复核、清理和 WebGAL 导出。

### Modified Capabilities

- 无。

## Impact

- CLI/API：需要提供可脚本化的 room authoring 命令或接口，支持 role/avatar/media/message/batch/export 等通用操作。
- 后端/API：需要批量创建或复用角色卡、上传/关联头像与 BGM 资源、批量写入 room message stream，并保存来源元数据。
- WebGAL：导出链路应继续基于通用消息、角色、头像和媒体元数据生成脚本，不引入 replay 专用分支。
- 脚本/工具：现有 `gululu-replay-import.mjs`、图片审查包、BGM manifest 和可解析 BGM 来源作为第一条 agent workflow 输入，由 AI 代理通过通用 CLI/API 串联。
- 测试：需要覆盖原语级校验、幂等/重复写入保护、批量写入、角色头像绑定、BGM 复刻状态、来源元数据和 WebGAL 导出。
