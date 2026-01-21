# 技术设计: AI 生图（普通模式）一键出图 + 按 tag 出图

## 技术方案
### 核心技术
- React 页面：`app/routes/aiImage.tsx`
- NL→tags：`convertNaturalLanguageToNovelAiTags`
- 画风预设：`app/utils/aiImageStylePresets.ts`

### 实现要点
1. 普通模式 UI 拆分生成入口
   - 自然语言输入区改为 `input + button` 组合，将“一键出图”放在输入框右侧
   - tags 区标题行增加“按 tag 出图”按钮（仅当当前 tags 非空可用）
2. 逻辑拆分
   - `handleNlGenerate`：读取 `simpleText`，执行 NL→tags，写回 `prompt/negativePrompt`，调用生成
   - `handleTagGenerate`：直接使用当前 `prompt/negativePrompt` 调用生成，不触发 NL→tags
3. 画风 tags 合并与写回
   - 生成前将画风 tags 合并进最终 `prompt/negativePrompt`
   - 在普通模式生成时把最终 tags 写回到文本框，保证用户可见且历史回填一致
4. 删除普通模式底部“生成”按钮
   - 保留专业模式底部“生成/下载/历史”操作区

## 安全与性能
- **安全:** 无 token/IPC/网络端点变更
- **性能:** 仅 UI 结构与局部回调拆分，保持原有请求链路

## 测试与部署
- **测试:**
  - 普通模式：输入自然语言点击“一键出图”成功出图，tags 写回可见
  - 普通模式：编辑 tags 后点击“按 tag 出图”成功出图
  - 普通模式：已选画风在上述两种出图路径中均会合并到最终 tags
- **部署:** 无额外步骤

