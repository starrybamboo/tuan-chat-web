## 1. Spec Review

- [ ] 1.1 审查 `role-avatar-sprite-window` 的窗口边界、字段语义和术语，确认“头像/立绘/原图/立绘组”命名一致
- [ ] 1.2 审查左侧列表、category 折叠、立绘组卡片、组内管理的交互条款
- [ ] 1.3 审查上传、绑定已有组、新建立绘组、拖拽入组的目标选择和失败处理条款
- [ ] 1.4 审查立绘校正后强制头像校正、头像裁剪源必须来自 sprite 的流程条款
- [ ] 1.5 审查 WebGAL `spriteTransform` 与 `compositionConfig` 的同步要求

## 2. Window State and Navigation

- [ ] 2.1 对照 spec 检查 `SpriteSettingsPopup` 中普通头像选择、多选、选中立绘组、进入组内视图四类状态
- [ ] 2.2 确认点击立绘组只选中组，不切换组内视图
- [ ] 2.3 确认“进入组内管理”和返回外层流程稳定，并保持 role/category/variant 语义清晰
- [ ] 2.4 确认移动端 drawer 可以触达桌面端所有头像与立绘组操作

## 3. Upload and Import Flow

- [ ] 3.1 统一单个上传和批量上传的目标选择：未分组、已有立绘组、新建立绘组
- [ ] 3.2 确认上传成功项创建 `originFileId` 后进入立绘校正
- [ ] 3.3 确认上传到已有完整立绘组时使用组配置重建并绑定
- [ ] 3.4 确认上传到新组或不完整组时完成立绘校正和头像校正后再创建/完成组配置
- [ ] 3.5 补齐批量上传部分成功/失败的可见结果和继续成功项的流程

## 4. Crop Pipeline

- [ ] 4.1 确认 sprite crop 只读取 `originFileId` 对应原图
- [ ] 4.2 确认 avatar crop 只读取 `spriteFileId` 对应立绘裁剪结果
- [ ] 4.3 确认缺少 `spriteFileId` 时头像校正显示“请先完成立绘裁剪”类阻断提示
- [ ] 4.4 确认单张、批量、选中立绘组三种立绘校正成功后都强制进入头像校正
- [ ] 4.5 确认头像裁剪页不再提供独立“应用立绘组”选择器

## 5. Sprite Group Semantics

- [ ] 5.1 确认一个头像最多一个 `variantId`，category 与 variant 独立
- [ ] 5.2 确认组内头像仍按 category 分组展示和上传
- [ ] 5.3 确认立绘组 `compositionConfig` 记录 sprite crop、avatar slot、canvas、source dimensions、sprite transform
- [ ] 5.4 确认选中立绘组时裁剪器以组内头像作为隐式批量对象
- [ ] 5.5 确认编辑立绘组时同步更新头像输出和组配置
- [ ] 5.6 确认绑定已有组时放弃单头像旧裁剪上下文和旧 transform，改用组配置

## 6. Batch, Drag, Delete, Trash

- [ ] 6.1 确认批量设置面板对普通多选和立绘组选中分别显示正确操作
- [ ] 6.2 确认拖拽单个头像或多选头像到组时走同一套绑定已有组流程
- [ ] 6.3 确认批量删除不能删除角色全部头像，并进入回收站
- [ ] 6.4 确认回收站恢复、清空、忙碌态和列表刷新符合 spec

## 7. WebGAL Preview and Export Data

- [ ] 7.1 确认单头像设置页 WebGAL 预览使用 `spriteFileId` 和有效 `spriteTransform`
- [ ] 7.2 确认聊天头像预览使用 `avatarFileId`
- [ ] 7.3 确认立绘组 transform 会同步给组成员和后续绑定头像
- [ ] 7.4 确认 WebGAL 相关导出不依赖废弃 URL 字段作为 canonical 数据

## 8. Testing and Verification

- [ ] 8.1 为 `avatarCropContext`、`roleAvatarMedia` 和相关 utils 补齐或更新单元测试
- [ ] 8.2 为 `SpriteSettingsPopup` 状态选择逻辑补交互测试或可维护的组件测试
- [ ] 8.3 浏览器验证：打开角色头像窗口、点击立绘组、进入组内管理、返回外层
- [ ] 8.4 浏览器验证：单张上传、批量上传、立绘校正后跳头像校正
- [ ] 8.5 浏览器验证：选中立绘组后立绘校正和头像校正都以组为批量对象
- [ ] 8.6 运行 `pnpm --filter @tuanchat/web run typecheck:tsc`
