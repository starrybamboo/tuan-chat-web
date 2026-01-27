# 任务清单: 角色渲染预览修改头像

目录: `helloagents/plan/202601232244_role-avatar-render-edit/`

---

## 1. 预览交互调整
- [√] 1.1 在 `app/components/Role/sprite/Tabs/PreviewTab.tsx` 中新增渲染预览内“修改头像”入口，复用上传裁剪并更新 avatarId 内容
- [√] 1.2 在 `app/components/Role/sprite/Tabs/AvatarSettingsTab.tsx` 中移除原“替换头像”入口，避免交互重复

## 2. 组件复用
- [√] 2.1 确保 `CharacterCopper` 弹窗状态 key 隔离，避免冲突

## 3. 文档更新
- [√] 3.1 更新 `helloagents/wiki/modules/app.md` 说明替换入口位置
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 记录交互调整

## 4. 测试
- [-] 4.1 手动验证角色页面渲染预览中修改头像流程（未执行）
