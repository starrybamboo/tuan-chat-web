# 如何做（How）

## 方案概述

在宿主侧 `BlocksuiteDescriptionEditor` 的 edgeless “全屏”逻辑中，保留“画布填充容器高度”的行为，但移除 `fixed inset-0 z-50` 等覆盖式样式，让画布仅在原文档区域内展示。

## 关键改动点

1. **宿主侧（非 iframe 与 iframe 两套 wrapper）**
   - 将 `isEdgelessFullscreen*` 触发的根节点/iframe wrapper 样式从“全屏覆盖”改为“容器内填充”（例如 `h-full min-h-0`，不再使用 `fixed/inset`）。
2. **保持高度策略**
   - 画布模式下继续避免使用内容高度回传驱动 iframe 高度（保持现有逻辑），由父容器高度决定展示区域。
3. **知识库同步**
   - 更新 `helloagents/wiki/modules/app.md` 中关于画布“全屏”描述，改为“占据文档区域”。
   - 记录到 `helloagents/CHANGELOG.md`。

## 风险与规避

- 风险：某些调用场景父容器没有明确高度，导致 `h-full` 表现不理想。
  - 规避：保持原有 `heightConstraintClass` 与 `flex-1/min-h-0` 的布局策略，不引入强制固定高度；必要时由调用方提供高度约束。
