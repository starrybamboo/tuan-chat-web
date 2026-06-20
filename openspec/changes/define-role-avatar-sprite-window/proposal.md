## Why

角色头像/立绘窗口已经同时承载头像选择、立绘组管理、上传导入、立绘校正、头像校正、回收站和 WebGAL 预览配置。当前交互和数据约束主要散落在实现与临时讨论里，需要沉淀为可审查的规格，避免后续继续在“头像”“立绘”“立绘组”之间反复重做流程。

## What Changes

- 定义角色头像/立绘窗口的整体信息架构：左侧头像与立绘组导航，右侧头像设置、立绘校正、头像校正、回收站。
- 定义头像、立绘、原图、立绘组的字段语义和裁剪顺序：上传原图 -> 立绘校正 -> 头像校正。
- 定义立绘组作为“文件夹/批量对象”的交互：点击组为选中组，显式进入组内后才切换列表视图。
- 定义单个上传、批量上传、批量选择、拖拽入组、新建立绘组、绑定已有立绘组的统一流程。
- 定义裁剪锁定与强制顺序：已绑定立绘组的头像按组配置批量编辑；任何立绘校正完成后必须进入头像校正。
- 定义 WebGAL 相关要求：`spriteTransform` 与立绘组 `compositionConfig` 一起维护，合成使用 fileId 和裁剪上下文，不依赖旧 URL 字段。
- 定义失败、部分成功、回收站、删除恢复等状态反馈要求。

## Capabilities

### New Capabilities

- `role-avatar-sprite-window`: Web 角色头像/立绘管理窗口，包括头像列表、立绘组、上传导入、立绘校正、头像校正、头像设置、回收站和 WebGAL 合成参数维护。

### Modified Capabilities

<!-- 无当前前端仓已有 capability 需要修改。全局 role-management spec 可在本 change 通过审查后再同步。 -->

## Impact

- `apps/web/app/components/Role/sprite/SpriteSettingsPopup.tsx` — 窗口状态、左侧列表、立绘组选择、批量对象、tab 编排。
- `apps/web/app/components/Role/sprite/Tabs/SpriteCropper.tsx` — 立绘/头像裁剪交互、批量裁剪、立绘组配置更新、裁剪完成回调。
- `apps/web/app/components/Role/sprite/Tabs/SpriteListGrid.tsx` — 头像列表、分类折叠、上传入口、拖拽、多选、删除。
- `apps/web/app/components/Role/sprite/Tabs/AvatarSettingsTab.tsx` — 单头像名称、分类、立绘组绑定、预览。
- `apps/web/app/components/Role/RoleInfoCard/AvatarUploadCropper.tsx` — 单个/批量上传时选择未分组、已有立绘组或新建立绘组。
- `apps/web/app/components/Role/sprite/avatarCropContext.ts` — 原图到立绘、立绘到头像、立绘组合成配置之间的上下文转换。
- `apps/web/app/components/Role/sprite/roleAvatarMedia.ts` 与 `apps/web/app/components/Role/sprite/utils.ts` — 通过 media fileId 派生展示与裁剪源。
- 后端/API 合同：`RoleAvatar`、`RoleAvatarVariant`、`RoleAvatarVariantCompositionConfig`、`/avatar`、`/avatar/variant`、媒体上传与裁剪接口。
