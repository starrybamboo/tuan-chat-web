# 任务清单: 文档卡片消息（Blocksuite Doc Card）

目录: `helloagents/plan/202601252021_doc_message_card/`

---

## 1. 消息协议与渲染
- [√] 1.1 在 `app/types/voiceRenderTypes.ts` 增加 `MESSAGE_TYPE.DOC_CARD`，验证 why.md#需求-发送文档卡片消息-场景-点击发送按钮发送文档卡片
- [√] 1.2 新增文档卡片渲染组件（标题/封面/摘要 + 点击弹窗只读预览），并在 `app/components/chat/message/chatBubble.tsx` 接入，验证 why.md#需求-发送文档卡片消息-场景-点击发送按钮发送文档卡片
- [√] 1.3 新增只读预览弹窗（复用 `BlocksuiteDescriptionEditor`），验证 why.md#需求-发送文档卡片消息-场景-点击发送按钮发送文档卡片

## 2. DnD：拖拽发送文档卡片
- [√] 2.1 在文档树节点 `dragstart` 写入 `application/x-tc-doc-ref`，保持原 `text/plain` 排序逻辑兼容，验证 why.md#需求-文档拖拽发送-场景-从文档树拖拽到输入框区域
- [√] 2.2 在输入框根容器（composer）支持 drop 文档引用并触发发送，验证 why.md#需求-文档拖拽发送-场景-从文档树拖拽到输入框区域
- [√] 2.3 在消息列表（chat frame）支持 drop 文档引用并触发发送，验证 why.md#需求-文档拖拽发送-场景-从文档树拖拽到消息列表区域

## 3. 发送校验与同一 space 限制
- [√] 3.1 发送前校验 docId 类型与当前 space 一致性（必要时降级提示），验证 why.md#需求-同一-space-限制-场景-在非同一-space-场景触发拖拽/发送
- [√] 3.2 渲染侧兜底：解析失败/无权限/加载失败时展示可理解的降级 UI（不影响消息列表渲染）

## 4. 安全检查
- [√] 4.1 执行安全检查（按G9: 输入验证、权限控制、避免渲染不可信HTML、避免跨space）

## 5. 文档更新
- [√] 5.1 更新 `helloagents/wiki/modules/chat.md`（如存在）或新增模块条目记录“文档卡片消息”协议与交互（按知识库规范）
- [√] 5.2 更新 `helloagents/CHANGELOG.md` 记录新增功能

## 6. 测试
- [?] 6.1 关键路径手测清单：拖拽发送/点击预览/回归文件拖拽上传/回归侧边栏拖拽排序
  > 备注: 已完成代码与类型检查（存在仓库内既有 typecheck 报错未处理）；仍需在浏览器/Electron 中手动验证交互与预览效果
