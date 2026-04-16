# 团剧共创移动端

这个目录是 `Expo + Expo Router` 的移动端应用骨架，和 Web 端共用同一个仓库。

## 当前约定

- 应用目录：`apps/mobile`
- 共享 OpenAPI client：`packages/tuanchat-openapi-client`
- 根目录通过 `pnpm-workspace.yaml` 管理 workspace

## 常用命令

在仓库根目录运行：

```bash
pnpm install
pnpm mobile:start
pnpm mobile:android
pnpm mobile:web
pnpm mobile:typecheck
```

## 当前状态

- 已接入 `@tuanchat/openapi-client`
- 已新增共享包 `@tuanchat/domain` 与 `@tuanchat/query`
- 已保留 Expo Router 目录结构
- 已接入 `expo-secure-store`，支持原生端 SecureStore / Web 端 localStorage 的会话存取
- 已接入 `@tanstack/react-query`，并在应用根部注入 QueryClient
- 已提供最小登录态基础设施，可用用户名或用户 ID 登录并拉取当前用户信息
- 已切到共享查询实现，可直接复用 Web 的当前用户 / 空间 / 房间查询层
- 已接入房间消息分页读取，可查看当前房间的真实消息
- 已把消息草稿构建、消息类型常量、简单状态指令解析下沉到共享 `@tuanchat/domain`
- 已接入基础消息发送入口，当前可发送文本、指令请求、简单状态事件
- 已接入图片 / 视频 / 音频 / 普通文件附件选择与 OSS 直传，文本模式下可直接发多媒体或文件消息
- 已把“上传后素材 -> 消息草稿”组装逻辑抽到共享 helper，Web / Mobile 统一复用
- 已补附件发送阶段状态提示，发送失败时会保留草稿与附件，便于直接重试
- 已支持从历史消息中设置回复锚点，并可指定角色 ID 发送
- 已接入空间成员 / 房间成员查询，并在工作台展示当前身份与成员预览
- “我的”页已补成资料 / 设置入口，支持显示账号资料、本地存储信息，并自动恢复上次工作区选择
- 移动端当前不接入 Thread；桌面端也已暂时屏蔽 Thread 入口
- 已接入房间消息本地缓存（Web 走 `localStorage`，Native 走 `expo-file-system`）
- 已接入移动端最小 websocket 实时同步，当前只增量同步当前房间主消息流
- 还没有接入完整聊天能力（更完整的状态事件交互、更细的实时事件处理）

## 下一步建议

1. 继续补齐更完整的状态事件交互，尤其是移动端更多 `.st` / 结构化状态指令能力
2. 在 websocket 链路上继续补更细粒度事件处理，例如成员状态、禁言状态和更完整的异常恢复
3. 把当前消息工作台逐步拆到独立屏幕和组件，避免首页继续膨胀
