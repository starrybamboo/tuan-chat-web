# 技术设计：Blocksuite 客户端按需加载

## 核心方案

- 移除 SSR 入口组件对 `@/components/chat/infra/blocksuite/spaceDocCollectionRegistry` 的静态 import。
- 在 `useEffect` 内使用动态 `import()` 加载 Blocksuite workspace registry，并在客户端订阅 `ws.meta` 的变更事件来同步 `spaceDocMetas`。

## 关键实现点

- `useEffect` 本身不会在 SSR 执行，可作为“客户端边界”来承载 Blocksuite 相关加载逻辑。
- 为避免竞态/内存泄漏：使用 `disposed` 标记与订阅数组 `subs`，在 cleanup 中统一 unsubscribe。

## 风险与缓解

- **风险：** 动态 import 加载失败导致 DOC 列表为空。
  - **缓解：** 捕获异常并输出 console error，保持主流程可用。

