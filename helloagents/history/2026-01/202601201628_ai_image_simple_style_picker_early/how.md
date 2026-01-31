# 技术设计: AI 生图（普通模式）画风选择前置展示

## 技术方案
### 核心技术
- React（TSX）页面：`app/routes/aiImage.tsx`
- 画风预设：`app/utils/aiImageStylePresets.ts`
- tags 合并：`mergeTagString(...)`

### 实现要点
- 调整普通模式（`uiMode === "simple"`）的 UI 条件渲染：
  - 将“画风”选择区从 `prompt.trim()` 的分支中移出，改为在普通模式下始终展示。
  - 保留“最终 tags（可编辑）”区仅在 `prompt.trim()` 非空时展示，避免页面首次进入时出现空 textarea。
- 生成逻辑保持不变：
  - 点击“生成”时仍通过 `mergeTagString(prompt, selectedStyleTags)` 与 `mergeTagString(negativePrompt, selectedStyleNegativeTags)` 合并画风 tags（无论 prompt 来源为自然语言转换或手动编辑）。
- 交互细节：
  - 页面首次进入可直接打开画风选择弹窗并选择/清空。
  - 若用户在未转换时选择画风，再输入自然语言并生成：画风选择不应被清空。

## 安全与性能
- **安全:** 仅 UI 逻辑调整，不涉及 token/IPC/网络请求变更
- **性能:** 画风选择区为轻量渲染，保持现有 `useMemo` 计算与本地资源加载逻辑

## 测试与部署
- **测试:** 手动回归 `/ai-image` 普通模式：首次进入可见画风；选择画风后生成；清空画风后再次生成；切换到专业模式不受影响
- **部署:** 无额外步骤

