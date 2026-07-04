# 团剧共创 -> WebGAL 翻译速查表

这是一份 `A -> B` 速查版，主要对照当前 `tuan-chat-web` 的实时预览与静态导出实现。

建议先读：

- [WebGAL 实时渲染规则](./webgal-realtime-render-rules.md)
- [团剧共创 WebGAL 索引](./webgal-tuanchat-index.md)

本文只写最容易拿来对照脚本的映射，不重复展开引擎机制。

## 先记四件事

1. `roleId` 决定说话人身份和立绘目录。
2. `avatarId` 决定差分立绘。
3. `customRoleName` 只改台词前缀，不改立绘来源。
4. `dice:` 只属于普通 WebGAL 骰子浮层，TRPG 骰子不要再输出它。

## 一句话对白怎么翻

### 1. 普通对白

A:

```txt
roleId=1
avatarId=11
customRoleName=明日香
figure.pos.left
content=默认表情
```

B:

```webgal
changeFigure:role_1/sprite_11.webp -id=1 -transform={...} -next;
明日香: 默认表情 -figureId=1;
```

说明：

- `changeFigure` 先切差分，再说台词。
- `-figureId=1` 来自 `figure.pos.left`。
- `-transform={...}` 由头像自身的 `spriteTransform` 和槽位偏移合成。
- 角色立绘默认效果由 `config.txt` 的 `Figure_Default_Enter_Animation=tuanchat/default-enter` / `Figure_Default_Exit_Animation=tuanchat/default-exit` 指向 `game/animation/tuanchat/default-*.json`；`Figure_Default_Enter_Duration=0` / `Figure_Default_Exit_Duration=300` 只作为未配置 JSON 动画时的 fallback，不再逐句追加默认时长参数；显式入退场标注仍由紧随其后的 `setTransition` 覆盖。
- 位置只来自 `annotations` 的 `figure.pos.*`；缺少消息 `avatarId` 时不输出 `changeFigure` 和 `-figureId`。

### 2. 同一角色切差分

A:

```txt
roleId=1
avatarId=12
customRoleName=明日香
figure.pos.left
content=笑脸差分
```

B:

```webgal
changeFigure:role_1/sprite_12.webp -id=1 -transform={...} -next;
明日香: 笑脸差分 -figureId=1;
```

说明：

- 这里的“差分”是 `avatarId` 变化，不是 `content` 变化。
- 同一 `roleId`、同一槽位，只会换 `sprite_XX.webp`。

### 3. 没有立绘位置

A:

```txt
roleId=1
avatarId=11
customRoleName=明日香
content=只想说话
```

B:

```webgal
明日香: 只想说话;
```

说明：

- 没有 `figure.pos.*` 时，不输出 `changeFigure` 和 `-figureId`。

### 4. 对话参数

A:

```txt
dialog.notend + dialog.concat + dialog.next
```

B:

```webgal
明日香: 内容 -figureId=1 -notend -concat -next;
```

说明：

- `dialog.notend` -> `-notend`
- `dialog.concat` -> `-concat`
- `dialog.next` -> `-next`

### 5. 立绘入场 / 退场

A:

```txt
figure.pos.left
figure.anim.ba-enter-from-left
figure.anim.ba-exit-to-right
```

B:

```webgal
changeFigure:role_1/sprite_11.webp -id=1 -transform={...} -next;
setTransition: -target=1 -enter=position/ba-enter-from-left -exit=position/ba-exit-to-right -keepOffset -next;
明日香: 内容 -figureId=1;
```

说明：

- 入场/退场标注必须跟在实际 `changeFigure` 后输出 `setTransition`。
- `figure.clear` 同时带退场标注时，先输出 `setTransition -exit=...`，再输出 `changeFigure:none`，让已在场立绘按指定出场动画离场。
- 跳跃、摇晃等动作标注仍输出 `setAnimation`。

清除立绘时的退场示例：

```txt
figure.clear
figure.anim.ba-exit-to-right
```

```webgal
setTransition: -target=1 -exit=position/ba-exit-to-right -keepOffset -next;
changeFigure:none -id=1 -next;
```

## 立绘 / 图片 / 背景怎么翻

### 6. 普通图片展示

A:

```txt
image.show
```

B:

```webgal
changeFigure:img_123.webp -id=image_message -transform={...};
```

说明：

- 固定使用 `image_message` 槽位。
- 会按图片尺寸算安全区布局，不走普通人物槽位。
- `image.clear` 对应：

```webgal
changeFigure:none -id=image_message -next;
```

