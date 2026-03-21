# 消息 Annotation 发送链路说明

本文档描述发送区 annotation 的设计目标与当前实现，包括数据结构、存储位置、装配顺序、自动补充规则，以及哪些规则已经被移除。

## 0. 设计原则

这一节描述的是后续修改应优先遵循的整体思路；如果和当前实现不一致，应以这里的设计原则作为调整方向。

### 0.1 所见即所得

核心要求：

- 要尽可能直观
- 玩家选择了什么，就发送什么
- 系统不应在发送阶段偷偷补入、改写、替换用户没有明确看到的 annotation

示例：

- 玩家在发送区选择了 `figure.pos.left` 和 `figure.mini-avatar`
- 那么最终发出去的就是 `figure.pos.left` 和 `figure.mini-avatar`

- 玩家在发送区选择了 `figure.mini-avatar`，并且发送的是音频
- 那么最终发出去的也应该是 `figure.mini-avatar` + 音频相关字段

设计含义：

- 发送区里可见的 annotation 应尽量等于最终发送出去的 annotation
- 如果系统确实要补默认值，这个默认值也应该能在发送区被看见
- 除默认值兜底外，不应再做额外的隐式推断

### 0.2 默认值只做空值兜底

核心要求：

- 默认值可以存在
- 但默认值只用于“当前没有任何值”时的兜底填充
- 除此之外不做任何自动处理

示例：

- 某一类发送上下文要求存在立绘位置，而当前完全没有位置值时
- 可以补一个默认立绘位置

边界：

- 图片不再自动补默认 annotation
- 音频不再自动补默认 annotation

设计含义：

- 图片不应因为“第一次添加”就自动补 `sys:bg`
- 音频不应因为“第一次添加”就自动补 `sys:bgm`
- 默认值只解决“空值兜底”问题，不承担语义猜测职责

## 1. 数据模型

发送区 annotation 不是单一列表，而是两层结构：

### 1.1 常驻 annotation 集

用途：

- 表示某个角色在某个房间里的长期发送偏好。
- 切换房间或切换角色后会被恢复。

数据结构：

```ts
string[]
```

存储方式：

- IndexedDB
- 作用域：`roomId + roleId`

存储记录结构：

```ts
{
  key: string;       // `${roomId}:${roleId}`
  roomId: number;
  roleId: number;
  annotations: string[];
  updatedAt: number;
}
```

### 1.2 临时 annotation 集

用途：

- 表示这次发送过程中，由附件或临时操作带来的附加语义。
- 只服务当前一次发送上下文。

数据结构：

```ts
string[]
```

存储方式：

- 内存态
- 不持久化

生命周期：

- 添加附件时可能自动增加
- 附件全部移除时会清空
- 发送完成后会清空

### 1.3 Room 级媒体 annotation 偏好

用途：

- 记录某个房间最近一次“图片附件”或“音频附件”使用的临时 annotation 快照。
- 用于下次再次添加同类媒体时，优先恢复上次选择。

数据结构：

```ts
type RoomMediaAnnotationPreference = {
  image?: string[];
  audio?: string[];
  updatedAt: number;
};
```

存储方式：

- `localStorage`
- 作用域：`roomId`

说明：

- `image` 和 `audio` 分开记录
- 但每个字段里记录的是“当时整包 temp annotation 快照”
- 恢复时采用“替换当前 temp”的语义，不再与已有 temp 合并
- 不再对白名单字段做筛选
- `undefined` 表示该房间这类媒体没有历史
- `[]` 表示该房间这类媒体上次明确使用的是空 annotation

## 2. Annotation ID 的语义分组

当前 annotation 大致可分为以下几类：

### 2.1 图片/媒体语义

- `sys:bg`：背景图
- `sys:cg`：CG
- `image.show`：展示图
- `image.clear`：清除展示图

### 2.2 音频语义

- `sys:bgm`：BGM
- `sys:se`：音效
- `bgm.clear`：清除 BGM

### 2.3 立绘语义

- `figure.pos.left`
- `figure.pos.left-center`
- `figure.pos.center`
- `figure.pos.right-center`
- `figure.pos.right`
- `figure.clear`
- `figure.mini-avatar`

### 2.4 对话控制语义

- `dialog.notend`
- `dialog.concat`
- `dialog.next`

### 2.5 演出/特效语义

- `scene.effect.*`
- `effect.*`
- `background.clear`
- `video.skipoff`

## 3. 发送区的恢复逻辑

当房间或角色切换时，发送区会做两步：

