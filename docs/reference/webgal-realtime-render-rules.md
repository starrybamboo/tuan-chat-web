# WebGAL 实时渲染规则

本文档描述 `tuan-chat-web` 当前实现下，聊天消息如何被转换并写入 WebGAL 场景脚本，以及何时触发增量/全量重渲染。

适用代码：
- `app/webGAL/realtimeRenderer.ts`
- `app/webGAL/useRealtimeRender.ts`
- `app/components/chat/core/realtimeRenderOrchestrator.tsx`
- `app/components/chat/core/realtimeRenderGuards.ts`

## 0. 三层边界

1. 输入快照层：`space / room / message / role / avatar / gameConfig` 的统一快照，只负责把业务数据整理成可编译输入。
2. 纯编译层：共享的 `spaceWebgalCompiler`，负责 `config.txt`、`start.txt`、房间场景和发布包。
3. 输出层：`RealtimeRenderer` 负责 Terre 预览写入与增量运行时，`publishRenderer` 负责 Pages `packageData`，后端只做部署和受控 fallback。

preview-only 能力只属于输出层：
- WebSocket 跳转
- 本机 TTS
- 资源预热 / 本地上传
- 自动立绘 / 小头像等运行时辅助状态

publishable 能力必须走共享编译层：
- 空间设置投影
- 房间静态场景
- workflow 跳转
- 共享模板 / manifest / icon 规则

## 1. 总体流程规则

1. 渲染工程粒度：按 `space` 建立游戏目录，游戏名固定为 `realtime_{spaceId}`。  
2. 场景粒度：按 `room` 建立场景文件，命名为 `{roomName}_{roomId}.txt`。  
3. 启动阶段：`useRealtimeRender.start()` 会先并发补齐角色默认头像元数据，再完成 renderer 初始化、场景创建、资源预载、WebSocket 建连。  
4. 历史导入：编排器在 renderer `isActive` 后触发历史消息渲染（不再要求 `status === connected`）；历史导入前会先并发补齐消息涉及的头像元数据，并预热本轮需要的立绘 / 小头像资源。  
5. 增量更新：新消息进入后优先走增量追加；同序更新先尝试局部 self / suffix 重渲染，无法安全局部处理时再全量重建；插入/删除/重排仍走全量重建。  
6. 角色立绘默认进出场由 WebGAL `config.txt` 的 `Figure_Default_Enter_Animation=tuanchat/default-enter` / `Figure_Default_Exit_Animation=tuanchat/default-exit` 指向 `game/animation/tuanchat/default-*.json`；`Figure_Default_Enter_Duration=0` / `Figure_Default_Exit_Duration=300` 只作为未配置 JSON 动画时的 fallback。生成的 `changeFigure` 不再逐句追加默认时长参数；入场/退场标注会在实际 `changeFigure` 后紧跟 `setTransition`，保证 WebGAL 能把 transition 绑定到本次立绘切换；`figure.clear` 同时带退场标注时，会先输出 `setTransition -exit=...` 再清除立绘；动作类标注继续使用 `setAnimation`。

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
  - 候选总数大于 1：生成多条 `changeScene:{target}.txt -when={condition};`；无条件候选直接生成 `changeScene:{target}.txt;`
- 其中结束节点目标场景命名为 `__tc_end_{id}.txt`

3. 结束节点场景
- 首次需要时自动创建 `games/{gameName}/game/scene/__tc_end_{id}.txt`
- 内容固定为 `end;`

## 3. 消息类型到 WebGAL 场景脚本映射规则

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
- 普通展示图（`image.show`）：仅当消息显式带有 `image.show` 标注时才渲染；以固定 `image_message` 槽位在上半屏居中展示，并按横图/方图/竖图的固定档位缩放；最终会按安全区自动上移/缩放，避免压到底部文本框。只写入 `changeFigure`（不再追加 `setAnimation`，且不追加 `-next`）

3. `VIDEO(14)`
- `playVideo:{file};`
- 若含 `video.skipoff` 标注，附加 `-skipOff`

4. `SOUND(7)`
- BGM：先写 `unlockBgm:{file} -name={name};`，再写 `bgm:{file} -volume=? -next;`
- 音效：`playEffect:{file} -volume=? -id=? -next;`

5. `EFFECT(8)`
- `none` -> `pixiInit -next;`
- `clearBackground` -> `changeBg:none -next;`
- `clearFigure` -> 清空所有立绘槽位
- 其他特效 -> `pixiPerform:{effect} -next;`（可先补 `playEffect`）；樱花按 WebGAL 预制名输出 `cherryBlossoms`

