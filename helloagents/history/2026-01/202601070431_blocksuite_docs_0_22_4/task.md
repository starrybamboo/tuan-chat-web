# 任务清单: Blocksuite 0.22.4 文档入库（可直接用于本项目）

目录: `helloagents/history/2026-01/202601070431_blocksuite_docs_0_22_4/`

状态: [-] 已跳过（方案重复/已合并到 `helloagents/history/2026-01/202601070338_blocksuite_docs/`）

---

## 1. 调研与边界确认
- [-] 1.1 扫描本项目对 `@blocksuite/*` 的 import 使用点，形成“优先覆盖入口清单”
- [-] 1.2 从 `node_modules/@blocksuite/*/package.json#exports` 提取 0.22.4 的对外入口（subpath exports）并按用途归类

## 2. 知识库文档（包级）
- [-] 2.1 新增 `helloagents/wiki/blocksuite/overview.md`：整体概览、包关系图（文字版）、入口导航与使用建议
- [-] 2.2 新增 `helloagents/wiki/blocksuite/affine.md`：`@blocksuite/affine`（含 blocks/widgets/inlines 等 subpath 的分组说明）
- [-] 2.3 新增 `helloagents/wiki/blocksuite/affine-components.md`
- [-] 2.4 新增 `helloagents/wiki/blocksuite/affine-model.md`
- [-] 2.5 新增 `helloagents/wiki/blocksuite/affine-shared.md`
- [-] 2.6 新增 `helloagents/wiki/blocksuite/global.md`
- [-] 2.7 新增 `helloagents/wiki/blocksuite/std.md`
- [-] 2.8 新增 `helloagents/wiki/blocksuite/store.md`
- [-] 2.9 新增 `helloagents/wiki/blocksuite/sync.md`
- [-] 2.10 新增 `helloagents/wiki/blocksuite/integration-test.md`（限定为开发/调试用途说明）

## 3. 知识库文档（场景级）
- [-] 3.1 新增 `helloagents/wiki/blocksuite/usage-embed-editor-react.md`：嵌入编辑器（对齐本项目 `createEmbeddedAffineEditor.ts`）
- [-] 3.3 新增 `helloagents/wiki/blocksuite/usage-render-blocks.md`：块渲染与 specs 组合（page/edgeless）
- [-] 3.4 新增 `helloagents/wiki/blocksuite/usage-import-export.md`：导入导出/转换（以 0.22.4 实际导出为准）

## 4. 知识库索引与变更记录
- [-] 4.1 新增 `helloagents/wiki/modules/blocksuite.md` 并在 `helloagents/wiki/overview.md` 的模块索引中登记
- [-] 4.2 更新 `helloagents/CHANGELOG.md` 记录本次知识库新增内容

## 5. 安全检查
- [-] 5.1 检查所有文档不包含密钥/令牌/生产环境地址；示例代码仅使用占位符与本地 mock

## 6. 验证
- [-] 6.1 抽样校验文档中列出的 import 路径均为 `0.22.4` 实际存在的 `exports` 入口
- [-] 6.2 （可选）执行 `pnpm typecheck`，确认未引入与文档无关的代码回归问题
