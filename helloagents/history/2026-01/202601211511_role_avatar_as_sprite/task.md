# 轻量迭代：无立绘角色默认使用头像作为立绘

## 任务清单

- [√] 统一“立绘 URL”兜底逻辑：`spriteUrl` 为空时回退 `avatarUrl`
- [√] 立绘预览/渲染面板使用兜底逻辑（Preview/Render）
- [√] 立绘校正/裁剪在无 `spriteUrl` 时仍可使用头像作为裁剪源
- [√] 验证：TypeScript `pnpm typecheck`
- [√] 同步知识库：`wiki/modules/app.md`、`CHANGELOG.md`、`history/index.md`

