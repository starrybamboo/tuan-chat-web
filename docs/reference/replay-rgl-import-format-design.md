# Replay RGL 导入格式设计草案

状态：草案  
更新时间：2026-06-17

本文记录团剧共创 replay 导入的新格式方案。目标是以回声工坊 / RplGen 的 RGL 写法为主要参考，让导入脚本保持人类可读，同时复用团剧共创现有“导入对话”和消息发送链路。

## 设计原则

导入分为两个阶段：

1. 素材导入：负责上传图片、音频，创建或更新角色头像/立绘，建立名字索引。
2. 消息导入：只写人类可读脚本，通过名字引用已导入素材，不在消息脚本里写 `fileId`，不计算 `spriteTransform`，不上传文件。

RGL 消息脚本里的 `<>` 推荐写团剧共创底层真实 annotation ID；为兼容回声工坊/RplGen 风格，解析器也接受一组固定短别名，并在解析期立即归一化到底层 annotation ID。后续 resolver、消息请求和素材包里只保存底层 ID，不保存别名。

支持的别名示例：

```txt
<enter>       -> figure.anim.enter
<exit>        -> figure.anim.exit
<shake>       -> figure.anim.ba-shake
<bigshake>    -> figure.anim.ba-bigshake
<jump>        -> figure.anim.ba-jump
<jump2>       -> figure.anim.ba-jump-twice
<down>        -> figure.anim.ba-down
<background>  -> sys:bg
<BGM>         -> sys:bgm
<SE>          -> sys:se
<CG>          -> sys:cg
<image>       -> image.show
<left-center> -> figure.pos.left-center
```

仍不支持这类带参数/状态语义的回声工坊命令：

```txt
<figure:left-center>
<figure>:NA
```

## 素材导入

素材导入可以在本地准备阶段使用独立素材清单，例如 `assets.json`、`replay-assets.json` 或 `local-assets.json`。进入团剧共创前端导入时，已上传完成后的导入期清单统一称为 `asset-manifest.json`；这个文件只在导入期消费，不保存进素材包。

示例：

```json
{
  "roles": {
    "烈": {
      "avatars": {
        "震惊": {
          "kind": "character-avatar-bust",
          "file": "images/retsu/shocked.webp"
        }
      }
    },
    "丰聪耳神子": {
      "avatars": {
        "闭眼平静": {
          "kind": "character-avatar-bust",
          "file": "images/miko/calm.webp"
        },
        "全身半睁静眼": {
          "kind": "character-sprite",
          "file": "images/miko/sprite.webp"
        }
      }
    }
  },
  "media": {
    "backgrounds": {
      "永远亭夜晚": {
        "file": "backgrounds/eientei-night.webp"
      }
    },
    "bgm": {
      "月まで届け、不死の煙": {
        "file": "bgm/moon.mp3"
      }
    }
  }
}
```

本地准备阶段的 `file` 字段只用于上传。上传工具会把它转换为 `fileId`、`fileName`、`width/height/size`、音频 `second` 等后端对象信息，并输出导入期 `asset-manifest.json`；输出后的 JSON 不再保留本地路径。前端“通用素材”和“角色素材”两个 manifest 按钮只消费这种已上传完成的 `asset-manifest.json`。

房间内 RGL 导入窗口提供“本地素材清单”入口，用于选择一个包含素材清单和素材文件的目录，先上传本地文件并生成导入期 manifest，再同时导入通用素材和角色素材。局内素材库页也提供“上传本地 Replay 素材”入口，但只处理 `media` 通用素材；角色素材需要在房间 RGL 导入窗口导入，因为它依赖当前房间可用角色。当前前端直接识别 JSON 清单文件，优先文件名为 `assets.json`、`replay-assets.json`、`local-assets.json` 或 `asset-manifest.json`；目录中存在多个非约定 JSON 文件时会失败，避免误选清单。

### 角色素材

头像、立绘、`manga-avatar` 都落到角色头像体系，也就是 `RoleAvatar`。

素材阶段负责写入：

