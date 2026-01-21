# 技术设计: WebGAL 实时渲染创建游戏不使用模板

## 技术方案

### 核心技术
- TypeScript / React Router 项目代码
- WebGAL(Terre) HTTP API：`manageGameControllerCreateGame`

### 实现要点
- 在 `app/webGAL/realtimeRenderer.ts` 的 `RealtimeRenderer.init()` 中：
  - 当游戏不存在时，仅调用一次 `terreApis.manageGameControllerCreateGame({ gameDir, gameName })`
  - 不再传递 `templateDir`
  - 不再捕获并执行“空项目重试/手动创建目录结构”兜底逻辑，让异常抛出并由外层 `try/catch` 统一处理（返回 `false` 且触发 error 状态）
- 移除仅用于兜底的 `createGameDirectories()` 私有方法，避免产生与 Terre 侧真实模板/目录结构不一致的“半成品”游戏工程。

## 安全与性能
- **安全:** 不引入新的外部输入/权限变更；仅调整调用参数与错误处理路径。
- **性能:** 无明显影响。

## 测试与部署
- **测试:** 运行 `pnpm -C tuan-chat-web typecheck`（或项目既有检查命令）确保 TS 通过。
- **部署:** 无额外部署步骤；依赖 WebGAL(Terre) 服务可用性。

