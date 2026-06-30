# Replay RGL 导入语法示例

状态：草案  
更新时间：2026-06-28

本文用一段相对完整的 RGL 脚本说明：脚本怎么写，以及团剧共创导入器会把它翻译成什么业务消息。

## 前置素材

示例假设素材导入已经完成。消息导入阶段只按名字查找，不上传文件，也不自动创建角色。

角色差分：

```txt
烈.默认
烈.震惊
烈.受伤
丰聪耳神子.闭眼平静
丰聪耳神子.认真
丰聪耳神子.全身半睁静眼
八意永琳.默认
八意永琳.严肃
```

通用素材：

```txt
背景/永远亭夜晚
BGM/月まで届け、不死の煙
SE/脚步
SE/挥刀
CG/开场图
资料/人物卡展示图
```

## 完整 RGL 示例

```rgl
# RGL 注释行会被跳过
---

<background><replace=30>:永远亭夜晚
<set:BGM>:月まで届け、不死の煙

[旁白]<dialog.next>:永远亭的夜色沉在竹林尽头。
风声里夹着一阵脚步声。

[烈.震惊]<left-center><enter><dialog.next>:
[师匠=八意永琳.默认]<right-center><enter>:你终于来了。

[烈.震惊,丰聪耳神子.闭眼平静]<shake>:别过来。

[丰聪耳神子(60).全身半睁静眼]<right-center><enter>:我只是站在稍远一点的位置。

<image.show>:资料/人物卡展示图

<dice>:
dicer: 海豹一号机
cmd: 【1d10：】
1. 继续观察
2. 直接行动
3. 向师匠询问
4. 神子插手
5. 意外来客
6. 战斗开始
7. 先撤退
8. 立刻冲进去
9. 发现破绽
10. 大事件
=> 【1d10:8】；8 立刻冲进去
烈没有继续等待，直接踏进了永远亭。

[烈.震惊]<left-center><jump>:那我就先进去了！
[师匠=八意永琳.严肃]<right-center><shake>:等等。

<hitpoint>:(烈,hp,-2)
[烈.受伤]<left-center>:啧，还是被擦到了。{挥刀}

<dice>:(敏捷检定,20,12,7)

<bubble>:弹幕一样的短吐槽从屏幕边缘飘过。

<animation>:jump,right-center
<SE>:脚步

<clear>:figure
<bgm.clear>:
<scene.effect.rain>:
[旁白]:雨声盖住了竹林里的动静。
<scene.effect.stop>:
```

## 翻译结果

### 注释和分隔线

```rgl
# RGL 注释行会被跳过
---
```

导入器跳过，不生成消息。

### 背景

```rgl
<background><replace=30>:永远亭夜晚
```

解析阶段：

```txt
<background> -> sys:bg
<replace=30> -> background.anim.enter + background.speed.normal
```

团剧共创消息：

```json
{
  "role": "旁白/系统",
  "messageType": "IMG",
  "content": "素材包中 背景/永远亭夜晚 对应图片消息的 content",
  "annotations": ["sys:bg", "background.anim.enter", "background.speed.normal"],
  "extra": "素材包中该背景图片消息的 extra",
  "webgal": "素材包中该背景图片消息的 webgal"
}
```

业务含义：从 replay 素材包查找背景素材，发送一条背景图片消息，并带背景进入动画。

### BGM

```rgl
<set:BGM>:月まで届け、不死の煙
```

解析阶段：

```txt
<set:BGM> -> sys:bgm
```

团剧共创消息：

```json
{
  "role": "旁白/系统",
  "messageType": "SOUND",
  "annotations": ["sys:bgm"],
  "extra": "素材包中 BGM/月まで届け、不死の煙 对应声音消息的 extra"
}
```

业务含义：从素材包查找 BGM，发送一条 BGM 声音消息。

### 旁白和多行正文

```rgl
[旁白]<dialog.next>:永远亭的夜色沉在竹林尽头。
风声里夹着一阵脚步声。
```

团剧共创消息：

```json
{
  "roleId": "IMPORT_SPECIAL_ROLE_ID.NARRATOR",
  "messageType": "TEXT",
  "content": "永远亭的夜色沉在竹林尽头。\n风声里夹着一阵脚步声。",
  "annotations": ["dialog.next"],
  "extra": {}
}
```

