# 技术设计: AI 生图（/ai-image）UI 重构，对齐 NovelAI Image Generation

## 技术方案

### 核心技术
- TailwindCSS + DaisyUI（不新增 UI 框架）
- React 组件重排与轻量抽取（仅在本页内/或少量 util 组件）

### 实现要点
- 页面布局：
  - 顶部工具条：标题、环境提示（Web/Electron）、Generate 主按钮、基础操作（清空历史等）
  - 主体三段：Prompt/Undesired（左/上）、Image Settings（右/侧栏）、Output/History（中/下）
  - 窄屏响应式：侧栏下沉为折叠区或 tabs，避免信息丢失
- 交互对齐：
  - Prompt 与 Undesired Content 分区（含 UC preset/说明提示）
  - Image Settings 体现“分辨率预设/Steps/Guidance/Seed/Sampler”等核心控件
  - 历史以网格卡片呈现，提供快速查看/下载/删除
- 保持功能：
  - 不改生成请求与解析逻辑
  - 不改 IndexedDB schema，仅调整展示与入口

## 架构决策 ADR

### ADR-001: UI 重构的组件抽取策略
**上下文:** `/ai-image` 单页包含较多 state 与异步逻辑，过度拆分易造成上下文穿透与回归。

**决策:** 以“同文件内分区组件 + 纯展示组件”为主，必要时新增 1 个小的 UI helper 文件；不引入全局状态管理变更。

**理由:** 改动范围可控、便于回滚；更符合“仅 AI 模块 UI 重构”的边界。

## 安全与性能
- **安全:** 不保存 token；不新增外部请求
- **性能:** UI 组件避免不必要的大量 re-render；历史列表限制数量（沿用既有逻辑）

## 测试与部署
- **测试:** `pnpm typecheck`；Web/Electron 手动检查关键路径（txt2img/img2img/历史/下载）
- **部署:** 不变

