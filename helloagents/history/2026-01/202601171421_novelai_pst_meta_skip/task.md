# 轻量迭代：NovelAI persistent token（pst-*）元数据请求降级

- [√] 1. 识别 `pst-` token 并跳过 `/user/clientsettings`、`/user/data`
- [√] 2. Electron 环境同样避免抛错，直接降级内置模型列表
- [√] 3. 更新知识库：说明 token 类型差异与降级策略
- [√] 4. 运行 `pnpm typecheck` 验证
