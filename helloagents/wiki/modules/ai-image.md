# ai-image

## 目的

记录本项目 AI 生图（NovelAI）相关页面、请求模式（同源代理/直连/Electron IPC）、token 与模型列表策略，便于排查与维护。

## 模块概述

- **职责:** AI 生图页面、生成参数与历史、请求方式切换、Electron 代理适配
- **状态:** ?开发中（部分路由仅开发环境启用）
- **最后更新:** 2026-01-17

## 入口与目录

- 路由：`/ai-image`
- 路由文件：`app/routes/aiImage.tsx`

## 关键约定（本项目）

- Web 环境默认使用同源代理：`/api/novelapi/*`
- `/user/*` 元数据接口固定走 `https://api.novelai.net`（用于模型/设置拉取）
- `pst-*` token 无法访问部分 `/user/*` 元数据接口（403）时，模型列表降级为内置列表
- Electron 环境默认走 IPC 代理请求（主进程代发）

## 相关文档

- 项目概览：`helloagents/wiki/overview.md`
- app 模块中 AI 生图事实记录：`helloagents/wiki/modules/app.md`

