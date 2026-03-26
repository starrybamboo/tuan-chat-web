# Blocksuite Editors Architecture

## 路径

- [editors/](../../editors)

## 目标

承接真正的 editor 装配层，把 runtime 层提供的 `store/workspace/docModeProvider` 转成可挂载的浏览器 editor DOM。

## 当前文件

- [createBlocksuiteEditor.browser.ts](../../editors/createBlocksuiteEditor.browser.ts)
- [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
- [mockServices.ts](../../editors/mockServices.ts)
- [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts)

## 调用链

- [useBlocksuiteEditorLifecycle.ts](../../frame/useBlocksuiteEditorLifecycle.ts)
  -> [runtimeLoader.browser.ts](../../runtime/runtimeLoader.browser.ts)
  -> `runtime.createBlocksuiteEditor(...)`
  -> [createBlocksuiteEditor.browser.ts](../../editors/createBlocksuiteEditor.browser.ts)
  -> [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
  -> [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts)

## 负责的事

- 组装 editor DOM 与扩展列表
- 注入 quick search、用户服务、linked-doc、mode provider 等能力
- 提供项目自定义 editor container
- 为 frame / runtime 提供稳定的浏览器侧 editor 创建边界

## 不负责的事

- 不处理 iframe 宿主协议
- 不处理 description / space 业务映射
- 不负责 workspace 生命周期

## 与其他目录的关系

- 依赖 [manager/](../../manager) 提供 page / edgeless specs
- 依赖 [services/](../../services) 提供业务服务
- 依赖 [embedded/](../../embedded) 提供文档内部 embed block 扩展
