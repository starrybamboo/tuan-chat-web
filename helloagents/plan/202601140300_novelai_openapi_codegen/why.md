# 变更提案: NovelAI OpenAPI 导出与 TS 客户端生成

## 需求背景
当前项目需要对接 NovelAI API，但缺少可复用、类型安全的接口定义与客户端代码。手写请求与类型容易漂移，且难以跟随上游接口变化快速更新。

## 变更内容
1. 增加脚本：从 `https://api.novelai.net/docs/` 对应的 Swagger UI 规范中导出 OpenAPI JSON。
2. 基于导出的 OpenAPI JSON，使用现有的 `openapi-typescript-codegen` 生成可复用的 TS Fetch 客户端。
3. 将生成流程沉淀为可重复执行的项目脚本，并在知识库中记录使用方式与维护约定。

## 影响范围
- **模块:** `api`、`scripts`
- **文件:** `api/novelai_OpenAPI.json`、`api/novelai/*`、`scripts/novelai-openapi.mjs`、`package.json`
- **API:** 新增 NovelAI 客户端（仅代码生成，不改变现有运行时路由）
- **数据:** 无

## 核心场景

### 需求: 导出 OpenAPI 规范并生成 TS 客户端
**模块:** api
为 NovelAI API 导出 OpenAPI JSON，并生成 TS Fetch 客户端代码，便于在前端/桌面端代码中直接复用。

#### 场景: 开发者一键更新上游 API
在上游文档更新后，开发者运行脚本即可刷新 `api/novelai_OpenAPI.json` 与 `api/novelai/*`，避免手工维护带来的不一致。

## 风险评估
- **风险:** 远端 Swagger UI 的初始化脚本结构变化导致解析失败。
- **缓解:** 脚本增加结构校验与错误提示；必要时可扩展为直接拉取公开的 OpenAPI JSON 入口（如未来提供）。