业务含义：没有新 RGL 语句开头的普通行，会并入上一条对白或旁白。

### 空白角色消息

```rgl
[烈.震惊]<left-center><enter><dialog.next>:
```

解析阶段：

```txt
<left-center> -> figure.pos.left-center
<enter> -> figure.anim.enter
```

团剧共创消息：

```json
{
  "role": "烈",
  "avatar": "震惊",
  "messageType": "TEXT",
  "content": "",
  "annotations": ["figure.pos.left-center", "figure.anim.enter", "dialog.next"]
}
```

业务含义：这是一条只切头像/立绘/站位的空白消息。`dialog.next` 表示 WebGAL 演出里立即进入下一句。

### 显示名和绑定角色分离

```rgl
[师匠=八意永琳.默认]<right-center><enter>:你终于来了。
```

团剧共创消息：

```json
{
  "role": "八意永琳",
  "avatar": "默认",
  "customRoleName": "师匠",
  "content": "你终于来了。",
  "annotations": ["figure.pos.right-center", "figure.anim.enter"]
}
```

业务含义：`师匠` 只作为聊天室显示名，实际绑定角色仍然是 `八意永琳`。

### 多角色同框对白

```rgl
[烈.震惊,丰聪耳神子.闭眼平静]<shake>:别过来。
```

解析阶段：

```txt
<shake> -> figure.anim.ba-shake
```

导入器会生成两条消息：

```json
[
  {
    "role": "丰聪耳神子",
    "avatar": "闭眼平静",
    "content": "",
    "annotations": ["figure.anim.ba-shake", "figure.pos.right-center", "dialog.next"]
  },
  {
    "role": "烈",
    "avatar": "震惊",
    "content": "别过来。",
    "annotations": ["figure.anim.ba-shake", "figure.pos.left-center"]
  }
]
```

业务含义：逗号后的角色先生成空白切换消息，主说话人再发正文。没有显式站位时，主说话人默认 `left-center`，陪同角色默认 `right-center`。

### 立绘透明度

```rgl
[丰聪耳神子(60).全身半睁静眼]<right-center><enter>:我只是站在稍远一点的位置。
```

团剧共创消息：

```json
{
  "role": "丰聪耳神子",
  "avatar": "全身半睁静眼",
  "content": "我只是站在稍远一点的位置。",
  "annotations": ["figure.pos.right-center", "figure.anim.enter"],
  "webgal": {
    "transform": {
      "alpha": 0.6
    }
  }
}
```

业务含义：`(60)` 表示立绘透明度 60%。导入后写入团剧共创通用 transform 字段 `message.webgal.transform.alpha`，实时 WebGAL 和发布导出都会把它编译进立绘 alpha。

### 展示图

```rgl
<image.show>:资料/人物卡展示图
```

团剧共创消息：

```json
{
  "role": "旁白/系统",
  "messageType": "IMG",
  "annotations": ["image.show"],
  "content": "素材包中 资料/人物卡展示图 对应图片消息的 content"
}
```

业务含义：从素材包查找资料图并作为舞台展示图发送。

### 安科骰子块

```rgl
<dice>:
dicer: 海豹一号机
cmd: 【1d10：】
1. 继续观察
2. 直接行动
3. 向师匠询问
4. 神子插手
5. 意外来客
6. 战斗开始
7. 先撤退
8. 立刻冲进去
9. 发现破绽
10. 大事件
=> 【1d10:8】；8 立刻冲进去
烈没有继续等待，直接踏进了永远亭。
```

RGL 编译中间消息：

```json
{
  "roleId": "IMPORT_SPECIAL_ROLE_ID.NARRATOR",
  "content": "【1d10：】\n1. 继续观察\n2. 直接行动\n3. 向师匠询问\n4. 神子插手\n5. 意外来客\n6. 战斗开始\n7. 先撤退\n8. 立刻冲进去\n9. 发现破绽\n10. 大事件",
  "diceTurn": {
    "dicerSpeakerName": "海豹一号机",
    "replyContents": [
      "【1d10:8】；8 立刻冲进去\n烈没有继续等待，直接踏进了永远亭。"
    ]
  }
}
```

最终团剧共创请求：