### 7. 背景图

A:

```txt
background image
```

B:

```webgal
changeBg:bg_123.webp -next;
```

### 8. 背景清除

A:

```txt
background.clear
```

B:

```webgal
changeBg:none -next;
```

### 9. CG 解锁

A:

```txt
cg unlock
```

B:

```webgal
unlockCg:bg_123.webp -name=CG名;
```

### 10. 小头像

A:

```txt
figure.mini-avatar
```

B:

```webgal
miniAvatar:role_1/mini_11.webp;
```

说明：

- 不需要时清空：

```webgal
miniAvatar:none;
```

## 音频 / 视频 / 特效怎么翻

### 11. BGM

A:

```txt
soundMessage.purpose=bgm
```

B:

```webgal
unlockBgm:music_123.mp3 -name=music_123;
bgm:music_123.mp3 -volume=60 -next;
```

### 12. 音效

A:

```txt
soundMessage.purpose=se
```

B:

```webgal
playEffect:./game/vocal/se_123.wav -volume=80 -id=loop-1 -next;
```

说明：

- 上传后的音效默认落到 `./game/vocal/`。
- TRPG 默认骰子音效走内置的 `./game/se/nettimato-rolling-dice-1.wav`。

### 13. 视频

A:

```txt
video.skipoff
```

B:

```webgal
playVideo:video_123.webm -skipOff;
```

### 14. 角色标注特效

A:

```txt
effect.1
```

B:

```webgal
playEffect:./game/se/effects/en_hmm.mp3 -next;
pixiPerform:effect.1 -target=1 -offsetX=-200 -screenY=360 -screenX=440 -once -duration=1968 -next;
```

说明：

- `effect.*` 标注会尽量对齐当前立绘槽位。
- 如果没有可用音效，只输出 `pixiPerform`。

### 15. 场景环境特效

A:

```txt
scene.effect.rain
```

B:

```webgal
pixiPerform:rain -next;
```

说明：

- `scene.effect.snow` -> `pixiPerform:snow -next;`
- `scene.effect.sakura` -> `pixiPerform:cherryBlossoms -next;`

### 16. 停止场景特效

A:

```txt
scene.effect.stop
```

B:

```webgal
pixiInit -next;
```

## 骰子怎么翻

### 17. TRPG 骰子

A:

```txt
messageType=DICE
mode=trpg
```

B:

```webgal
trpgDice:射击检定：D100=2/90 极难成功 -next;
playEffect:./game/se/nettimato-rolling-dice-1.wav -next;
```

说明：

- TRPG 骰子不输出 `dice:`。
- TRPG 骰子不输出 Pixi 特效命令。
- 如果 `sound.enabled=false`，不输出 `playEffect`。
- `trpgDice:` 由 WebGAL 自定义命令触发全屏覆盖卡片。

### 18. 普通骰子浮层

A:

```txt
mode=anko
```

B:

```webgal
dice:掷骰内容 -mode=anko;
```

说明：

- 这个是普通 WebGAL 骰子浮层，不是 TRPG。

### 19. 纯脚本骰子

A:

```txt
mode=script
lines=[...]
```

B:

```webgal
原样写入 lines;
```

说明：

- 如果 `lines` 本身是普通脚本，就原样保留。
- TRPG 骰子不走 `script` 兼容路径；实时生成会覆盖旧脚本。

### 20. 历史骰子导出

A:

```txt
历史骰子消息
```

B:

```webgal
青: 神子的急救【1d100：90】|1 需要永琳|2 不需要永琳;
```

说明：

- 静态导出会保留骰子结果和选项文本，不会重掷。
- 这和 realtime 的 TRPG burst 是两条路径。

## 选择和分支怎么翻

### 21. WebGAL 选择

A:

```txt
webgalChoose.options=[A, B]
```

B:

```webgal
choose:A:__choose_1_1|B:__choose_1_2;
label:__choose_1_1;
...
jumpLabel:__choose_1_end;
label:__choose_1_2;
...
jumpLabel:__choose_1_end;
label:__choose_1_end;
```

### 22. 房间入口

A:

```txt
startRoomIds=1
```

B:

```webgal
changeScene:room_1.txt;
```

### 23. 多起点房间

A:

```txt
startRoomIds=[1,2]
```

B:

```webgal
choose:房间1:room_1.txt|房间2:room_2.txt;
```

### 24. 房间出口

A:

```txt
room 末尾有下一跳
```

B:

```webgal
changeScene:room_20.txt;
```

或者：

