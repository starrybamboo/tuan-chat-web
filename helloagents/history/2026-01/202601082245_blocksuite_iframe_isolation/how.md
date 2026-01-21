# 技术设计: Blocksuite iframe 强隔离

## 技术方案

### 核心技术
- React Router 7（新增独立路由作为 iframe 内容页）
- iframe（同源隔离 CSS/DOM 副作用）
- `window.postMessage`（父子窗口最小通信协议）

### 实现要点
- 新增路由：`/blocksuite-frame`
  - 仅负责在 iframe 内渲染 `BlocksuiteDescriptionEditorRuntime`
  - 监听来自父窗口的消息：`set-mode`、`theme`
  - 把 `onModeChange` 与 `onNavigateToDoc`（由 runtime 发出）转发给父窗口
- 改造 `BlocksuiteDescriptionEditor`：
  - 导出 `BlocksuiteDescriptionEditorRuntime`（真实运行时实现，保留原有逻辑）
  - 默认导出组件在顶层窗口改为 iframe 宿主（避免主窗口执行 blocksuite runtime）
  - iframe 宿主通过 `postMessage` 提供 `onActionsChange` 能力（toggle/set/get mode）
  - iframe 宿主同步站点主题到 iframe（`data-theme` / `dark` class）
- 通信约束：
  - 使用 `instanceId` 区分多个 editor 实例
  - 同源校验：优先校验 `origin`；在 `file://`（origin 为 `null`）场景下降级为 `source` + `instanceId` 校验

## 架构决策 ADR

### ADR-202601082245: Blocksuite 嵌入采用 iframe 强隔离
**上下文:** Blocksuite 在嵌入场景存在难以穷举的全局 CSS/DOM 副作用；Light DOM 拦截/重写的维护成本高且易漏。

**决策:** 对所有 `BlocksuiteDescriptionEditor` 入口默认使用 iframe 渲染，并新增 `blocksuite-frame` 路由承载实际运行时。

**理由:**
- 物理隔离边界最明确：Blocksuite 的运行时注入、portal、以及可能的全局写入均局限于 iframe 文档
- 规避“首次污染/二次回滚过度”的互相牵制问题

**替代方案:** 继续在 Light DOM 中拦截/重写 Blocksuite 的所有注入与副作用
→ 拒绝原因: 污染源不稳定，拦截点多且不可完全覆盖，维护成本与回归风险高

**影响:**
- 性能：会多加载一个 SPA 实例（仅 Blocksuite 页面）；需要关注内存与网络开销
- 交互：依赖 `postMessage` 维持 mode/theme/navigate 的体验一致性

## 安全与性能
- **安全:** `postMessage` 通信限定为同源，并额外校验 `event.source` 与 `instanceId`，避免被其它 frame 注入控制消息。
- **性能:** 仅 Blocksuite 页面启用 iframe；协议保持最小集合，避免频繁双向同步。

## 测试与部署
- **测试:** 执行 `pnpm typecheck`；手动验证“进入/离开/再次进入 Blocksuite 页面”的样式稳定性。
- **部署:** 无额外部署步骤；随前端构建发布。

