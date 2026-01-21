# webgal

## 目的

记录 WebGAL/terre 相关的前端集成约定：实时渲染创建、设置持久化、空间变量系统与消息类型对齐。

## 模块概述

- **职责:** WebGAL 实时渲染创建与调试、Terre 连接配置、空间变量同步
- **状态:** ?开发中
- **最后更新:** 2026-01-17

## 入口与目录

- 目录：`app/webGAL/`

## 关键约定（本项目）

- 实时渲染创建游戏：不使用模板（不传 `templateDir`），创建失败直接返回失败
- 实时渲染设置：Terre 端口可配置，设置改为 IndexedDB 持久化
- 空间变量系统：
  - 导演控制台“设置变量”发送 `WEBGAL_VAR(11)` 结构化消息（保留 `/var set a=1` 快捷方式）
  - 持久化写入 `space.extra.webgalVars`
  - 实时渲染侧转换为 `setVar:<k>=<v> -global;`
- 立绘/头像选择：
  - 优先使用消息携带的 `avatarId`（通常来自发送时选择的头像）
  - 若消息未携带 `avatarId`，渲染侧会回退到角色本身的 `avatarId`（角色头像）
  - 上传立绘资源时：优先 `spriteUrl`，若为空则使用 `avatarUrl` 作为立绘源

## 相关文档

- app 模块中 WebGAL 事实记录：`helloagents/wiki/modules/app.md`

