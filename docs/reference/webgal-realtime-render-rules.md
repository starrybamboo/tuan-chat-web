# WebGAL 实时渲染规则

本文档描述 `tuan-chat-web` 当前实现下，聊天消息如何被转换并写入 WebGAL 场景脚本，以及何时触发增量/全量重渲染。

适用代码：
- `app/webGAL/realtimeRenderer.ts`
- `app/webGAL/useRealtimeRender.ts`
- `app/components/chat/core/realtimeRenderOrchestrator.tsx`
- `app/components/chat/core/realtimeRenderGuards.ts`

## 1. 总体流程规则

1. 渲染工程粒度：按 `space` 建立游戏目录，游戏名固定为 `realtime_{spaceId}`。  
2. 场景粒度：按 `room` 建立场景文件，命名为 `{roomName}_{roomId}.txt`。  
3. 启动阶段：`useRealtimeRender.start()` 完成 renderer 初始化、场景创建、资源预载、WebSocket 建连。  
4. 历史导入：编排器在 renderer `isActive` 后触发历史消息渲染（不再要求 `status === connected`）。  
5. 增量更新：新消息进入后优先走增量追加；出现重排/插入/删除/更新时走全量重建。  

## 2. 流程图（roomMap）到场景跳转规则

`space.roomMap` 在 renderer 内会被解析为 `WorkflowGraph`，支持以下 key：

- `start`：开始节点房间 ID 列表。
- `房间ID`（例如 `11401`）：该房间的出边，元素可为：
  - `目标房间ID`（无条件）
  - `目标房间ID条件文本`（有条件标签）
- `endNodes`：结束节点列表，支持 `end:1` 和 `1` 两种格式。
- `endNode:{id}`：结束节点的入边房间列表（例如 `endNode:1` -> `[11401,11402]`）。

生成规则：

1. `start.txt`
- `start` 仅 1 个房间：`changeScene:{roomScene}.txt;`
- `start` 多个房间：生成 `choose:...;`
- 无有效 `start`：回退为“全部房间 choose”。

2. 房间末尾分支（在 `renderHistory` 收尾补齐）
- 会先汇总“普通房间出边 + 结束节点出边”为候选分支：
  - 候选总数为 1：生成 `changeScene:{target}.txt;`
  - 候选总数大于 1：生成 `choose:标签:目标场景...;`
- 其中结束节点目标场景命名为 `__tc_end_{id}.txt`

3. 结束节点场景
- 首次需要时自动创建 `games/{gameName}/game/scene/__tc_end_{id}.txt`
- 内容固定为 `end;`

## 3. 消息类型到 WebGAL 指令映射规则

消息类型常量见 `app/types/voiceRenderTypes.ts` 的 `MESSAGE_TYPE`。

1. `TEXT(1)`
- 旁白（`roleId <= 0`）输出：`:内容;`
- 角色对话输出：`角色名: 内容;`
- 支持 `-notend/-concat/-next`
- 可能附带 TTS 语音文件参数（见第 5 节）
- 角色立绘与小头像文件会按角色 ID 分目录存储在 `game/figure/role_{roleId}/`，脚本引用形如 `role_123/sprite_456.webp`

2. `IMG(2)`
- 背景图：`changeBg:{file} -next;`
- 解锁 CG：`unlockCg:{file} -name={cgName};`
- 普通展示图（`image.show`）：以固定 `image_message` 槽位在上半屏居中展示，并按横图/方图/竖图的固定档位缩放，再写入 `changeFigure` + `setAnimation`（两者都不追加 `-next`）

3. `VIDEO(14)`
- `playVideo:{file};`
- 若含 `video.skipoff` 标注，附加 `-skipOff`

4. `SOUND(7)`
- BGM：`bgm:{file} -volume=? -next;`
- 音效：`playEffect:{file} -volume=? -id=? -next;`

5. `EFFECT(8)`
- `none` -> `pixiInit -next;`
- `clearBackground` -> `changeBg:none -next;`
- `clearFigure` -> 清空所有立绘槽位
- 其他特效 -> `pixiPerform:{effect} -next;`（可先补 `playEffect`）

6. `INTRO_TEXT(9)`
- `intro:内容;`
- 默认附带 `-hold`；若存在 `dialog.notend` 标注则不加 `-hold`

7. `WEBGAL_COMMAND(10)`
- 直接写入 `msg.content`（原样脚本行）

8. `WEBGAL_VAR(11)`
- 从 `extra.webgalVar` 解析后写入 `setVar:{key}={expr} -global;`

