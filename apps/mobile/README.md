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
pnpm mobile:android:dev
pnpm mobile:android:start
pnpm mobile:android:emulator
pnpm mobile:android
pnpm mobile:web
pnpm mobile:typecheck
```

## Android 调试约定

- 可以直接复用 `D:\A_watch_maid` 现有的 Android 模拟器，不需要额外新建 AVD。
- 当前本机已识别到的可复用 AVD：
  - `WatchMaid_API_36_Alt`
  - `WatchMaid_API_36_Fresh`
- `A_watch_maid` 的移动端是 React Native CLI 工程；团剧共创移动端是 Expo 工程。两者可以共用同一个模拟器，但不能共用同一个 Metro / Expo 端口。
- 团剧共创移动端默认 Android 调试链路已经切到“本地 dev build + 共享模拟器”，不再默认依赖 Expo Go。推荐入口：

```bash
pnpm mobile:android:dev
```

- `pnpm mobile:android` 现在等价于 `pnpm mobile:android:dev`，保留为兼容入口。

- 这条命令会自动完成：
  1. 固定使用 `D:\android-sdk` 下的 `emulator.exe` 和 `adb.exe`
  2. 启动共享 AVD `WatchMaid_API_36_Fresh`
  3. 固定用 `D:\AndroidSdk` 作为原生构建 SDK
  4. 将 `TEMP` / `TMP` 固定到 `D:\A_collection\.tmp\expo-temp`
  5. 将 `GRADLE_USER_HOME` 固定到 `D:\A_collection\.gradle-home2`
  6. 使用 `expo run:android` 构建、安装并启动本地 dev build
  7. 固定 Metro 端口为 `8082`
- 如果你只想单独拉起共享模拟器，可以运行：

```bash
pnpm mobile:android:emulator
```

- 如果 dev build 已经安装过，只想重新拉起 Metro 并唤起 Android dev client，可以运行：

```bash
pnpm mobile:android:start
```

- 如果 `watch-maid` 已占用 `8081`，团剧共创移动端请固定用 `8082`，不要和它共用同一端口。
- Windows 中文用户目录下，Node 临时目录和 Gradle 用户目录会触发 `expo prebuild` / prefab `.bat` 路径问题；上面的脚本已经把这两个目录强制切到纯 ASCII 路径，不要再改回中文路径。
- 构建 SDK 与模拟器 SDK 现在分离：
  - 模拟器 / `adb`：`D:\android-sdk`
  - 原生构建 / NDK：`D:\AndroidSdk`
- 当前 `apps/mobile/app.json` 已配置：
  - `slug`: `tuanchat-mobile`
  - `scheme`: `tuanchat`
  - `android.package`: `com.tuanchat.mobile`
  - `ios.bundleIdentifier`: `com.tuanchat.mobile`
- 当前 Android 前台 Activity 为 `com.tuanchat.mobile/.MainActivity`。
- `apps/mobile/android` 是本地 `expo prebuild` 生成目录，已通过根目录 `.gitignore` 忽略。

## 已实测链路

- 已在共享模拟器 `WatchMaid_API_36_Fresh` 上实测通过：

```bash
pnpm mobile:android:dev
```

- 实测结果：
  - `BUILD SUCCESSFUL`
  - 生成 APK：`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
  - 已安装包名：`com.tuanchat.mobile`
  - 已进入前台 Activity：`com.tuanchat.mobile/.MainActivity`
  - Metro 已完成 Android bundling（入口 `expo-router/entry.js`）

## 当前状态

- 已接入 `@tuanchat/openapi-client`
- 已新增共享包 `@tuanchat/domain` 与 `@tuanchat/query`
- 已保留 Expo Router 目录结构，但首页布局已暂时切成单屏聊天入口，不再默认显示底部 tab
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
- 移动端当前主题暂时固定为深色，优先对齐桌面端窄宽度聊天壳层
- 登录后默认先展示左侧抽屉展开态，结构调整为“空间 rail + 频道与文档 + 素材包 + 用户卡片”
- Web 静态导出默认连 `https://tuan.chat/api` 与 `wss://tuan.chat/ws` 方便直接截图验收；原生 Android / iOS 仍默认连本地开发地址
- 已确认可与 `A_watch_maid` 共用现有 Android 模拟器；并约定通过独立端口避免与 `watch-maid` 的 Metro 冲突
- 已补本地 Android dev build 调试脚本，固定共享 AVD、分离构建 SDK / 模拟器 SDK，并完成共享模拟器实测
- 还没有接入完整聊天能力（更完整的状态事件交互、更细的实时事件处理）

## 下一步建议

1. 继续补齐更完整的状态事件交互，尤其是移动端更多 `.st` / 结构化状态指令能力
2. 在 websocket 链路上继续补更细粒度事件处理，例如成员状态、禁言状态和更完整的异常恢复
3. 把当前消息工作台逐步拆到独立屏幕和组件，避免首页继续膨胀
