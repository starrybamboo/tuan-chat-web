# 角色图片裁剪与原图存储 PRD

## 背景

角色图片链路需要同时满足两个运行场景：

1. Web 端继续使用压缩后的图片，以保证加载速度和带宽成本。
2. 桌面端打包时需要保留裁剪后的高质量资源，以便在非网页环境下获得更好的图像表现。

同时，后续要支持“立绘局部替换”，因此头像裁剪不能再直接从最初上传图出发，而必须建立在“立绘裁剪结果”之上。

## 目标

1. 保持 `avatarUrl`、`spriteUrl` 语义不变。
2. 明确 `avatarOriginalUrl`、`spriteOriginalUrl` 语义为“裁剪后但不走压缩流程”的图片资源。
3. 明确 `originUrl` 语义为“最初上传、未经过任何裁剪和压缩处理的原图”。
4. 调整头像裁剪流程：头像必须从立绘裁剪结果继续裁出。
5. 为未来“立绘局部替换”和桌面端资源优化提供正确的数据基础。

## 非目标

1. 本期不改变 Web 端默认展示时优先使用压缩图的策略。
2. 本期不实现完整的“立绘局部替换”编辑能力，只完成其所需的数据与裁剪前提。
3. 本期不引入新的图片超分、修复或 AI 增强流程。

## 字段语义

| 字段 | 语义 | 是否裁剪 | 是否压缩 | 主要用途 |
| --- | --- | --- | --- | --- |
| `originUrl` | 用户最初上传的原始图片 | 否 | 否 | 源文件留存、兜底、后续高级处理 |
| `spriteOriginalUrl` | 立绘裁剪后的原图 | 是 | 否 | 桌面端打包、高质量导出、未来局部替换基底 |
| `spriteUrl` | 立绘裁剪后的展示图 | 是 | 是 | Web 展示、普通运行时加载 |
| `avatarOriginalUrl` | 头像裁剪后的原图 | 是 | 否 | 桌面端打包、高质量头像资源 |
| `avatarUrl` | 头像裁剪后的展示图 | 是 | 是 | Web 展示、普通头像加载 |
| `avatarThumbUrl` | 头像裁剪后的缩略图 | 是 | 是，且更小 | 列表、小尺寸头像、轻量场景 |

## 核心规则

1. `avatarUrl`、`spriteUrl` 保持现有定义不变，仍然表示“裁剪后且压缩”的资源。
2. `avatarOriginalUrl`、`spriteOriginalUrl` 表示“裁剪后但不走压缩流程”的资源。
3. `originUrl` 表示“最初上传的未处理原图”。
4. 头像裁剪的输入源必须是“立绘裁剪结果”，不能直接从 `originUrl` 裁头像。
5. 立绘是头像的上游素材，头像是立绘的下游裁剪结果。
6. 未来若做立绘局部替换，应优先基于 `spriteOriginalUrl`，而不是直接使用 `originUrl`。

## 用户流程

| 步骤 | 用户动作 | 系统输出 |
| --- | --- | --- |
| 1 | 上传一张原始图片 | 保存 `originUrl` |
| 2 | 对原始图片进行立绘裁剪 | 生成 `spriteOriginalUrl`、`spriteUrl` |
| 3 | 进入头像裁剪 | 裁剪输入源固定为第 2 步的立绘裁剪结果 |
| 4 | 对立绘结果继续裁头像 | 生成 `avatarOriginalUrl`、`avatarUrl`、`avatarThumbUrl` |
| 5 | 保存头像记录 | 同时保留原始源图、立绘原图/展示图、头像原图/展示图 |

## 交互要求

1. 裁剪交互必须是明确的两阶段流程：
   1. 立绘裁剪
   2. 头像裁剪
2. 进入头像裁剪阶段时，画布内容必须来自立绘裁剪结果。
3. 如果用户重新裁立绘，后续头像裁剪必须基于最新的立绘裁剪结果。
4. 用户看到的头像裁剪源，应与最终 `spriteOriginalUrl` 对应的内容一致。

## 数据要求

1. 创建或更新角色头像时，系统必须能够同时保存以下字段：
   1. `originUrl`
   2. `spriteOriginalUrl`
   3. `spriteUrl`
   4. `avatarOriginalUrl`
   5. `avatarUrl`
   6. `avatarThumbUrl`
2. 更新立绘时，不应误覆盖头像相关字段。
3. 更新头像时，不应误覆盖立绘相关字段。
4. 对历史数据做兼容时，如果缺少 `spriteOriginalUrl` 或 `avatarOriginalUrl`，允许暂时退回旧字段，但新上传链路必须完整写入新字段。

## 桌面端打包要求

1. Web 端继续优先消费 `avatarUrl`、`avatarThumbUrl`、`spriteUrl`。
2. 桌面端打包流程应优先消费 `avatarOriginalUrl`、`spriteOriginalUrl`。
3. 如果桌面端原图字段缺失，允许回退到压缩图，但这属于降级行为。
4. `originUrl` 不直接作为桌面端展示资源使用，除非未来新增独立处理流程。

## 兼容性要求

1. 老数据允许只有 `originUrl`、`avatarUrl`、`spriteUrl`。
2. 新数据必须完整保存三层资源：
   1. 未处理原图
   2. 裁剪后无压缩图
   3. 裁剪后压缩图
3. 前端读取“原图裁剪源”时，应优先新字段，旧字段仅作兼容兜底。

## 验收标准

1. 上传一张角色图片后，数据库能同时看到 `originUrl`、`spriteOriginalUrl`、`spriteUrl`、`avatarOriginalUrl`、`avatarUrl`、`avatarThumbUrl`。
2. `originUrl` 对应的资源与用户最初上传文件一致。
3. `spriteOriginalUrl` 与 `spriteUrl` 的裁剪区域一致，但前者不走压缩流程。
4. `avatarOriginalUrl` 与 `avatarUrl` 的裁剪区域一致，但前者不走压缩流程。
5. 头像裁剪源来自立绘裁剪结果，而不是上传原图。
6. Web 端现有角色展示逻辑不退化。
7. 桌面端打包可以直接消费裁剪后的无压缩资源。

## 后续扩展预留

1. 基于 `spriteOriginalUrl` 做立绘局部替换。
2. 基于 `avatarOriginalUrl` 做高质量头像导出。
3. 在桌面端构建阶段增加资源重打包和格式优化。