1. 读取当前 `roomId + roleId` 对应的常驻 annotation 集
2. 将读取结果恢复到发送区

在当前实现下，恢复完成后还会附加一层默认立绘位置推导：

- 如果当前 annotation 里没有 `figure.clear`
- 且没有任何 `figure.pos.*`
- 系统会根据成员身份推导一个默认位置

默认位置规则：

- `memberType === 1` -> `left`
- `memberType === 2` -> `right`
- 否则：
  - KP -> `left`
  - 非 KP -> `right`

这层逻辑发生在“发送区恢复”阶段，不发生在发送请求阶段。

## 4. 附件驱动的自动 annotation

### 4.1 图片

当通过按钮、拖拽、粘贴等方式添加图片时：

- 系统先读取当前 `room` 的图片历史快照
- 如果有历史，直接用这份历史替换当前 temp annotation
- 如果没有历史，不做额外填充

当前效果：

- 同一个房间内，图片附件会优先沿用上次选择
- 当前 temp annotation 会切换成图片历史快照
- 如果该房间从未记录过图片历史，本次添加图片不会自动补 `sys:bg`

### 4.2 音频

当通过按钮、拖拽、粘贴等方式添加音频时：

- 系统先读取当前 `room` 的音频历史快照
- 如果有历史，直接用这份历史替换当前 temp annotation
- 如果没有历史，不做额外填充

当前效果：

- 同一个房间内，音频附件会优先沿用上次选择
- 当前 temp annotation 会切换成音频历史快照
- 如果该房间从未记录过音频历史，本次添加音频不会自动补 `sys:bgm`

### 4.3 视频和普通文件

当前没有自动补充专门的 annotation。

### 4.4 历史快照写回时机

当附件区存在对应媒体时，当前 temp annotation 会被持续写回“当前激活的媒体来源”对应的 room 级历史：

- 当前激活来源是图片时，写回 `room.image`
- 当前激活来源是音频时，写回 `room.audio`

写回内容：

- 当前整包 `temp annotation`

补充说明：

- 添加图片时，当前激活来源会切到图片
- 添加音频时，当前激活来源会切到音频
- 如果当前激活来源对应的附件被移除，而另一类媒体仍在，当前激活来源会切到剩余媒体类型
- 不再把同一份 temp annotation 同时写回 `room.image` 和 `room.audio`

因此如果用户在附件存在期间手动改了这些 annotation，例如：

- `figure.pos.*`
- `figure.clear`
- `figure.mini-avatar`
- `dialog.notend`
- `dialog.concat`
- `dialog.next`
- `background.clear`
- `bgm.clear`

这些值也会一起被记入对应媒体历史中。

## 5. Annotation 的归一化规则

两层 annotation 在进入发送流程前会统一做归一化处理。

归一化目标：

- 过滤非法值
- 统一特殊标识形式

当前不会在归一化阶段自动消解以下冲突：

- 多个 `figure.pos.*` 可以同时存在
- `figure.pos.*` 和 `figure.clear` 也可以同时存在

因此当前系统不会再把“立绘位置”当作发送阶段的单选位强制收束。

## 6. 发送时的装配顺序

一次发送的 annotation 组装顺序如下：

1. 读取常驻 annotation 集
2. 读取临时 annotation 集
3. 若本次是通过添加图片/音频生成 temp，则 temp 可能直接来自对应媒体的 room 级历史快照
4. 分别归一化
5. 合并为发送用 annotation 集
6. 将结果写入最终消息请求

### 6.1 当前不做位置冲突消解

当前发送阶段不会再主动收束 `figure.pos.*`：

- 常驻 annotation 集里有多个位置，就原样参与发送
- 常驻 annotation 和临时 annotation 都带位置，也会一起参与发送
- `figure.clear` 不会因为存在位置而被自动移除

### 6.2 发送阶段不再自动补控制类 annotation

当前发送阶段不会再因为联动模式自动补以下 annotation：

- `dialog.notend`
- `dialog.concat`

## 7. 已移除的发送阶段自动处理

此前发送阶段存在以下自动处理：

- 如果消息没有 `figure.clear`
- 且没有任何 `figure.pos.*`
- 系统会在真正发送前自动补一个默认 `left/right`
- 如果 `webgalLinkMode = true`
  - 会根据房间偏好自动补 `dialog.notend`
  - 会根据房间偏好自动补 `dialog.concat`

这些发送阶段自动处理已经移除。

当前状态变为：

