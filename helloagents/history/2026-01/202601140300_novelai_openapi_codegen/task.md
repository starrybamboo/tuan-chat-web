# 任务清单: NovelAI OpenAPI 导出与 TS 客户端生成

目录: `helloagents/plan/202601140300_novelai_openapi_codegen/`

---

## 1. 导出与代码生成脚本
- [√] 1.1 新增 `scripts/novelai-openapi.mjs`，实现 OpenAPI 导出与 codegen 调用，验证 why.md#需求-导出-openapi-规范并生成-ts-客户端-场景-开发者一键更新上游-api
- [√] 1.2 更新 `package.json` scripts，补充 `openapi:novelai` 与 `openapi:novelai:fetch` 入口

## 2. 生成产物落盘
- [√] 2.1 生成 `api/novelai_OpenAPI.json`（导出结果）
- [√] 2.2 生成 `api/novelai/*`（TS Fetch 客户端）

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9: 不落盘密钥/令牌、仅处理公开文档数据）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/api.md`，补充 NovelAI OpenAPI 的生成与使用说明
- [√] 4.2 更新 `helloagents/CHANGELOG.md`

## 5. 测试
- [√] 5.1 运行 `pnpm -s openapi:novelai`，确认脚本与生成流程可用
