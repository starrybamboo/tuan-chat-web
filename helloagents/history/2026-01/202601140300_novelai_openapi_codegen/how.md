# 技术设计: NovelAI OpenAPI 导出与 TS 客户端生成

## 技术方案
### 核心技术
- Node.js（ESM）
- `openapi-typescript-codegen`（现有依赖）

### 实现要点
- 通过网络拉取 `https://api.novelai.net/docs/swagger-ui-init.js`。
- 在脚本中定位 `let options = { ... }` 结构并解析其中的 `swaggerDoc`（OpenAPI 3.0 JSON）。
- 将导出的 OpenAPI 写入 `api/novelai_OpenAPI.json`（UTF-8，格式化输出）。
- 使用 `pnpm exec openapi` 基于该 JSON 生成 Fetch 客户端到 `api/novelai/`。

## 安全与性能
- **安全:** 不在仓库内写入任何密钥/令牌；脚本仅下载公开文档并生成代码。
- **性能:** 生成流程为按需执行，不影响运行时。

## 测试与部署
- **测试:** 以脚本可成功导出 JSON 且 codegen 可成功生成目录为验证标准。
- **部署:** 无运行时部署变更；仅新增可复用代码与脚本。

