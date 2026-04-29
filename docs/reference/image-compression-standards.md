# 图片压缩标准

本文档记录前端图片上传与展示的统一压缩标准。实现侧以 `app/utils/imgCompressUtils.ts` 中的 `IMAGE_COMPRESSION_PRESETS` 为准。

## 核心原则

1. 同一类图片只保留一个压缩标准，避免同尺寸不同体积上限。
2. 展示图用于 Web 端加载速度与带宽控制；原图字段用于后续裁剪、导出和桌面端打包。
3. 小尺寸头像统一使用 `128px / 40KB`，包括角色头像缩略图、空间列表头像、房间列表头像和文档列表头像。
4. 大图预览、二次裁剪、桌面端打包不得依赖缩略图，应使用对应的 original 字段。

## 预设标准

| Preset | 用途 | 最大边 | 目标体积 | 质量 |
| --- | --- | ---: | ---: | ---: |
| `smallThumbnail` | 非头像类小缩略图 | 200px | 50KB | 0.72 |
| `listCover` | 普通列表封面 | 320px | 120KB | 0.72 |
| `cardCover` | 卡片封面 | 480px | 180KB | 0.74 |
| `contentImage` | 正文图片 | 800px | 300KB | 0.76 |
| `videoCover` | 视频封面 | 1280px | 1024KB | 0.78 |
| `hdCover` | 高清封面 | 1920px | 2048KB | 0.82 |
| `avatar` | 头像展示图 | 512px | 150KB | 0.76 |
| `avatarThumb` | 头像缩略图 | 128px | 40KB | 0.72 |
| `spaceAvatar` | 列表头像缩略图 | 128px | 40KB | 0.72 |

## 头像字段语义

| 字段 | 是否压缩 | 标准 | 用途 |
| --- | --- | --- | --- |
| `avatarOriginalUrl` | 否 | 原图 | 头像二次裁剪、导出、桌面端高质量资源 |
| `avatarUrl` | 是 | `avatar`，512px / 150KB | 角色详情、头像管理、中大尺寸头像展示 |
| `avatarThumbUrl` | 是 | `avatarThumb`，128px / 40KB | 消息头像、角色列表、选择器、提及、小尺寸头像 |

## 列表头像规则

空间、房间、文档列表头像统一使用 `spaceAvatar` preset：

| 场景 | Preset | 标准 |
| --- | --- | --- |
| 空间列表头像 | `spaceAvatar` | 128px / 40KB |
| 房间列表头像 | `spaceAvatar` | 128px / 40KB |
| 文档列表头像 | `spaceAvatar` | 128px / 40KB |

`spaceAvatar` 与 `avatarThumb` 的尺寸和体积上限保持一致。保留单独 preset 名称只是为了表达业务场景，不表示另一个压缩标准。

## 使用规则

1. 展示尺寸小于等于 128px 的头像，应优先使用 `avatarThumbUrl` 或 `spaceAvatar` 结果。
2. 展示尺寸大于 128px 的普通头像，应使用 `avatarUrl`。
3. 需要再次裁剪、打包、导出或保留质量时，应使用 `avatarOriginalUrl`、`spriteOriginalUrl` 或 `originUrl`。
4. 不应为 128px 头像再引入 50KB、60KB 等新体积标准。
5. 如果需要新增图片场景，先复用现有 preset；只有现有 preset 无法表达真实用途时，才新增 preset 并更新本文档。

## 回填脚本

历史空间/房间头像回填脚本使用同一列表头像标准：

- 脚本：`scripts/backfill-space-avatar-compression.mjs`
- 目标：128px / 40KB

如果调整 `spaceAvatar` 标准，必须同步更新该脚本的 `TARGET_MAX_EDGE` 与 `TARGET_MAX_BYTES`。
