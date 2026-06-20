# WebGAL 标注讨论与 TODO

本文记录团剧共创消息标注到 WebGAL realtime render / publish render 的近期讨论、已落地范围和后续待办。

相关文档：

- [WebGAL 实时渲染规则](./webgal-realtime-render-rules.md)
- [团剧共创 -> WebGAL 翻译速查表](./webgal-tuanchat-translation-map.md)
- [消息标注发送流程](./message-annotation-send-flow.md)

相关代码：

- `apps/web/app/types/messageAnnotations.ts`
- `apps/web/app/components/chat/message/annotations/annotationPickerLayout.ts`
- `apps/web/app/webGAL/realtimeRenderer.ts`
- `apps/web/app/webGAL/spaceWebgalCompiler.ts`
- `apps/web/app/webGAL/publishAnimationPresets.ts`
- `packages/tuanchat-domain/src/annotation-catalog/data.ts`

## 当前产品决策

1. annotation 面板要保持高信息密度，不做二级展开。
2. 前端暂不做互斥校验。位置、进场、动作、出场、速度等按钮仍按普通 annotation 处理；翻译层按最后一个命中的同类标注生效。
3. 消息气泡上不展示完整标签墙。
4. 黑屏文字暂不接这轮新增的场景控制和背景动画入口。
5. `setTransform` 和背景 `setTransition` 属于后续更大范围的演出控制能力，不作为单独小功能提前暴露。
6. `bgm series`、停止 loop 音效、玩家输入、等待节奏控制都先进入以后 TODO。

## 已落地范围

### 场景

UI 行：

```txt
场景
文本框    [隐藏] [显示]
电影      [开启] [关闭]
```

翻译：

- `scene.textbox.hide` -> `setTextbox:hide -next;`
- `scene.textbox.show` -> `setTextbox:on -next;`
- `scene.film.on` -> `filmMode:on;`
- `scene.film.off` -> `filmMode:none;`

适用消息类型：

- 普通文本
- 骰子
- 图片
- 特效

不适用：

- 黑屏文字

### 背景

UI 行：

```txt
背景
进场      [淡入] [从左] [从右] [模糊]
出场      [淡出] [向左] [向右]
速度      [快] [标准] [慢]
```

翻译：

- 背景图片消息：

```webgal
changeBg:{file} -enter={animation} -exit={animation} -duration={ms} -enterDuration={ms} -exitDuration={ms} -next;
```

- 清背景：

```webgal
changeBg:none -exit={animation} -duration={ms} -exitDuration={ms} -next;
```

速度：

- 快：`300ms`
- 标准：`700ms`
- 慢：`1200ms`

动画 preset：

- `background/enter`
- `background/enter-from-left`
- `background/enter-from-right`
- `background/blur-in`
- `background/exit`
- `background/exit-to-left`
- `background/exit-to-right`
- 每个背景动画都有 `-fast`、默认、`-slow` 三档 JSON preset。

实现注意：

- WebGAL 自定义动画名会优先使用 JSON 动画自身的帧时长，单纯写 `-duration` 不能稳定覆盖自定义动画速度，所以当前用多速度 preset 解决。
- “模糊进场”不要用 `changeBg -transform={"blur":20}`，否则最终背景可能保持模糊；当前 preset 是从 `alpha=0, blur=20` 过渡到 `alpha=1, blur=0`。

## 暂缓项

### 黑屏文字

这轮先不做黑屏 style / intro 扩展。

暂不提供：

- 黑屏文本框隐藏/显示入口
- 黑屏电影模式入口
- 黑屏背景进出场入口
- intro 字号、颜色、背景色、背景图、动画、delay、userForward

后续如果要做，应作为 intro/黑屏编辑体验单独设计，不混入普通场景标注。

### setTransform

暂不单独暴露。

未来适合做成预设式舞台变换，例如：

- 背景变暗
- 背景模糊
- 背景放大
- 角色变暗
- 角色模糊
- 复位

设计方向：

- 不直接让用户填任意 JSON。
- 优先做少量高频预设。
- 后续可和背景、立绘、CG 的演出行合并展示。

### 背景 setTransition

暂不单独作为 annotation 入口。

原因：

- 当前背景图片可直接通过 `changeBg -enter/-exit` 表达。
- 清背景也可通过 `changeBg:none -exit=...` 表达。
- `setTransition -target=bg-main` 更适合后续高级演出控制，与 `setTransform` 一起规划。

### BGM series

暂不做。

当前已确定：

- 所有 BGM 自动先写 `unlockBgm`。
- `unlockname` 不走 `bgm` 参数。

后续 TODO：

- `bgm -enter` 淡入。
- `unlockBgm` 的 series / 分类能力。
- BGM 标注 UI 是否需要“收藏分类”概念。

### playEffect 停止 loop id

暂不做。

后续可补：

```webgal
playEffect:none -id={loopId};
```

需要先设计：

- loop id 从哪里来。
- 是否需要用户能选择历史 loop id。
- 普通音效和循环音效是否拆行展示。

### getUserInput

暂不放普通 annotation。

更适合做新消息类型或结构化编辑入口：

```webgal
getUserInput:{varName} -title=... -buttonText=...;
```

需要先设计：

- 输入结果写入哪个变量。
- UI 上是否作为“玩家输入”消息。
- 后续分支条件如何引用这个变量。

### wait

暂不做。

后续很适合补成节奏控制：

```webgal
wait:{ms};
```

可能 UI：

```txt
节奏
等待      [短] [中] [长]
```

需要先定：

- 时间档位。
- 是否只允许特效消息使用。
- 是否与 `dialog.next`、自动推进冲突。

## 后续优先级建议

1. `setTextbox` / `filmMode` / 背景进出场继续观察 realtime render 真实效果。
2. 补 BGM 淡入 `-enter`，因为使用频率高且 UI 简单。
3. 补 `playEffect:none -id=...`，但需要先把 loop id 的输入体验设计清楚。
4. 设计 `wait` 的节奏控制行。
5. 再统一设计 `setTransform + 背景 setTransition` 的高级演出预设。
6. 最后再考虑 `getUserInput`，因为它更像新消息类型，不是普通标注。

## 已知边界

- realtime render 和 publish render 要保持同一套翻译规则。
- 新增 annotation 时，需要同步：
  - domain catalog
  - picker layout
  - `messageAnnotations` helper
  - realtime renderer
  - static compiler
  - publish animation preset
  - 对应测试
- WebGAL 的进出场效果要求靠近目标设置语句执行。立绘场景下，`setTransition` 必须紧跟实际 `changeFigure`；背景当前优先使用 `changeBg` 自身参数。