```json
{
  "messageType": "DICE",
  "content": "【1d10：】\n1. 继续观察\n2. 直接行动\n3. 向师匠询问\n4. 神子插手\n5. 意外来客\n6. 战斗开始\n7. 先撤退\n8. 立刻冲进去\n9. 发现破绽\n10. 大事件",
  "extra": {
    "diceTurn": {
      "command": "同 content",
      "replies": [
        {
          "customRoleName": "海豹一号机",
          "content": "【1d10:8】；8 立刻冲进去\n烈没有继续等待，直接踏进了永远亭。"
        }
      ]
    }
  }
}
```

业务含义：骰前只放问题、选项、规则。骰后才放出目、命中选项和结算，避免 WebGAL 演出提前剧透。

### 角色动作

```rgl
[烈.震惊]<left-center><jump>:那我就先进去了！
[师匠=八意永琳.严肃]<right-center><shake>:等等。
```

解析阶段：

```txt
<jump> -> figure.anim.ba-jump
<shake> -> figure.anim.ba-shake
```

团剧共创消息：

```json
[
  {
    "role": "烈",
    "avatar": "震惊",
    "content": "那我就先进去了！",
    "annotations": ["figure.pos.left-center", "figure.anim.ba-jump"]
  },
  {
    "role": "八意永琳",
    "avatar": "严肃",
    "customRoleName": "师匠",
    "content": "等等。",
    "annotations": ["figure.pos.right-center", "figure.anim.ba-shake"]
  }
]
```

业务含义：动作 annotation 挂在角色消息上，WebGAL 渲染器按当前消息角色和头像执行立绘动作。

### HP 状态事件

```rgl
<hitpoint>:(烈,hp,-2)
```

团剧共创消息：

```json
{
  "role": "烈",
  "messageType": "STATE_EVENT",
  "content": "状态更新：烈 HP -2",
  "extra": {
    "stateEvent": {
      "source": {
        "commandName": "hitpoint"
      },
      "atoms": [
        {
          "type": "varOp",
          "scope": "role:烈",
          "key": "hp",
          "op": "sub",
          "value": 2
        }
      ]
    }
  }
}
```

业务含义：HP 变化是团剧共创状态事件，不伪装成旁白。

### 行内音效

```rgl
[烈.受伤]<left-center>:啧，还是被擦到了。{挥刀}
```

导入器会生成两条消息：

```json
[
  {
    "role": "烈",
    "avatar": "受伤",
    "content": "啧，还是被擦到了。",
    "annotations": ["figure.pos.left-center"]
  },
  {
    "role": "旁白/系统",
    "messageType": "SOUND",
    "annotations": ["sys:se"],
    "extra": "素材包中 SE/挥刀 对应声音消息的 extra"
  }
]
```

业务含义：正文末尾 `{音效名}` 会被剥离，并额外生成一条 SE 消息。`{*}` 只会被剥离，不生成 SE。

### 回声工坊单行骰子

```rgl
<dice>:(敏捷检定,20,12,7)
```

团剧共创骰子消息：

```json
{
  "messageType": "DICE",
  "content": "敏捷检定\n【1d20：】\n检定值：12",
  "extra": {
    "diceTurn": {
      "command": "敏捷检定\n【1d20：】\n检定值：12",
      "replies": [
        {
          "customRoleName": "骰娘",
          "content": "【1d20:7】；目标 12；成功"
        }
      ]
    }
  }
}
```

业务含义：这是兼容回声工坊的简写。安科导入仍推荐使用骰子块，因为块语法能保留选项和骰后结算。

### Bubble 降级

```rgl
<bubble>:弹幕一样的短吐槽从屏幕边缘飘过。
```

团剧共创消息：

```json
{
  "roleId": "IMPORT_SPECIAL_ROLE_ID.NARRATOR",
  "messageType": "TEXT",
  "content": "弹幕一样的短吐槽从屏幕边缘飘过。",
  "annotations": []
}
```

业务含义：当前没有真正的舞台气泡对象，`<bubble>` 降级为普通旁白，不自动立即下一句。

### 无角色绑定动画

```rgl
<animation>:jump,right-center
```

团剧共创消息：

```json
{
  "roleId": "IMPORT_SPECIAL_ROLE_ID.NARRATOR",
  "messageType": "TEXT",
  "content": "",
  "annotations": ["figure.anim.ba-jump", "figure.pos.right-center"]
}
```

