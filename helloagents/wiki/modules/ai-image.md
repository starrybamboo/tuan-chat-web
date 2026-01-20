# ai-image

## 目的

记录本项目 AI 生图（NovelAI）相关页面、请求模式（同源代理/直连/Electron IPC）、token 与模型列表策略，便于排查与维护。

## 模块概述

- **职责:** AI 生图页面、生成参数与历史、请求方式切换、Electron 代理适配
- **状态:** ?开发中（部分路由仅开发环境启用）
- **最后更新:** 2026-01-20

## 入口与目录

- 路由：`/ai-image`
- 路由文件：`app/routes/aiImage.tsx`

## UI 形态

### 普通模式（simple）

- 仅支持 txt2img（不提供 img2img）
- 输入自然语言后由后端转换为 NovelAI tags，前端允许继续编辑 tags 并再次生成
- “画风”选择在普通模式面板中默认展示（无需先点击生成）
- 选择画风后，会在面板中显示已选画风的缩略图，便于确认当前选择
- Seed 规则对齐 NovelAI：Seed < 0 表示随机

### 专业模式（pro）

- 三栏布局：左侧参数 / 中间预览 / 右侧历史
- 固定 txt2img（移除模式选择与 img2img 面板）
- v4/v4.5 支持“背景/角色”结构化 prompt：写入 `v4_prompt`/`v4_negative_prompt` 的 `base_caption` + `char_captions`

## 画风预设（普通模式）

- 图片目录：`app/assets/ai-image/styles/`（文件名即画风 ID，例如 `oil-painting.webp`）
- 画风 tags 配置：`app/utils/aiImageStylePresets.ts`（按文件名 ID 配置 `tags`/`negativeTags`）
- 使用方式：普通模式选择画风可多选，生成时会把画风 tags 合并进最终 prompt（负面同理）

## 关键约定（本项目）

- Web 环境默认使用同源代理：`/api/novelapi/*`
- `/user/*` 元数据接口固定走 `https://api.novelai.net`（用于模型/设置拉取）
- `pst-*` token 无法访问部分 `/user/*` 元数据接口（403）时，模型列表降级为内置列表
- Electron 环境默认走 IPC 代理请求（主进程代发）

## 相关文档

- 项目概览：`helloagents/wiki/overview.md`
- app 模块中 AI 生图事实记录：`helloagents/wiki/modules/app.md`