9. `WEBGAL_CHOOSE(13)`
- 从 `extra.webgalChoose` 生成 `choose + label + jumpLabel` 多行脚本

10. `DICE(6)`
- 支持 `script / anko / trpg / narration / dialog` 多种渲染模式
- 支持两步掷骰（预览 + 结果）与骰子音效
- TRPG 模式会附加 `pixi` 掷骰特效
- 支持“指令+回复”短时间窗口自动合并（默认 260ms）

11. 其他类型
- 默认不写入脚本（忽略）

## 4. 标注（annotations）影响规则

1. 预处理清理
- `background.clear`：在当前消息前写 `changeBg:none -next;`（背景图消息本身除外）
- `image.clear`：清理 `image_message` 槽位
- `figure.clear`：清理所有立绘槽位（在本消息脚本前执行）

2. 立绘位置与动画
- `figure.pos.*` 指定槽位。
- 未指定位置时：
  - `autoFigureEnabled = true` -> 默认 `left`
  - `autoFigureEnabled = false` -> 不显示立绘
- 立绘不会因普通消息自动清空，需显式清理。

3. 对话拼接控制
- `dialog.notend` -> 对话加 `-notend`
- `dialog.concat` -> 对话加 `-concat`
- `dialog.next` -> 对话/旁白加 `-next`

4. 特效标注
- `effect.*` 会映射为 `pixiPerform`，并按配置推导时长/音效。

## 5. 小头像与 TTS 规则

1. 小头像（`miniAvatar`）
- 仅在 `miniAvatarEnabled=true` 时输出
- 旁白/黑屏文字默认清空为 `miniAvatar:none;`
- 骰子消息可通过 payload 的 `showMiniAvatar` 覆盖

2. TTS 生成条件（全部满足才生成）
- `ttsConfig.enabled=true`
- 文本非空
- 非骰子消息
- `roleId` 不是系统角色 `0`，也不是骰娘 `2`
- 文本不以 `.` 或 `。` 开头（视为指令）

## 6. 历史同步与重渲染规则（编排器）

核心原则：历史脚本写入不依赖 websocket `connected` 状态，仅依赖 renderer `isActive`。

1. 首次历史渲染触发（`shouldRenderInitialHistory`）
- renderer active
- 尚未渲染历史
- 当前不在渲染中
- 有历史消息
- `chatHistoryLoading=false`
- 当前房间存在

2. 设置变化触发全量重渲染（`shouldRerenderForSettingsChange`）
- 小头像/自动立绘任一配置变化
- renderer active
- 有历史消息
- 且“已完成历史渲染”或“正在渲染中”

3. 历史增量变化处理（`shouldProcessHistoryDelta`）
- renderer active
- 非历史加载中
- 已完成首次历史渲染
- 当前不在渲染中
- 有历史消息

4. 增量/全量策略
- 仅尾部追加：逐条 `renderMessage`
- 顺序相同但内容有更新：全量重建（`resetScene + renderHistory`）
- 非追加的插入/删除/重排：全量重建
- 全量重建走 350ms 防抖，避免抖动

5. 背景一致性修正
- 历史已渲染后，会监控“最新背景图消息”，变化时补渲染或清除背景

## 7. WebSocket 与文件写入边界

1. 渲染核心是“写场景文件”，可以在 websocket 未连接时执行。  
2. `sendSyncMessage` 在 websocket 不可用时会入队，连上后自动发送。  
3. `jumpToMessage` 依赖 websocket 在线；离线时返回 `false`。  

## 8. 行号映射与可回跳规则

1. 每条渲染消息会记录 `messageId -> 行号范围`（`messageLineMap`）。  
2. `updateAndRerenderMessage` 优先按“替换既有行范围”重写，保持跳转锚点稳定。  
3. 找不到行号范围时回退为 append 模式。  
4. `resetScene(roomId)` 会清理该房间全部行号映射，避免旧锚点污染。  

## 9. 维护约束（修改规则时）

1. 修改渲染判定逻辑时，同步更新：
- `realtimeRenderer.ts`
- `realtimeRenderOrchestrator.tsx`
- `realtimeRenderGuards.ts` 与对应测试

2. 若新增消息类型或注解：
- 先在 `MESSAGE_TYPE` / `messageAnnotations` 定义常量
- 再补转换分支与文档映射表

3. 若调整 roomMap 协议：
- 同步 `parseWorkflowRoomMap` 解析规则
- 验证 `start`、普通分支、结束节点三种路径都可生成有效脚本
