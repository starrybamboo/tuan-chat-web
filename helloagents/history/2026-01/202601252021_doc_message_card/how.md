# 技术设计: 文档卡片消息（Blocksuite Doc Card）

## 技术方案

### 核心技术
- React 组件扩展（新增消息渲染组件 + 预览弹窗）
- 复用 Blocksuite 现有只读预览能力：`BlocksuiteDescriptionEditor`（iframe 隔离 + runtime styles）
- DnD：基于浏览器 `DataTransfer` 自定义 MIME type 传递 doc 引用信息

### 实现要点
- **消息协议（前端约定）**
  - 新增 `MESSAGE_TYPE.DOC_CARD`（建议使用 1002，避免与现有 1000 线索卡冲突）
  - 发送 `ChatMessageRequest.extra` 携带：
    - `docId: string`（Blocksuite docId，如 `udoc:123:description`）
    - `spaceId: number`（发送时的空间 id，用于接收方校验/调试）
    - `fallbackTitle?: string`（发送时可选，便于首屏展示；最终以 Blocksuite header 为准）
- **卡片渲染**
  - 卡片基础字段：
    - 标题：优先 Blocksuite 的 `tc_header.title`，其次 `workspace.meta.title`，最后 fallbackTitle
    - 封面：Blocksuite 的 `tc_header.imageUrl`
    - 内容预览：从 store 中提取首段/前若干段的 `affine:paragraph` 文本，拼成摘要（限制长度）
  - 卡片渲染阶段不创建 Blocksuite editor，仅做“文本/图片”展示，避免消息列表重渲染性能问题
- **弹窗只读预览**
  - 点击卡片打开 `PopWindow`，内部用 `BlocksuiteDescriptionEditor`：
    - `readOnly=true`
    - `variant="full"`
    - `tcHeader.enabled=true`
  - 只读预览在 iframe 中渲染，避免 blocksuite 全局样式污染主页面
- **DnD 发送**
  - 拖拽源（文档树节点）在 `dragstart` 时同时写入：
    - `text/plain`: 保持现有节点移动/排序逻辑兼容
    - `application/x-tc-doc-ref`: JSON（docId/title/spaceId）
  - 投放目标（输入框根容器、消息列表容器）在 `dragover/drop`：
    - 若检测到 `application/x-tc-doc-ref`，则 `preventDefault` 并触发“发送文档卡片”流程
    - 不改变拖拽源的树结构（语义为复制引用）

## 架构决策 ADR

### ADR-001: 采用新 messageType 表达文档卡片（推荐）
**上下文:** 现有消息类型不包含“文档引用卡片”，且 `MessageExtra` 的 openapi 类型并未覆盖该结构。  
**决策:** 新增 `MESSAGE_TYPE.DOC_CARD`，并用 `extra.docId` 表达 Blocksuite 文档引用；卡片渲染在客户端按需拉取/解析远端 snapshot。  
**理由:**
- 语义清晰，不复用现有 FILE/CLUE_CARD 避免概念污染
- 不需要后端立刻升级 openapi schema 即可先跑通（messageType 为 number）
- 卡片预览可以懒加载，性能与可维护性更好  
**替代方案:** 复用 `FILE` 或 `CLUE_CARD` 展示文档卡片 → 拒绝原因: 语义不一致、后续扩展成本高  
**影响:** 前端需要维护一套 doc 引用消息渲染与 DnD 协议；后续若后端补齐 schema，可再把 extra 类型正规化

## API 设计
本次不新增后端 API。只读预览依赖既有 `/blocksuite/doc` 的 snapshot 读取能力（客户端通过 Blocksuite remote doc source 间接调用）。

## 数据模型
新增一类消息 extra（前端约定）：
- `docId`: Blocksuite docId（建议优先支持 `parseDescriptionDocId` 可解析的 docId，如 `udoc:*:description`）
- `spaceId`: number
- `fallbackTitle`: string（可选）

## 安全与性能
- **安全:**
  - 限制同一 space：发送时校验当前 `spaceId`；渲染时若 `spaceId` 不一致则降级提示
  - 只读预览：所有预览入口强制 `readOnly=true`，避免误编辑
  - 不渲染来自文档的 HTML（卡片摘要只展示纯文本），降低 XSS 风险
- **性能:**
  - 卡片摘要/封面懒加载：仅在卡片进入视口后触发加载（可用轻量缓存，避免列表滚动反复拉取）
  - 并发去重：同一 docId 在短时间内的预览加载应复用 inflight Promise
  - 弹窗预览才创建 Blocksuite editor，避免主列表大开销

## 测试与部署
- **测试:**
  - 本地手动验证：拖拽文档到输入框/消息列表可发送；卡片展示正确；点击弹窗只读预览可打开并可滚动
  - 回归验证：现有文件拖拽上传、侧边栏节点拖拽排序不受影响
- **部署:** 前端静态资源更新即可；无需数据库迁移

