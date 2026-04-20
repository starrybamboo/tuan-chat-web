# 团剧共创 WebGAL 索引

这份索引用来快速定位“团剧共创”和 WebGAL / Terre 联动的关键上下文，避免后续重复摸索。

## 概念对应

- “团剧共创”在当前本地环境里，主要指 `D:\A_collection\tuan-chat-web` 中的聊天前端与空间级 WebGAL 实时渲染能力。
- WebGAL 引擎源码位于 `D:\A_webgal\WebGAL`。
- Terre 预览后端位于 `D:\A_webgal\WebGAL_Terre\packages\terre2`。
- 本地示例 / 历史材料可参考 `D:\A_webgal\webgal_tuan_chat_demo`。

## 仓库与职责

- `D:\A_collection\tuan-chat-web`
  - 负责团剧共创侧的空间设置、云端持久化、实时渲染编排、将配置写入 WebGAL `config.txt`。
- `D:\A_webgal\WebGAL`
  - 负责 WebGAL 运行时行为、底栏 / 标题 / 菜单 UI、`config.txt` 对应全局变量的实际生效。
- `D:\A_webgal\WebGAL_Terre\packages\terre2`
  - 负责模板托管、游戏预览、模板复制与本地 WebGAL 预览服务。

## 团剧共创关键入口

- 预览面板：
  - `D:\A_collection\tuan-chat-web\app\components\chat\shared\webgal\webGALPreview.tsx`
- 空间级 WebGAL 设置页：
  - `D:\A_collection\tuan-chat-web\app\components\chat\window\spaceWebgalRenderWindow.tsx`
- 云端设置类型与读写：
  - `D:\A_collection\tuan-chat-web\app\components\chat\infra\cloud\realtimeRenderSettingsCloud.ts`
- Zustand store：
  - `D:\A_collection\tuan-chat-web\app\components\chat\stores\realtimeRenderStore.ts`
- 实时渲染器与 `config.txt` 写入：
  - `D:\A_collection\tuan-chat-web\app\webGAL\realtimeRenderer.ts`
- 渲染编排入口：
  - `D:\A_collection\tuan-chat-web\app\components\chat\core\realtimeRenderOrchestrator.tsx`

## WebGAL 引擎关键入口

- 说话立绘解析：
  - `D:\A_webgal\WebGAL\packages\webgal\src\Core\gameScripts\resolveFigureTarget.ts`
- `say` / `vocal` 写入当前发言立绘 key：
  - `D:\A_webgal\WebGAL\packages\webgal\src\Core\gameScripts\say.ts`
  - `D:\A_webgal\WebGAL\packages\webgal\src\Core\gameScripts\vocal\index.ts`
- 主舞台角色聚焦应用：
  - `D:\A_webgal\WebGAL\packages\webgal\src\Stage\MainStage\useApplySpeakerFocus.ts`
  - `D:\A_webgal\WebGAL\packages\webgal\src\Stage\MainStage\MainStage.tsx`
- 完整设置入口控制：
  - `D:\A_webgal\WebGAL\packages\webgal\src\Core\util\allowFullSettings.ts`
  - `D:\A_webgal\WebGAL\packages\webgal\src\UI\Title\Title.tsx`
  - `D:\A_webgal\WebGAL\packages\webgal\src\UI\BottomControlPanel\BottomControlPanel.tsx`
  - `D:\A_webgal\WebGAL\packages\webgal\src\UI\BottomControlPanel\BottomControlPanelFilm.tsx`
  - `D:\A_webgal\WebGAL\packages\webgal\src\UI\Menu\Menu.tsx`
  - `D:\A_webgal\WebGAL\packages\webgal\src\UI\Menu\MenuPanel\MenuPanel.tsx`
- 角色聚焦开发期配置读取：
  - `D:\A_webgal\WebGAL\packages\webgal\src\Core\util\speakerFocusConfig.ts`

## Terre 预览关键入口

- 模板补齐逻辑：
  - `D:\A_webgal\WebGAL_Terre\packages\terre2\src\main.ts`
- 手动同步模板脚本：
  - `D:\A_webgal\WebGAL_Terre\packages\terre2\update-webgal.ts`
- 引擎 dist 路径解析与模板复制公共逻辑：
  - `D:\A_webgal\WebGAL_Terre\packages\terre2\src\util\webgalEngine.ts`
- WebGAL 到 Terre 的一键同步脚本：
  - `D:\A_webgal\WebGAL\sync-terre-engine.ps1`

## 当前已确认的配置键

- `Allow_Full_Settings`
  - 含义：是否允许玩家打开完整设置页。
  - 团剧共创侧字段名：`allowOpenFullSettings`
  - 默认值：`true`
- `Enable_Speaker_Focus`
  - 含义：命中发言目标时，其他立绘压暗，当前角色保持原亮度。
  - 这是开发期 / 游戏配置决定项，不再提供给玩家在游戏内切换。
  - 默认值：`true`
- `Show_panic`
  - 团剧共创侧字段名：`showPanicEnabled`
- `Enable_Appreciation`
  - 团剧共创侧字段名：`enableAppreciation`
- `TypingSoundEnabled`
  - 团剧共创侧字段名：`typingSoundEnabled`

## 已确认的产品决策

- “角色发言聚焦”不再作为玩家侧游戏内设置项。
- “角色发言聚焦”改为开发期配置，由 `config.txt` 的 `Enable_Speaker_Focus` 决定。
- 角色发言聚焦的“显式发言目标”不仅包括 `figureId`，也包括 `-left` / `-right` / `-center` 这类位置参数；这些参数同样可以触发压暗其他立绘。
- “允许打开完整设置”属于团剧共创空间级配置，需要从云端设置透传到 WebGAL `config.txt` 的 `Allow_Full_Settings`。
- 团剧共创侧“默认打开”的意思是空间配置默认值为 `true`，不是在游戏运行时再给玩家二次选择。

## Terre / 预览链路注意事项

- Terre 连接地址固定：
  - `VITE_TERRE_URL=http://localhost:3001`
  - `VITE_TERRE_WS=ws://localhost:3001/api/webgalsync`
- `sync-terre-engine.ps1` 现在会：
  - 必要时自动创建 `D:\A_webgal\WebGAL_Terre\packages\terre2\node_modules\webgal-engine`
  - 将 `D:\A_webgal\WebGAL\packages\webgal\dist` 同步到 Terre 包内引擎目录
  - 调用 `yarn update-engine` 刷新 Terre 模板
- Terre 模板补齐逻辑现在会优先检查以下候选引擎路径：
  - `packages\terre2\node_modules\webgal-engine\dist`
  - 工作区根 `node_modules\webgal-engine\dist`
  - 旁边本地 `D:\A_webgal\WebGAL\packages\webgal\dist`

## 近期相关提交

- `D:\A_collection\tuan-chat-web`
  - `90c8a1c9 feat(webgal): add full settings toggle`
- `D:\A_webgal\WebGAL`
  - `221e082f feat(webgal): add speaker focus and settings gate`
  - `ca11e8fb refactor(webgal): make speaker focus dev-config only`

## 后续检索建议

- 如果用户提到“团剧共创的 WebGAL 设置”“空间级渲染设置”“Terre 预览不同步”“完整设置开关”“角色发言聚焦”，先读这份文件，再去对应仓库落点查代码。