业务含义：这是控制消息，没有绑定具体角色。需要明确目标角色时，更推荐写到角色消息上，例如 `[烈.震惊]<jump><left-center>:`。

### 独立 SE

```rgl
<SE>:脚步
```

解析阶段：

```txt
<SE> -> sys:se
```

团剧共创消息：

```json
{
  "role": "旁白/系统",
  "messageType": "SOUND",
  "annotations": ["sys:se"],
  "extra": "素材包中 SE/脚步 对应声音消息的 extra"
}
```

### 清场和场景效果

```rgl
<clear>:figure
<bgm.clear>:
<scene.effect.rain>:
[旁白]:雨声盖住了竹林里的动静。
<scene.effect.stop>:
```

团剧共创消息：

```json
[
  {
    "content": "",
    "annotations": ["figure.clear"]
  },
  {
    "content": "",
    "annotations": ["bgm.clear"]
  },
  {
    "content": "",
    "annotations": ["scene.effect.rain"]
  },
  {
    "roleId": "IMPORT_SPECIAL_ROLE_ID.NARRATOR",
    "content": "雨声盖住了竹林里的动静。",
    "messageType": "TEXT"
  },
  {
    "content": "",
    "annotations": ["scene.effect.stop"]
  }
]
```

业务含义：清场和场景效果都是空正文控制消息。

## 常用写法对照

| RGL 写法 | 解析后 annotation / 字段 | 团剧共创业务含义 |
| --- | --- | --- |
| `<background>:永远亭夜晚` | `sys:bg` | 背景图 |
| `<bg>:永远亭夜晚` | `sys:bg` | 背景图 |
| `<BGM>:战斗曲` | `sys:bgm` | BGM |
| `<set:BGM>:战斗曲` | `sys:bgm` | BGM 兼容写法 |
| `<SE>:挥刀` | `sys:se` | 音效 |
| `<CG>:开场图` | `sys:cg` | CG |
| `<image.show>:资料/人物卡展示图` | `image.show` | 展示图 |
| `<enter>` | `figure.anim.enter` | 角色入场 |
| `<exit>` | `figure.anim.exit` | 角色退场 |
| `<shake>` | `figure.anim.ba-shake` | 角色震动 |
| `<bigshake>` | `figure.anim.ba-bigshake` | 强震动 |
| `<jump>` | `figure.anim.ba-jump` | 跳动 |
| `<jump2>` | `figure.anim.ba-jump-twice` | 连跳 |
| `<down>` | `figure.anim.ba-down` | 下沉动作 |
| `<left>` | `figure.pos.left` | 左侧站位 |
| `<left-center>` | `figure.pos.left-center` | 左中站位 |
| `<center>` | `figure.pos.center` | 中间站位 |
| `<right-center>` | `figure.pos.right-center` | 右中站位 |
| `<right>` | `figure.pos.right` | 右侧站位 |
| `<clear>:figure` | `figure.clear` | 清空角色立绘 |
| `<clear>:bg` | `background.clear` | 清空背景 |
| `<clear>:bgm` | `bgm.clear` | 停止 BGM |
| `<clear>:image` | `image.clear` | 清空展示图 |
| `<clear>:all` | `figure.clear` + `background.clear` + `bgm.clear` + `image.clear` | 清空主要舞台对象 |

## 必须失败或强警告的写法

下面这些写法不应该进入正式导入。

```rgl
[烈.震惊]:烈：正文里不应该再写说话人前缀
```

原因：说话人已经在 `[]` 里，正文只放台词。

```rgl
[烈]:缺少差分
```

原因：角色对白必须写成 `角色.差分`，否则无法确定 `avatarId`。

```rgl
<figure:left-center>:烈.震惊
```

原因：当前不支持回声工坊对象命令。要切角色，请写 `[烈.震惊]<left-center>:`。

```rgl
<sys:bg>:不存在的背景
```

原因：消息导入阶段只消费已导入素材。找不到素材时必须失败，不能静默忽略或 fallback。

```rgl
[不存在的角色.默认]:你好
```

原因：RGL 消息导入阶段不会自动创建角色。自动创建只发生在角色素材导入阶段。
