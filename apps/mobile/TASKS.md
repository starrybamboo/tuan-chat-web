# 团剧共创移动端任务清单

## 当前里程碑：真实入口可用

- [x] 接入 workspace 结构与共享 `OpenAPI client`
- [x] 接入 `SecureStore`、`React Query` 和最小登录态
- [x] 新增移动端任务文档并作为执行基线
- [x] 增加空间列表查询能力
- [x] 增加房间列表查询能力
- [x] 增加当前工作区选择状态，统一管理选中的空间与房间
- [x] 将首页替换为登录后真实入口，展示空间与房间列表
- [x] 将第二个 tab 替换为“我的”页，展示当前账号与环境信息
- [x] 调整 tab 文案为业务语义
- [x] 通过 `pnpm --filter @tuanchat/mobile typecheck`
- [x] 通过 `pnpm --filter @tuanchat/mobile exec expo export --platform web --output-dir .expo-export-web`

## 当前里程碑：共享层抽离

- [x] 新增 `@tuanchat/domain`，沉淀 `open-api-result`、`role-api-error`、`message-extra`、`state-event`
- [x] 新增 `@tuanchat/query`，沉淀当前用户、空间、房间的共享查询 hooks
- [x] Web 现有的用户信息 / 空间 / 房间查询入口切到共享查询实现
- [x] 移动端现有的当前用户 / 空间 / 房间查询入口切到共享查询实现
- [x] 移动端登录态错误提取切到共享 `open-api-result`
- [x] 通过 `pnpm install --ignore-scripts`
- [x] 通过 `pnpm exec vitest run app/types/stateEvent.test.ts`
- [x] 通过 `pnpm exec vitest run app/types/messageDraft.test.ts`
- [x] 通过 `pnpm --filter @tuanchat/mobile typecheck`
- [x] 通过 `pnpm --filter @tuanchat/mobile exec expo export --platform web --output-dir .expo-export-web`

## 后续里程碑

- [x] 接入房间消息列表
- [x] 接入纯文本发送能力（备用接口）
- [x] 接入房间成员与空间成员信息
- [x] 接入资料页与设置页
- [x] 共享下沉消息草稿构建、消息类型常量、简单状态指令解析
- [x] 移动端补基础消息模式切换，可发送文本 / 指令请求 / 简单状态事件
- [x] 移动端补消息锚点与角色 ID 输入，支持回复锚点
- [x] 移动端补图片 / 视频 / 音频 / 普通文件附件选择与 OSS 直传
- [x] 共享下沉“上传后素材 -> 消息草稿”构建 helper，避免 Web / Mobile 重复拼多媒体 draft
- [x] 移动端移除 Thread 创建入口，桌面端暂时屏蔽 Thread UI 入口
- [x] 接入完整消息发送能力（附件、命令、状态事件、普通文件）
- [x] 补强附件交互（发送阶段状态、失败保留草稿与附件、附件类型信息）
- [ ] 补齐更完整的状态事件交互（如更多指令）
- [x] 接入房间消息本地缓存（Web localStorage / Native expo-file-system）
- [x] 接入房间消息 websocket 最小实时同步（当前房间主消息流）