- `avatarTitle.label`：差分名。
- `avatarFileId`：聊天头像图。
- `spriteFileId`：WebGAL 舞台图。
- `originFileId`：上传源图。
- `spriteTransform`：按素材类型计算出的 WebGAL 变换参数。

角色素材唯一键：

```txt
角色名 + 差分名
```

例如消息脚本中的：

```txt
[丰聪耳神子.闭眼平静]
```

会解析到同名角色下 `avatarTitle.label === "闭眼平静"` 的 `RoleAvatar`。

同一个角色下差分名必须唯一。出现重名时导入失败，不自动选择第一个，也不 fallback 到默认头像。

前端 RGL 导入窗口支持读取 `asset-manifest.json` 的 `roles` 段。这里的图片必须已经上传到后端，所以写 `fileId`，不写本地文件路径：

```json
{
  "roles": {
    "丰聪耳神子": {
      "avatars": {
        "闭眼平静": {
          "kind": "character-avatar-bust",
          "fileId": 9001,
          "fileName": "miko-calm.webp",
          "width": 512,
          "height": 512,
          "hasAlpha": true
        },
        "全身半睁静眼": {
          "kind": "character-sprite",
          "fileId": 9002,
          "fileName": "miko-sprite.webp",
          "width": 900,
          "height": 1600,
          "hasAlpha": true,
          "visibleBounds": {
            "x": 80,
            "y": 10,
            "width": 740,
            "height": 1540
          }
        }
      }
    }
  }
}
```

导入行为：

- 角色素材导入时，如果 manifest 中的角色不存在于当前房间可用角色中，导入器会自动创建普通角色并加入当前房间，再继续写入该角色的 `RoleAvatar` 差分。
- 若同角色下已有同名差分，则更新该 `RoleAvatar`。
- 若同角色下没有同名差分，则创建一个新 `RoleAvatar`，再写入文件、标题和 `spriteTransform`。
- `avatarFileId`、`spriteFileId`、`originFileId` 默认都使用 `fileId`；manifest 中显式写同名字段时可覆盖，但覆盖值必须是正数，否则导入失败。
- `hasAlpha` 可选；一旦提供，必须是 JSON 布尔值 `true` / `false`，不能写成字符串或数字。
- `visibleBounds` 可选；一旦提供，必须是包含数值 `x/y/width/height` 的对象，并且边界必须落在 `width/height` 描述的图片范围内。导入器不会静默夹取越界值，避免立绘或头像的舞台 transform 被错误数据带偏。

### 素材类型

`kind` 决定聊天头像和 WebGAL 舞台图如何使用：

| kind | 聊天头像 | WebGAL 舞台 | transform |
| --- | --- | --- | --- |
| `character-avatar-bust` | 使用该图 | 使用该图 | 头像式，下边缘对齐 |
| `character-avatar-chat` | 使用该图 | 使用该图 | 头像式，下边缘对齐 |
| `character-sprite` | 使用该图 | 使用该图 | 立绘式 / cowboy shot |
| `manga-avatar` | 使用原图 | 使用原图 | 漫画头像保守缩放，不抠图 |

这里的核心规则是：头像源图就是头像式舞台渲染，立绘源图就是立绘式舞台渲染。不能因为同角色存在立绘，就把头像差分的舞台图替换成那张立绘。

### 通用素材

背景、CG、BGM、SE 落到局内素材包。

现有后端已有 `/space/materialPackage`，素材包内容保存 `MessageDraft` 树，并会同步 `extra` 里的媒体引用，避免素材文件被清理。

通用素材建议落库形式：

| 素材 | 消息类型 | annotations |
| --- | --- | --- |
| 背景 | `IMG` | `sys:bg` |
| CG | `IMG` | `sys:cg` 或 `image.show` |
| BGM | `SOUND` | `sys:bgm` |
| SE | `SOUND` | `sys:se` |

素材导入完成后生成 `asset-manifest.json`，记录脚本名字到后端对象的解析结果。
该文件只作为导入期文件使用，不保存进局内素材包，也不作为运行时业务数据。