6. `INTRO_TEXT(9)`
- `intro:内容;`
- 默认附带 `-hold`；若存在 `dialog.notend` 标注则不加 `-hold`

7. `WEBGAL_CHOOSE(13)`
- 从 `extra.webgalChoose` 生成 `choose + label + jumpLabel` 多行脚本

8. `DICE(6)`
- 支持 `script / anko / trpg / narration / dialog` 多种渲染模式
- 支持两步掷骰（预览 + 结果）与骰子音效
- TRPG 模式输出 `trpgDice` 覆盖卡片，可附加骰子音效；不再输出普通 `dice:` 或 Pixi 掷骰特效
- 支持“指令+回复”短时间窗口自动合并（默认 260ms）

9. 其他类型
- 默认不写入脚本（忽略）

## 4. 标注（annotations）影响规则

1. 预处理清理
- `background.clear`：在当前消息前写 `changeBg:none -next;`（背景图消息本身除外）
- `bgm.clear`：在当前消息前写 `bgm:none -next;`
- `image.clear`：清理 `image_message` 槽位
- `figure.clear`：清理所有立绘槽位（在本消息脚本前执行）

2. 立绘位置与动画
- 位置只来自 `annotations` 的 `figure.pos.*`。
- `figure.pos.*` 指定槽位；立绘资源只使用消息 `avatarId` 对应差分，缺少消息 `avatarId` 时不输出立绘和 `-figureId`。
- 未指定位置时：
  - `autoFigureEnabled = true` -> 默认 `left`
  - `autoFigureEnabled = false` -> 不显示立绘
- 立绘不会因普通消息自动清空，需显式清理。
- 角色立绘切换默认效果由 `config.txt` 的 `Figure_Default_Enter_Animation` / `Figure_Default_Exit_Animation` 指向 JSON 动画提供；团剧共创默认入场为 `tuanchat/default-enter`（立即保持不透明），出场为 `tuanchat/default-exit`（保持 299ms 后用 1ms 变透明）。`Figure_Default_Enter_Duration` / `Figure_Default_Exit_Duration` 只在没有配置 JSON 动画时作为 TS fallback。
- 入场/退场类标注（如 `figure.anim.enter`、`figure.anim.ba-exit-to-left`）在本条消息实际输出 `changeFigure` 时输出紧随其后的 `setTransition`；`figure.clear` 同时带退场标注时，会在 `changeFigure:none` 前为目标槽位补 `setTransition -exit=...`；动作类标注（如跳跃、摇晃）输出 `setAnimation`。

3. 对话拼接控制
- `dialog.notend` -> 对话加 `-notend`
- `dialog.concat` -> 对话加 `-concat`
- `dialog.next` -> 对话/旁白加 `-next`

4. 特效标注
- `effect.*` 会映射为 `pixiPerform`，并按配置推导时长/音效。

## 5. 小头像与 TTS 规则

1. 小头像（`miniAvatar`）
- 默认在 `miniAvatarEnabled=true` 时对普通对话输出
- 旁白/黑屏文字默认清空为 `miniAvatar:none;`
- 骰子消息可通过 payload 的 `showMiniAvatar` 覆盖
- `figure.mini-avatar` 标注可在单条消息上强制显示小头像，使用 `avatarFileId` 派生的小头像资源
- 历史渲染与单条消息更新前会预热本轮命中的小头像资源，避免首次命中时在渲染热路径内懒上传

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
- 顺序相同但内容有更新：先尝试局部 `self` 更新或从首个受影响消息起做 `suffix` 重渲染；只有无法安全局部处理时才全量重建
- 非追加的插入/删除/重排：全量重建
- 全量重建走 350ms 防抖，避免抖动
- 单条 `renderMessage` 在 `syncToFile=true` 时会将同一条消息产生的多行脚本合并为一次文件同步，避免重复整文件写回

5. 背景一致性修正
- 历史已渲染后，会监控“最新背景图消息”，变化时补渲染或清除背景

## 7. WebSocket 与文件写入边界

1. 渲染核心是“写场景文件”，可以在 websocket 未连接时执行。  
2. WebSocket 只负责预览推进：团剧共创侧使用 WebGAL 4.6.2 的 `webgal-editor-preview-sync.v1` 子协议发送 `preview.command.sync-scene`，不再发送旧版 `DebugCommand.JUMP` 消息。
3. `autoAdvanceEnabled` 只控制尾部新消息是否自动推进预览；手动点击历史消息始终通过 V1 `sync-scene` 跳转到该消息的行号。
4. V1 客户端会保留最后一次同步请求；预览 iframe 重新 ready 后会再次发送，避免重建预览时丢失目标行。

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