- 发送阶段不会再自动注入 `figure.pos.left/right`
- 发送阶段不会再自动注入 `dialog.notend` / `dialog.concat`
- 但发送区恢复阶段仍然会出现默认 `left/right`

## 8. 最终消息类型与 annotation 附着方式

一次发送可能拆成多条消息，例如：

- 图片消息
- 音频消息
- 视频消息
- 文件消息
- 文本消息

annotation 的附着方式不是完全一致的。

### 8.1 文本消息

文本消息使用本次发送整理好的 annotation 集。

### 8.2 图片消息

图片消息会显式保留图片相关语义，尤其是：

- `sys:bg`
- `sys:cg`

并同步影响图片消息本体的背景属性。

### 8.3 音频消息

音频消息会显式保留音频用途语义：

- `sys:bgm`
- `sys:se`

同时还会把用途同步写入音频消息的业务字段中。

### 8.4 视频消息

视频消息会直接使用当前发送阶段整理后的 annotation 集。

### 8.5 文件消息

普通文件消息主要继承本次发送的公共字段，不会额外推导图片/音频专属语义。

## 9. 房间偏好项与 annotation 的关系

当前没有“会在发送阶段直接注入 annotation”的房间偏好项。

现状：

- `webgalLinkMode` 仍然存在
- 但它当前只用于控制 WebGAL 联动相关 UI、工具栏和提示显示
- 它不会在发送阶段自动补任何 annotation

补充说明：

- `dialog.notend`
- `dialog.concat`

这两个仍然是有效的消息 annotation。

也就是说：

- 如果消息自身带了这两个 annotation，WebGAL 渲染仍会识别
- 但它们不再来自 room preference

## 10. 当前系统里最容易混淆的地方

最容易混淆的不是发送函数本身，而是“发送区看到的 annotation”并不完全等于“用户手动选择的 annotation”。

原因有三层：

1. 历史恢复
- 角色切回来时，之前的常驻 annotation 会被恢复

2. 恢复后的默认补位
- 没有显式位置时，发送区仍可能自动出现 `left/right`

3. 附件自动语义
- 图片会优先恢复该房间上次的图片 temp 快照；没有历史时不自动填充
- 音频会优先恢复该房间上次的音频 temp 快照；没有历史时不自动填充

因此如果要把逻辑改清楚，必须先决定：

- 发送区是否允许“系统替用户生成 annotation”

## 11. 典型 Use Case

下面这些 use case 按“前置状态 -> 用户动作 -> 结果”展开，描述的是当前已实现行为，不是理想行为。

### 11.1 图片首次进入某房间

前置状态：

- `room.image = undefined`
- 当前 `tempAnnotations = []`

用户动作：

- 添加 1 张图片

结果：

- 因为没有历史，所以不会自动补任何图片 annotation
- `tempAnnotations` 仍然是 `[]`
- 只要图片附件还在，这个当前 temp 会继续写回 `room.image`

### 11.2 图片历史被明确写成空数组

前置状态：

- `room.image = []`
- 当前 `tempAnnotations = []`

用户动作：

- 添加 1 张图片

结果：

- 系统认为“该房间图片历史存在，只是历史内容为空”
- 不会再走默认 `sys:bg`
- `tempAnnotations` 仍然是 `[]`

### 11.3 图片沿用房间历史，并直接替换当前 temp

前置状态：

- `room.image = [figure.pos.right, figure.mini-avatar]`
- 当前 `tempAnnotations = [dialog.next]`

用户动作：

- 添加 1 张图片

结果：

- 图片历史会直接替换当前 temp
- 最终 `tempAnnotations` 为：
  - `[figure.pos.right, figure.mini-avatar]`

### 11.4 图片历史和当前 temp 都带位置时，不再自动消解冲突

前置状态：

- `room.image = [figure.pos.right, figure.mini-avatar]`
- 当前 `tempAnnotations = [figure.pos.left, dialog.next]`

用户动作：

- 添加 1 张图片

结果：

- 图片历史会直接替换当前 temp
- 最终 `tempAnnotations` 为：
  - `[figure.pos.right, figure.mini-avatar]`
- 这里不会保留旧的 `figure.pos.left` / `dialog.next`

### 11.5 音频首次进入某房间

前置状态：

- `room.audio = undefined`
- 当前常驻 annotation 不包含 `sys:bgm` / `sys:se`
- 当前 `tempAnnotations = []`

用户动作：

- 添加 1 个音频

结果：