前端局内素材包页和房间内 RGL 导入窗口都支持导入已上传完成后的 `asset-manifest.json`。该 JSON 不包含本地文件路径，通用素材引用已经上传到后端后的 `fileId`：

```json
{
  "package": {
    "name": "Replay 导入素材 / opus-88",
    "description": "opus-88 replay 通用素材"
  },
  "media": {
    "backgrounds": {
      "永远亭夜晚": {
        "fileId": 9101,
        "fileName": "eientei-night.webp",
        "width": 1920,
        "height": 1080,
        "size": 123456
      }
    },
    "bgm": {
      "战斗曲": {
        "fileId": 9201,
        "fileName": "battle.mp3",
        "size": 456789,
        "second": 180
      }
    },
    "se": {
      "挥刀": {
        "fileId": 9301,
        "fileName": "slash.wav",
        "size": 12345
      }
    },
    "cg": {
      "开场图": {
        "fileId": 9401,
        "fileName": "opening.webp",
        "width": 1280,
        "height": 720,
        "size": 234567
      }
    },
    "references": {
      "人物卡展示图": {
        "fileId": 9501,
        "fileName": "role-card.webp",
        "width": 1000,
        "height": 1200,
        "size": 345678
      }
    }
  }
}
```

`media` 每个分组里的 key 可以写相对路径，用 `/` 分隔。路径默认相对固定分组，例如 `references` 下的 `"人物卡/展示图"` 会生成 `资料/人物卡/展示图`；如果手工写成 `"资料/人物卡/展示图"`，导入器会把重复的根分组归一化掉，仍然生成同一棵树。归一化后路径冲突会直接失败，例如同一分组内不能同时存在 `"人物卡"` 和 `"人物卡/展示图"`。

素材条目可以额外写 `annotations` 数组，但数组里同样只能写团剧底层真实 annotation ID，不能写 `<enter>`、`<shake>` 这类别名；未知 ID 或非数组写法会在导入期失败。

导入时若当前空间已有同名 replay 素材包，会按生成产物进行破坏性重写；否则新建。无论新建还是重写，`asset-manifest.json` 本身都不会成为素材包节点。房间内 RGL 导入窗口的“通用素材”按钮读取 `media` 段；“角色素材”按钮读取 `roles` 段，因此同一个 manifest 可以分两步导入。

建议导入器只维护一个 replay 专用局内素材包，并允许对这个素材包做破坏性重写。素材包是生成产物，不建议和用户手工维护的素材混用。

建议结构：

```txt
Replay 导入素材 / opus-88
├─ 背景
│  ├─ 永远亭夜晚
│  └─ 博丽神社白天
├─ BGM
│  ├─ 战斗曲
│  └─ 月まで届け、不死の煙
├─ SE
│  └─ 挥刀
├─ CG
│  └─ 开场图
└─ 资料
   └─ 人物卡展示图
```

叶子节点都是 `material`，每个 material 里放一组 `MessageDraft`。素材包内不额外保存 `导入索引/manifest` 节点。通用素材需要重新建立索引时，可以从局内素材包树扫描 `背景/*`、`BGM/*`、`SE/*`、`CG/*`、`资料/*` 等固定分组重建；角色素材索引从 `RoleAvatar` 重建。

## 消息脚本

消息脚本建议使用 `.rgl`、`.txt` 或 `.md` 保存，内容扩展 RGL 风格：

```txt
[角色.差分]<annotation...>:正文
[显示名=角色.差分]<annotation...>:正文
```

示例：

```txt
<sys:bg>:永远亭夜晚

# 第一幕
---

<sys:bgm>:月まで届け、不死の煙

[烈.震惊]<figure.pos.left-center><figure.anim.enter><dialog.next>:

[旁白]<dialog.next>:夜色渐深。
竹林深处传来响声。

[丰聪耳神子.闭眼平静]<figure.pos.right-center>:你在说什么？

[师匠=八意永琳.默认]<figure.pos.right-center>:先喝茶。
```

规则：

