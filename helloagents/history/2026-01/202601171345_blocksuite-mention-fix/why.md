# 变更提案: Blocksuite @ 提及弹窗重复插入修复

## 需求背景
空间描述编辑器使用 Blocksuite @ 提及时，选择成员后会重复插入多次，并且弹窗不会关闭，影响正常编辑体验。

## 变更内容
1. 选择成员后立即关闭 @ 提及弹窗，防止重复触发。
2. 在提及插入逻辑中增加“单次触发”保护，避免同一选择被多次写入。

## 影响范围
- 模块: Blocksuite 提及集成、嵌入式编辑器
- 文件: app/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor.client.ts, app/components/chat/infra/blocksuite/services/mentionPicker.ts
- API: 无
- 数据: 无

## 核心场景

### 需求: @ 提及仅插入一次并关闭弹窗
**模块:** Blocksuite 提及集成
在空间描述中选择成员后，只插入一次提及文本并关闭弹窗。

#### 场景: 空间描述选择成员
前置条件: 空间描述编辑器已打开，输入 `@` 并出现成员弹窗。
- 预期结果: 选择成员后，仅插入一次 `@成员名`。
- 预期结果: 弹窗立即关闭，光标停留在提及后并继续输入。

## 风险评估
- 风险: 关闭弹窗时可能丢失当前选区或导致插入失败。
- 缓解: 先执行插入，再调用 abort() 关闭弹窗，并增加最小化的防重入保护。
