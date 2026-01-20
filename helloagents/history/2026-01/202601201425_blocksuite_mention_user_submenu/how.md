# 技术设计: Blocksuite `@` 弹窗用户二级入口

## 技术方案

### 核心技术
- Blocksuite linked-doc widget：`@blocksuite/affine-widget-linked-doc`
- 自定义菜单数据源：`LinkedWidgetConfigExtension({ getMenus })`

### 实现要点
- 在 `getDocMenus()` 中：
  - 调整 group 顺序：先返回文档组（`Link to Doc`），再返回用户组。
  - 用户组使用 linked-doc popover 的 `maxDisplay + overflowText` 展开机制：
    - 默认仅渲染 “more/展开用户列表” 行，避免大量用户条目挤占弹窗空间
    - 用户手动点击后展开展示真实用户列表并可选择插入
- 仅调整 UI 信息架构，不改变 mention 插入协议（仍使用 `ZERO_WIDTH_FOR_EMBED_NODE` + `mention.member`）。

## 安全与性能
- **安全:** 不涉及权限/敏感信息变更；不落盘任何 token/密钥。
- **性能:** 仅减少默认渲染条目数量；成员列表请求逻辑保持不变（如需进一步优化可单独引入缓存）。

## 测试与部署
- **测试:** 运行 `pnpm -C tuan-chat-web typecheck`（或仓库既有检查命令）；手动在“空间资料/房间描述”输入 `@` 验证交互。
- **部署:** 前端构建发布，无额外迁移步骤。