- `[]` 中的 `角色.差分` 解析到素材阶段建立的 `roleId/avatarId`。
- 如果原文显示名和绑定角色名不同，可以写 `[显示名=角色.差分]`。左侧只作为导入后的 `speakerName/customRoleName`，右侧仍然严格匹配当前房间角色和 `RoleAvatar` 差分，例如 `[师匠=八意永琳.默认]`。
- 旁白可写 `[旁白]<annotation...>:正文` 或 `[Narrator]<annotation...>:正文`，导入为特殊旁白角色，不解析头像。
- `<>` 中推荐写团剧底层 annotation ID；也可以写固定短别名，例如 `<enter>`、`<shake>`、`<background>`、`<BGM>`，解析器会立即归一化为底层 ID。
- 有 `[]` 说话人时，`:` 后只放正文，不写 `勇伯：`、`神子：` 这类说话人前缀。
- 没有 `[]` 说话人、且 annotation 是媒体类时，`:` 后必须放素材包里的素材名。
- 只有清理类和场景特效控制可以留空，例如 `<figure.clear>:`、`<background.clear>:`、`<bgm.clear>:`、`<image.clear>:`、`<scene.effect.rain>:`、`<scene.effect.stop>:`。
- 空正文允许，用于切头像、切立绘、补站位、播放无文本演出。
- 空正文需要立即执行后续 WebGAL 语句时，显式加 `<dialog.next>`。
- 对白或旁白后的非空、非 RGL 语句行会并入上一条对白/旁白，作为多行正文。素材行、清场行和骰子块不会吃续行。
- `# ...`、`// ...` 和 `---` 可作为人工注释或视觉分隔线，解析时会跳过；骰子块内部也会跳过这些注释和分隔线。
- 解析器会先把固定短别名翻译为底层 annotation，再校验 annotation 是否存在；未知别名仍然失败。

导入窗口会在 RGL 模式下显示对白、旁白、素材、骰子、控制事件的数量。导入前应先看这个分布是否符合预期，例如骰子不应被吞成旁白，素材引用不应显示为普通对白。

### 素材引用行

背景、音频和 CG 推荐直接写底层 ID，也兼容 `<background>`、`<BGM>`、`<SE>`、`<CG>`、`<image>` 这些固定别名。不支持 `[@背景=...]` 这类额外字段语法。

建议写法：

```txt
<sys:bg>:永远亭夜晚
<sys:bgm>:月まで届け、不死の煙
<sys:se>:挥刀音效
<sys:cg>:开场图
<image.show>:人物卡展示图
<image.show>:人物卡/展示图
```

这里的 `<>` 可以写真实 annotation ID 或固定短别名；冒号后的文本是素材包里的素材名，用来查 `asset-manifest.json` 或局内素材包索引。若写固定别名，解析器会先归一化到底层 ID，再按同一套素材包索引规则查找。

解析规则：

- `<sys:bg>:永远亭夜晚`：从素材包查背景素材 `永远亭夜晚`，生成 `IMG + sys:bg` 消息。
- `<sys:bgm>:战斗曲`：从素材包查 BGM 素材 `战斗曲`，生成 `SOUND + sys:bgm` 消息。
- `<sys:se>:挥刀音效`：从素材包查 SE 素材 `挥刀音效`，生成 `SOUND + sys:se` 消息。
- `<sys:cg>:开场图` / `<image.show>:人物卡展示图`：从素材包查图片素材，生成对应图片展示消息。
- 冒号后可以写相对分组路径，例如 `<image.show>:人物卡/展示图` 会在 `CG/人物卡/展示图`、`资料/人物卡/展示图`、`展示图/人物卡/展示图` 等 `image.show` 允许分组下查找。若多个分组同时命中，导入失败，要求改写为完整路径，例如 `<image.show>:资料/人物卡/展示图`。
- 对于背景、BGM 和 SE，也可以省略固定根分组，例如 `<sys:bg>:场景/永远亭夜晚` 会查 `背景/场景/永远亭夜晚`。