- 因为没有历史，所以不会自动补任何音频 annotation
- `tempAnnotations` 仍然是 `[]`
- 只要音频附件还在，这个当前 temp 会继续写回 `room.audio`

### 11.6 当前已经有音频用途时，仍然按音频历史替换

前置状态：

- 常驻 annotation 已包含 `sys:se`
- `room.audio = [figure.mini-avatar, dialog.concat]`
- 当前 `tempAnnotations = []`

用户动作：

- 添加 1 个音频

结果：

- 不再做“已有音频用途”隐藏判断
- 会直接恢复 `room.audio` 历史
- `tempAnnotations` 变为：
  - `[figure.mini-avatar, dialog.concat]`
- 最终发送时，消息仍然会带 `sys:se`，因为它来自常驻 annotation 集

### 11.7 同时存在图片和音频时，只写回当前激活来源对应的历史

前置状态：

- 当前房间里同时挂着图片和音频附件
- 当前 `tempAnnotations = [sys:bg, sys:bgm, figure.mini-avatar]`
- 当前激活来源为图片

用户动作：

- 用户不发送，只是在附件区调整 annotation

结果：

- `room.image` 会被写成 `[sys:bg, sys:bgm, figure.mini-avatar]`
- `room.audio` 不会在这一轮同步被改写
- 如果随后切到音频作为当前激活来源，之后的修改才会写回 `room.audio`

### 11.8 图片历史和音频历史不再被动共用同一份快照

前置状态：

- `room.image = [figure.mini-avatar]`
- `room.audio = [dialog.concat]`
- 当前 `tempAnnotations = []`

用户动作：

- 先只添加 1 张图片

结果：

- `tempAnnotations` 变为：
  - `[figure.mini-avatar]`
- 不会把 `room.audio` 里的 `[dialog.concat]` 一起带回来

用户动作：

- 再只添加 1 个音频

结果：

- `tempAnnotations` 会切换为音频历史
- `tempAnnotations` 变为：
  - `[dialog.concat]`

### 11.9 移除全部附件后，temp 会清空，但 room 历史不会清空

前置状态：

- 当前已有图片或音频附件
- 当前 `tempAnnotations = [figure.mini-avatar, dialog.next]`

用户动作：

- 把附件区里的图片、音频、文件全部移除

结果：

- `tempAnnotations` 会被清成 `[]`
- 已经写入 `room.image` / `room.audio` 的历史不会因此自动删除
- 下一次再往同一个房间添加对应媒体时，仍然可能恢复之前的历史

### 11.10 媒体历史按 room 共享，不按 role 区分

前置状态：

- `roomA.image = [figure.mini-avatar]`
- 当前角色从 `role1` 切换成 `role2`

用户动作：

- 在 `roomA` 里添加图片

结果：

- 仍然会恢复 `roomA.image`
- 不会因为换了角色而重置图片历史
- 但切到另一个房间 `roomB` 时，不会读取 `roomA` 的历史

### 11.11 发送阶段不再自动注入控制类 annotation

前置状态：

- `webgalLinkMode = true`
- 当前发送区 annotation 里没有 `dialog.notend`
- 当前发送区 annotation 里也没有任何 `figure.pos.*`

用户动作：

- 直接发送消息

结果：

- 最终消息不会因为房间偏好而额外带上 `dialog.notend`
- 不会因为“没有位置”而在发送阶段自动补 `figure.pos.left/right`
- 如果最终消息里出现了 `dialog.notend` / `dialog.concat`
  - 来源只能是发送区里本来就有这些 annotation
- 如果发送区里最终出现了 `left/right`
  - 来源只能是发送区恢复阶段，而不是发送阶段

## 12. 修改时的建议切分

如果要改这套逻辑，建议按层切分，而不是一次性混改。

### 12.1 发送区恢复层

决定：

- 是否保留“恢复后自动补左/右”

### 12.2 附件语义层

决定：

- 图片是否继续采用“有历史优先，无历史不填充”
- 音频是否继续采用“有历史优先，无历史不填充”

### 12.3 发送装配层

决定：

- 是否完全禁止发送阶段对 `dialog.notend` / `dialog.concat` 做隐式注入

### 12.4 最终目标建议

如果想要一套最可控的规则，可以改成：

1. 发送区只恢复用户明确保存过的 annotation
2. 不做默认左/右补位
3. 图片不自动带默认历史，也不自动带 `sys:bg`
4. 音频不自动带默认历史，也不自动带 `sys:bgm`
5. 联动模式不自动补任何 annotation
6. 最终发出去的 annotation 必须全部能在发送区被看到
