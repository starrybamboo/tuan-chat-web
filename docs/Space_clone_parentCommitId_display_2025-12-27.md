# Space 克隆来源展示（2025-12-27）

## 目标

在前端空间设置窗口中展示当前空间的克隆来源，帮助用户快速确认“自己从哪个空间克隆而来”。

## 方案

- 使用 `Space.parentCommitId` 作为克隆来源 ID。
- 在已加载的用户空间列表（`getUserSpaces`）中反查来源空间名称：
  - 若能找到：展示 `来源空间名 + (ID)`，并提供“前往”按钮切换回该空间。
  - 若找不到：仅展示 `来源ID` 并提示未找到名称（可能来源是归档 commitId 或来源空间不在当前列表）。

## 涉及文件

- app/components/chat/window/spaceSettingWindow.tsx

## 备注

`parentCommitId` 在“直接克隆”场景写入原 `spaceId`，可直接索引到对应群聊空间；在“归档克隆”场景可能存的是 `commitId`，因此前端采用“尽力展示/尽力反查”的方式。 
