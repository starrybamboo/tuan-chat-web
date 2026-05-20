# 图片压缩标准

本文档记录前端图片上传与展示的统一压缩标准。实现侧以 `app/utils/imgCompressUtils.ts` 中的 `IMAGE_COMPRESSION_PRESETS` 为准。

## 核心原则

1. 同一类图片尽量复用同一压缩标准，避免同尺寸不同体积上限。
2. 展示图用于 Web 端加载速度与带宽控制；原图字段用于后续裁剪、导出和桌面端打包。
3. 小尺寸头像统一使用 `200px / 40KB`，`avatarThumb` 与 `smallThumbnail` 复用同一个 `image/low` 物理档。
4. 大图预览、二次裁剪、桌面端打包不得依赖缩略图，应使用对应的 original 字段。

## 预设标准

| Preset | 用途 | 最大边 | 目标体积 | 质量 |
| --- | --- | ---: | ---: | ---: |
| `smallThumbnail` | 非头像类小缩略图 | 200px | 40KB | 0.72 |
| `listCover` | 普通列表封面 | 512px | 150KB | 0.76 |
| `cardCover` | 卡片封面 | 512px | 150KB | 0.76 |
| `contentImage` | 正文图片 | 2560px | 800KB | 0.82 |
| `videoCover` | 视频封面 | 2560px | 800KB | 0.82 |
| `hdCover` | 高清封面 | 2560px | 800KB | 0.82 |
| `avatar` | 头像展示图 | 512px | 150KB | 0.76 |
| `avatarThumb` | 头像缩略图 | 200px | 40KB | 0.72 |

## 头像字段语义

| 字段 | 是否压缩 | 标准 | 用途 |
| --- | --- | --- | --- |
| `avatarOriginalUrl` | 否 | 原图 | 头像二次裁剪、导出、桌面端高质量资源 |
| `avatarUrl` | 是 | `avatar`，512px / 150KB | 角色详情、头像管理、中大尺寸头像展示 |
| `avatarThumbUrl` | 是 | `avatarThumb`，200px / 40KB | 消息头像、角色列表、选择器、提及、小尺寸头像 |

## 统一命名

头像缩略图字段统一命名为 `avatarThumbUrl`。用户头像、角色头像、空间头像、房间头像在 API 响应和前端消费中都应优先使用这个字段表示 200px / 40KB 的小尺寸头像。

| 实体 | 缩略图字段 | 历史兼容字段 | 原图字段 |
| --- | --- | --- | --- |
| 用户 | `avatarThumbUrl` | `avatar` | `originalAvatar` |
| 角色头像 | `avatarThumbUrl` | `avatarUrl` | `avatarOriginalUrl` |
| 空间 | `avatarThumbUrl` | `avatar` | `originalAvatar` |
| 房间 | `avatarThumbUrl` | `avatar` | `originalAvatar` |

空间和房间的 `avatar` 是历史兼容字段，当前仍保留并与 `avatarThumbUrl` 写入同一个缩略图 URL。新代码应读取和提交 `avatarThumbUrl`，只在兼容旧数据或旧接口时回退到 `avatar`。

## 列表头像规则

空间、房间、文档列表头像统一使用 `avatarThumb` preset：

| 场景 | Preset | 标准 |
| --- | --- | --- |
| 空间列表头像 | `avatarThumb` | 200px / 40KB |
| 房间列表头像 | `avatarThumb` | 200px / 40KB |
| 文档列表头像 | `avatarThumb` | 200px / 40KB |

## 使用规则

1. 展示尺寸小于等于 200px 的头像，应优先使用 `avatarThumbUrl`。
2. 展示尺寸大于 200px 的普通头像，应使用 `avatarUrl`。
3. 需要再次裁剪、打包、导出或保留质量时，应使用 `avatarOriginalUrl`、`spriteOriginalUrl` 或 `originUrl`。
4. 不应为小尺寸头像再引入新的独立体积标准。
5. 如果需要新增图片场景，先复用现有 preset；只有现有 preset 无法表达真实用途时，才新增 preset 并更新本文档。

## 回填脚本

历史空间/房间头像回填脚本使用同一列表头像标准：

- 脚本：`scripts/backfill-space-avatar-compression.mjs`
- 目标：200px / 40KB

如果调整 `avatarThumb` 标准，必须同步更新该脚本的 `TARGET_MAX_EDGE` 与 `TARGET_MAX_BYTES`。