清场和停止播放也直接写底层 ID：

```txt
<figure.clear>:
<background.clear>:
<bgm.clear>:
<image.clear>:
<scene.effect.stop>:
```

## 骰子

安科骰子使用块语法，保持“说明先显示，结果后显示”，避免 WebGAL 演出提前剧透。

示例：

```txt
<dice>:
dicer: 海豹一号机
cmd: 【2#1d10：】
1. 继续观察
2. 直接行动
=> 【1d10:2】；2 直接行动
第一轮结算。
=> 【1d10:1】；1 继续观察
第二轮结算。
```

编译规则：

- 块头可写 `<dice>:` 或 `<dice>：`；这只是中英文冒号兼容，不是 annotation ID 映射。
- `dicer:` 可选，表示骰后回复的显示名；省略时默认使用 `骰娘`。这个字段不是 annotation，不参与 `<>` 的底层 ID 校验。
- `content` / `extra.diceTurn.command` 放骰前内容：问题、选项、规则，不包含命中结果。
- `extra.diceTurn.replies[].content` 放骰后结果：实际掷骰、命中项、即时结算。
- 一个骰子块可以写多个 `=>`，每个 `=>` 会成为 `extra.diceTurn.replies[]` 的一条回复；`=>` 后面的非 RGL 普通行并入当前这条骰后回复。
- 如果骰后有角色反应，必须作为后续独立消息出现，不塞进骰前说明。

## 现有导入链路增强

前端继续增强 `importChatMessageRequestBuilder.ts`，不另起一套手写 JSON 导入。

现有普通导入中间结构只支持：

```ts
{
  roleId,
  content,
  speakerName,
  figurePosition,
  diceTurn,
}
```

新导入编译后应扩展为：

```ts
{
  roleId,
  avatarId,
  speakerName,
  content,
  messageType,
  annotations,
  extra,
  webgal,
}
```

导入器负责把 RGL 文本编译成这个中间结构，然后继续走现有 `ChatMessageRequest` 构建和批量发送链路。

普通文本导入仍然可以保留旧能力；RGL 导入是同一链路的增强输入，不是独立的 live import JSON。

## 失败策略

导入器必须严格失败，不做静默猜测：

- 角色素材导入找不到角色：自动创建普通角色并加入当前房间，然后继续导入该角色素材。
- RGL 消息导入找不到角色：失败；消息导入阶段永远不自动创建角色。
- RGL 消息导入找不到差分：失败。
- 同角色下差分重名：失败。
- 通用素材名重名：失败。
- annotation ID 不存在：失败。
- 消息正文残留显式说话人前缀：失败或强警告。
- 消息引用了未导入素材：失败。

特别禁止：

- 找不到头像时自动使用默认头像。
- RGL 消息导入阶段找不到同名角色时自动创建一批用户已经删除的角色。
- 同角色头像和立绘互相替代。
- 在素材 manifest 的 `annotations` 数组中写 `<enter>`、`<shake>`、`<BGM>` 等脚本别名；manifest 仍必须写底层 annotation ID。
- 将 `[@背景=...]`、`[@音频=...]` 等字段语法作为素材引用主格式。

## 和回声工坊格式的关系

本方案参考回声工坊 RGL 的可读结构：

```txt
[角色.差分]<方法>:正文
```

但不完全兼容回声工坊语义：

- 回声工坊的 `<方法>` 是它自己的方法/动画名；团剧共创只兼容一组固定短别名，且解析后立即变成真实 annotation ID。
- 回声工坊通过角色表和媒体表声明素材；团剧共创素材阶段直接落到 `RoleAvatar` 和局内素材包。
- 回声工坊原生骰子块用于视频生成；团剧共创骰子块编译成 `extra.diceTurn`，保持聊天室骰子交互形态。
- 团剧共创额外要求 `roleId/avatarId/messageType/annotations/extra/webgal` 能完整落到消息请求。

## 当前取舍

- 角色素材导入负责补齐缺失角色；RGL 消息导入只消费已经存在的角色和差分，不创建角色。
