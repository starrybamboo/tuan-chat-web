# 图片压缩标准

本文档记录前端图片上传与展示的统一压缩标准。实现侧以 `app/utils/imgCompressUtils.ts` 中的 `IMAGE_COMPRESSION_PRESETS` 为准。

## 核心原则

1. 同一类图片尽量复用同一压缩标准，避免同尺寸不同体积上限。
2. 展示图用于 Web 端加载速度与带宽控制；original 质量档用于后续裁剪、导出和桌面端打包，但图片 original 也必须是 WebP。
3. 小尺寸头像统一使用 `200px / 40KB`，`avatarThumb` 与 `smallThumbnail` 复用同一个 `image/low` 物理档。
4. 大图预览、二次裁剪、桌面端打包不得依赖缩略图，应使用对应的 original 字段。

## 预设标准

| Preset | 用途 | 最大边 | 目标体积 | 质量 |
| --- | --- | ---: | ---: | ---: |
| `originalImage` | 图片 original | 2560px | 3MiB | 0.82 |
| `smallThumbnail` | 非头像类小缩略图 | 200px | 40KB | 0.72 |
| `listCover` | 普通列表封面 | 512px | 150KB | 0.76 |
| `cardCover` | 卡片封面 | 512px | 150KB | 0.76 |
| `contentImage` | 正文图片 | 2560px | 800KB | 0.82 |
| `videoCover` | 视频封面 | 2560px | 800KB | 0.82 |
| `hdCover` | 高清封面 | 2560px | 800KB | 0.82 |
| `avatar` | 头像展示图 | 512px | 150KB | 0.76 |
| `avatarThumb` | 头像缩略图 | 200px | 40KB | 0.72 |

## 头像媒体语义

| 媒体文件 ID | 质量档 | 标准 | 用途 |
| --- | --- | --- | --- |
| `avatarFileId` | `original` | `originalImage`，2560px / 3MiB WebP | 头像二次裁剪、导出、桌面端高质量资源 |
| `avatarFileId` | `medium` | `avatar`，512px / 150KB | 角色详情、头像管理、中大尺寸头像展示 |
| `avatarFileId` | `low` | `avatarThumb`，200px / 40KB | 消息头像、角色列表、选择器、提及、小尺寸头像 |

## 统一命名

头像类实体统一保存 `avatarFileId`。前端需要展示时，通过媒体地址工具按质量档派生实际 `src`。

| 实体 | 媒体文件字段 | 小尺寸展示 | 原图/高质量展示 |
| --- | --- | --- | --- |
| 用户 | `avatarFileId` | `low` | `original` |
| 角色头像 | `avatarFileId` | `low` | `original` |
| 空间 | `avatarFileId` | `low` | `original` |
| 房间 | `avatarFileId` | `low` | `original` |

## 列表头像规则

空间、房间、文档列表头像统一使用 `avatarThumb` preset：

| 场景 | Preset | 标准 |
| --- | --- | --- |
| 空间列表头像 | `avatarThumb` | 200px / 40KB |
| 房间列表头像 | `avatarThumb` | 200px / 40KB |
| 文档列表头像 | `avatarThumb` | 200px / 40KB |

## 使用规则

1. 展示尺寸小于等于 200px 的头像，应通过 `avatarFileId` 派生 `low` 质量档。
2. 展示尺寸大于 200px 的普通头像，应通过 `avatarFileId` 派生 `medium` 质量档。
3. 需要再次裁剪、打包、导出或保留质量时，应使用对应媒体文件 ID 的 `original` 质量档；角色立绘裁剪链路优先使用 `spriteFileId`，原始上传源使用 `originFileId`。
4. 不应为小尺寸头像再引入新的独立体积标准。
5. 如果需要新增图片场景，先复用现有 preset；只有现有 preset 无法表达真实用途时，才新增 preset 并更新本文档。

## 回填脚本

历史空间/房间头像回填脚本使用同一列表头像标准：

- 脚本：`scripts/backfill-space-avatar-compression.mjs`
- 目标：200px / 40KB

如果调整 `avatarThumb` 标准，必须同步更新该脚本的 `TARGET_MAX_EDGE` 与 `TARGET_MAX_BYTES`。