```webgal
changeScene:room_20.txt -when=tuanchat.role.14562.hp > 0;
changeScene:room_30.txt -when=tuanchat.role.14562.hp <= 0;
```

说明：

- 流程图边上的“条件”字段就是 WebGAL 可执行表达式。
- 房间文件名和路径名必须是 ASCII；使用 `start.txt`、`room_{roomId}.txt`、`__tc_end_{id}.txt`。
- 多起点入口可以用 `choose` 让用户选起点；普通流程分支不用 `choose`，而是条件 `changeScene` 自动跳转。

## 状态变量怎么翻

### 25. 初始化变量

A:

```txt
初始化 realtime 工程
```

B:

```webgal
setVar:tuanchat.roleIds="14562,14604,14993,15223";
setVar:tuanchat.combat.active=false;
setVar:tuanchat.combat.turn=0;
setVar:tuanchat.map.background="";
setVar:tuanchat.role.14562.avatarUrl="./game/figure/token_role_14562.webp";
```

### 26. 战斗开始 / 结束

A:

```txt
combatRoundStart
```

B:

```webgal
setVar:tuanchat.combat.active=true;
```

A:

```txt
combatRoundEnd
```

B:

```webgal
setVar:tuanchat.combat.active=false;
setVar:tuanchat.combat.turn=0;
```

### 27. 下一回合

A:

```txt
nextTurn
```

B:

```webgal
setVar:tuanchat.combat.turn=tuanchat.combat.turn + 1;
```

### 28. 地图配置

A:

```txt
mapConfigUpsert
```

B:

```webgal
setVar:tuanchat.map.background="map_30476.webp";
setVar:tuanchat.map.gridRows=10;
setVar:tuanchat.map.gridCols=10;
setVar:tuanchat.map.gridColor="#808080";
```

说明：

- `mapFileId` 是团剧状态里的输入字段，只用来定位源图并生成稳定文件名；WebGAL 脚本不写地图 fileId 变量。
- 编译器会把地图图像放入 WebGAL 本地 `background` 资源目录；脚本只写 `map_*.webp` 这样的本地资源名。
- 清地图只输出 `setVar:tuanchat.map.background="";`，不清 token。

### 29. 地图 token

A:

```txt
mapTokenUpsert(roleId=14562, rowIndex=6, colIndex=3)
```

B:

```webgal
setVar:tuanchat.map.token.14562.active=true;
setVar:tuanchat.map.token.14562.rowIndex=6;
setVar:tuanchat.map.token.14562.colIndex=3;
```

说明：

- overlay 扫描 `tuanchat.map.token.{roleId}.active/rowIndex/colIndex`，不维护单独的 token 列表变量。

### 30. 角色变量运算

A:

```txt
varOp on tuanchat.role.14562.hp
```

B:

```webgal
setVar:tuanchat.role.14562.hp=20;
setVar:tuanchat.role.14562.hp=tuanchat.role.14562.hp + 5;
setVar:tuanchat.role.14562.hp=tuanchat.role.14562.hp - 5;
```

## 最容易搞错的地方

- 差分看 `avatarId`，不是看 `content`。
- `customRoleName` 只改说话人名字。
- `figure.pos.*` 决定槽位；消息 `avatarId` 决定具体差分文件，缺少消息 `avatarId` 时不显示立绘。
- `image_message` 是单独槽位，不是普通角色槽位。
- `trpgDice:` 是 TRPG 覆盖卡片；`dice:` 只用于普通安科/普通骰子。
- 资源变量按用途区分：角色 token 头像可写 `./game/...`，地图只写本地 background 资源名。

## 这次审查确认过的实现点

- realtime 会把消息级 `avatarId` 对应差分先下载/上传成本地 `role_*/sprite_*.webp`；共享静态编译只使用已注入的本地 WebGAL 路径，不把远程 URL 写进 `changeFigure`。
- realtime 和静态导出都已确认：`figure.pos.*` 不能单独生成立绘，必须同时有消息 `avatarId`。
- TRPG 骰子最终只保留 `trpgDice + playEffect`，不会再把 `dice:` 或 Pixi 特效命令当成 TRPG 结果卡。
- 图片立绘缓存已经按 `目标名|URL` 区分，避免不同目标文件名串图。
- 静态发布包会随包带上团剧共创标注会用到的 `position/*` 与 `action/BA-*` 动画表和 JSON 文件，避免 `setTransition` / `setAnimation` 在导出包中找不到动画。
- 旧 realtime 工程会靠 marker 版本升级自动重建，避免继续吃旧脚本。
