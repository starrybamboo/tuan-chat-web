# how

## 前端交互

- 聊天输入区 Dock 模式：在线索按钮左侧新增“我的文档”按钮，点击切换 `sideDrawerState="docFolder"`
- 右侧抽屉渲染：新增 `DocFolderForUser`，提供文件夹/文档列表与增删改
- 打开文档：在弹窗（`ToastWindow`）内打开 `BlocksuiteDescriptionEditor`（`variant="full"`）

## 数据对接

- `/space/docFolder/tree`：获取/保存文件夹树（treeJson + version）
- `/space/docFolder/docs`：获取当前用户在 space 下的文档列表
- `/space/docFolder/doc`：创建/删除文档
- `/space/docFolder/doc/title`：重命名文档

## Blocksuite 约定

- docId：`udoc:<docId>:description`
- Remote snapshot：`entityType="space_user_doc"`, `entityId=<docId>`, `docType="description"`
