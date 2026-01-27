# task

- [√] 复制前强制读取源 snapshot，不可读则取消复制并提示
- [√] 写入目标 snapshot 前补丁 `tc_header`（title/cover），避免副本标题/封面被默认值覆盖
- [√] 质量验证：已运行 `pnpm typecheck`（当前仓库仍有 2 个既有类型错误，与本次改动无关）
- [√] 同步知识库并迁移方案包
