# 素材包与素材实现方案

## 背景

这轮讨论已经收敛出几个明确结论：

- `素材包` 是这次交互设计里的核心容器，整体交互放在左侧，参考文件夹/资源管理器。
- `房间内` 还需要一个更轻量的快捷区，主要服务 GM 在游玩时快速切换场景，可参考表情包面板的网格交互。
- `素材包` 类似文件夹，可以包含子文件夹，也可以包含素材。
- `局内素材包` 是从外部素材包导入后的本地副本；局内改名、整理、备注，不影响原始素材包。
- 单个素材不仅要支持“单条消息”，也要支持“多条消息组合”，例如“背景图 + BGM”一键切换。
- 备注/命名的目标不是替代原文件名，而是帮助 GM 在大量场景图中快速识别语义。

本方案的目标，是在不破坏现有消息模型的前提下，把上述结论落成可开发的数据结构、前端交互和后端实现路径。

## 当前前端壳层（2026-03）

- 独立 `/material` 页面已调整为“角色页式”的局外素材库壳层：
  - 左侧为可收缩导航栏
  - 主入口为 `素材广场` 与 `我的素材包`
  - 主内容区使用搜索 + 卡片网格展示素材包
  - 查看/编辑/创建仍复用现有素材包编辑器弹层
- discover 内嵌素材页复用同一套内容区与编辑逻辑，但继续使用 discover 自身左导航，不重复显示独立素材侧栏。

## 术语约定

- `素材包`：类似文件夹/资源管理器的聚合容器，是这次交互讨论里的主体。
- `素材`：可被应用到房间的单元，本质上是一条或多条消息的封装。
- 讨论里口语说的 `tag`，技术上实际对应消息的 `message.annotations`。
- 下文如果出现 `素材库`，默认是指整套素材功能或空间级总数据，不指代单个文件夹式容器。

## 现有代码基础

当前仓库里已经有几块可以直接复用的基础能力。

### 1. 消息最终一定属于房间

当前 `Message` 模型里存在强约束：

- 前端类型：`tuan-chat-web/api/models/Message.ts`
- 后端实体：`TuanChat/src/main/java/com/jxc/tuanchat/chat/domain/entity/Message.java`
- 数据库注释：`TuanChat/sql/database.sql`

可以确认：

- `message.roomId` 是必填归属。
- 现有系统没有“空间级消息”这一层。

这意味着一个重要结论：

> MVP 阶段不应把素材包里的素材条目直接落成真实 `message` 记录；
> 更合适的做法是把素材存成“可重放的消息模板/消息快照”，等用户拖入房间时，再转成真实消息发送。

这和讨论里“素材最终应用时仍然走消息模型”的方向是一致的，只是把“持久化层”从真实消息，改成了“消息模板”。

### 2. `space.extra` 适合存空间级素材包总数据

当前空间扩展字段已经可按 key 存取字符串值：

- 后端控制器：`TuanChat/src/main/java/com/jxc/tuanchat/room/controller/SpaceController.java`
- 后端服务：`TuanChat/src/main/java/com/jxc/tuanchat/room/service/SpaceService.java`
- Mapper：`TuanChat/src/main/resources/mapper/SpaceMapper.xml`
- 前端 mutation：`tuan-chat-web/api/hooks/chatQueryHooks.tsx`

现状特征：

- `space.extra` 本体是 JSON。
- `/space/extra` 的 `value` 是字符串。
- 也就是说，当前模式本质上是“在 `space.extra` 的某个 key 下，存一段 JSON 字符串”。

例如：

```json
{
  "webgalRealtimeRenderSettings": "{\"ttsApiUrl\":\"...\"}"
}
```

这和你提出的“先直接用 JSON，放 `space extra`”是匹配的，也是当前改动成本最低的方案。

### 3. `room.extra` 适合存房间内快捷区

当前房间扩展字段同样已经打通：

- 后端控制器：`TuanChat/src/main/java/com/jxc/tuanchat/room/controller/RoomController.java`
- 后端服务：`TuanChat/src/main/java/com/jxc/tuanchat/room/service/RoomService.java`
- Mapper：`TuanChat/src/main/resources/mapper/RoomMapper.xml`
- 前端 hook：`tuan-chat-web/app/components/chat/core/hooks.tsx`

和 `space.extra` 不同的是：

- `room.extra` 目前已有 WebSocket 变更推送。
- 前端会在收到 `ROOM_EXTRA_CHANGE` 后按 key 失效查询缓存。

因此：

- `空间级素材包总数据` 放 `space.extra`
- `房间级场景快捷区` 放 `room.extra`

是当前最自然的切分。

### 4. 左侧树和底部网格都有现成参照

现有项目里已经有两个接近目标形态的 UI 参照：

- 左侧树：空间侧边栏频道树
  - 相关代码：`tuan-chat-web/app/components/chat/room/sidebarTree.ts`
  - 相关接口：`/space/sidebarTree`
- 底部网格：表情包面板
  - 相关代码：`tuan-chat-web/app/components/chat/window/StickerWindow.tsx`
  - 调用位置：`tuan-chat-web/app/components/chat/input/chatToolbar.tsx`

因此本功能不需要从零定义交互风格：

- 素材包总入口直接参考“左侧树”
- 房间内快捷场景面板直接参考“表情包网格”

## 设计总原则

### 1. 空间级素材包数据保存的是“消息模板”，不是已发送消息

这是本方案最关键的实现约束。

原因不是产品取舍，而是现有模型决定的：

- 真实消息一定属于某个 `roomId`
- 但素材包数据本身是空间级资源，不应依附单个房间

因此素材的存储层应该保存：

- 消息类型
- 内容
- `annotations`（讨论口语中称 tag）
- extra
- 预览信息
- 命名/备注/分组信息

真正应用到房间时，再转成一条或多条 `ChatMessageRequest` 批量发送。

### 2. “素材”复用消息结构，“素材包”负责组织

这里需要把两个概念分开：

- `素材项`：一个可被应用到房间的单元，本质上是一条或多条消息模板
- `素材包`：组织素材项和子素材包的树结构、命名、备注、来源信息

也就是说：

- 素材应用层沿用消息模型
- 素材管理层新增目录与元数据

### 3. 先做空间内本地素材包体系，不直接做全局独立库

MVP 先把“当前空间可管理、可拖拽、可快速切换”的链路跑通。

因此默认落点是：

- `space.extra.materialLibraryV1`
- `room.extra.sceneDockV1`

“局外素材包导入为局内素材包”的能力，第一阶段可以先理解为：

- 从外部来源导入后，复制成当前空间的本地素材条目
- 后续所有重命名、备注、排序都只改当前空间内的数据

## 推荐数据分层

建议拆成两层。

### 1. 空间级素材包定义层

存储位置建议：`space.extra.materialLibraryV1`

作用：

- 保存素材包树
- 保存素材项元数据
- 保存素材项包含的消息模板
- 保存导入来源信息

这层是“空间内资源库”。

### 2. 房间级快捷区运行层

存储位置建议：`room.extra.sceneDockV1`

作用：

- 保存当前房间固定展示的场景快捷项
- 保存每个快捷项引用了哪个素材
- 保存房间对素材的局部排序/置顶

这层是“房间内操作面板”。

## 核心数据模型

### 1. `space.extra.materialLibraryV1`

建议以一个完整 JSON 字符串挂在 `space.extra` 的 `materialLibraryV1` key 下。

### 顶层结构

```json
{
  "version": 1,
  "rootPackageIds": ["pkg_scene", "pkg_audio"],
  "packages": {
    "pkg_scene": {
      "packageId": "pkg_scene",
      "name": "场景",
      "parentPackageId": null,
      "order": 100
    },
    "pkg_audio": {
      "packageId": "pkg_audio",
      "name": "音频",
      "parentPackageId": null,
      "order": 200
    }
  },
  "materials": {
    "mat_warm_house": {
      "materialId": "mat_warm_house",
      "packageId": "pkg_scene",
      "name": "温馨小屋",
      "note": "主角日常居住的一楼内景",
      "preview": {
        "kind": "image",
        "url": "https://example.com/warm-house.webp"
      },
      "bundleMode": "single",
      "messageTemplates": [
        {
          "messageType": 2,
          "content": "",
          "annotations": ["背景"],
          "webgal": {},
          "extra": {
            "imageMessage": {
              "url": "https://example.com/warm-house.webp",
              "fileName": "warm-house.webp",
              "width": 1920,
              "height": 1080,
              "background": true
            }
          }
        }
      ],
      "source": {
        "kind": "localUpload"
      },
      "createdAt": "2026-03-18T10:00:00+08:00",
      "updatedAt": "2026-03-18T10:00:00+08:00"
    }
  }
}
```

### 字段说明

#### `packages`

素材包负责目录组织，不直接承载消息内容本身。

建议字段：

- `packageId`
- `name`
- `parentPackageId`
- `order`

#### `materials`

每个素材项是一个真正可应用的资源单元。

建议字段：

- `materialId`
- `packageId`
- `name`
- `note`
- `preview`
- `bundleMode`
- `messageTemplates`
- `source`
- `createdAt`
- `updatedAt`

其中最重要的是 `messageTemplates`。

素材的用途标注不单独新增 `tags` 字段，而是直接复用消息模板里的 `annotations`。

### `messageTemplates` 设计

`messageTemplates` 不是完整 `ChatMessageRequest`，而是去掉 `roomId` 后的“消息模板快照”。

建议结构：

```json
{
  "messageType": 2,
  "content": "",
  "annotations": ["背景"],
  "customRoleName": null,
  "roleId": null,
  "avatarId": null,
  "webgal": {},
  "extra": {
    "imageMessage": {
      "url": "https://example.com/a.webp",
      "fileName": "a.webp",
      "width": 1920,
      "height": 1080,
      "background": true
    }
  }
}
```

这样做的好处：

- 结构直接贴近现有 `ChatMessageRequest`
- 应用到房间时只需补 `roomId`
- 单素材和组合素材都能统一处理

### `bundleMode`

建议值：

- `single`：只包含一条消息模板
- `bundle`：包含多条消息模板

这里不建议只靠 `messageTemplates.length` 判断，保留一个显式字段更利于 UI 展示和后续扩展。

### `source`

用于标记来源，但不参与应用逻辑。

建议值：

- `localUpload`
- `copiedFromExternalPack`
- `copiedFromSpace`
- `generated`

如果后续要追踪导入来源，可以附加：

- `sourceRepositoryId`
- `sourceSpaceId`
- `sourceMaterialId`

### 2. `room.extra.sceneDockV1`

房间内快捷区只引用素材，不复制大块模板。

推荐结构：

```json
{
  "version": 1,
  "items": [
    {
      "dockItemId": "dock_1",
      "materialId": "mat_warm_house",
      "label": "温馨小屋",
      "note": "开场场景",
      "order": 100
    },
    {
      "dockItemId": "dock_2",
      "materialId": "mat_underground_bundle",
      "label": "地下设施",
      "note": "切到惊悚段落",
      "order": 200
    }
  ]
}
```

注意这里的 `label` / `note` 是房间视角的快捷文案，不替代素材库里的原始命名。

这样可以支持：

- 同一个素材被多个房间以不同备注引用
- 房间内只维护快捷区，不重复存整套素材数据

## 为什么不建议第一阶段新增独立表

第一阶段默认不新增表，理由有四个。

### 1. 现有链路已经能承载 JSON 配置

当前已有：

- `space.extra` 读写接口
- `room.extra` 读写接口
- `room.extra` 的 WS 通知

足够支撑 MVP 的目录管理、重命名、备注、快捷区和批量应用。

### 2. 先验证产品形态，再决定是否拆表

当前讨论里的核心问题还是：

- 场景和 BGM 是否经常组合
- 房间内快捷区如何摆放更顺手
- 局内素材包是否会频繁重组

这些都还属于产品形态验证期。

### 3. 素材库元数据天然是树形和组合结构

目录树、组合素材、来源信息，本身就更接近 JSON 文档，而不是第一时间就强行三范式拆表。

### 4. 当前更大的约束不是查询，而是协作编辑

MVP 阶段真正的风险是“多人同时修改同一份素材树”，而不是 SQL 查询能力不够。

因此第一阶段先用 JSON，是合理的。

## 什么时候需要升级为独立表

如果后续出现以下情况，建议升级到独立接口，必要时独立表：

- 单个空间素材数量达到几百到几千条
- 需要复杂筛选、搜索、分页
- 多人同时频繁拖拽排序、重命名、移动目录
- 需要素材使用统计、引用关系反查、审计日志
- 需要局外素材包与局内素材包做增量同步，而不是一次性复制

到那时可考虑拆成：

- `material_folder`
- `material_item`
- `material_item_message_template`
- `room_scene_dock_item`

但这不应该是 MVP 的默认路径。

## 应用到房间的执行模型

### 1. 单素材应用

当用户点击或拖拽一个 `single` 素材到房间时：

1. 读取对应 `material.messageTemplates[0]`
2. 补上当前 `roomId`
3. 组装成 `ChatMessageRequest`
4. 走现有发送消息接口

### 2. 组合素材应用

当用户点击或拖拽一个 `bundle` 素材到房间时：

1. 读取该素材的全部 `messageTemplates`
2. 逐个补上当前 `roomId`
3. 按原顺序组装为 `ChatMessageRequest[]`
4. 走现有批量发送接口

当前代码里已经有批量发送入口：

- 前端：`useBatchSendMessageMutation`
- 后端：`ChatController.batchSendMessages`

因此“背景图 + BGM 一键切换”不需要额外发明消息模型，只要把素材条目映射成批量发送请求即可。

### 3. 为什么组合素材不直接做成“场景专属对象”

因为讨论已经明确：

- 单条消息是基础积木
- 多条消息组合是对积木的编排

因此更好的抽象不是单独做“场景对象”，而是：

- 统一做 `material`
- `material` 既支持一条模板，也支持多条模板

这样图片、BGM、展示图、视频都能走同一条链路。

## 前端交互建议

### 1. 左侧新增“素材包”树面板

位置：

- 与房间列表同层级，放在左侧

形态：

- 参考空间侧边栏树
- 支持素材包展开/收起
- 支持拖拽排序
- 支持右键菜单

MVP 操作：

- 新建素材包
- 重命名素材包
- 新建素材
- 重命名素材
- 编辑备注
- 删除素材
- 将素材拖到房间
- 将素材加入当前房间快捷区

### 2. 房间输入区附近新增“场景快捷区”

位置建议：

- 与表情包同一视觉区域
- 但语义上区分为“快捷切换场景”

形态建议：

- 参考 `StickerWindow` 的网格布局
- 每个卡片展示缩略图、名称、可选备注
- 点击即应用到当前房间

为什么不只做左侧树：

- 左侧树适合管理
- 底部网格适合游玩过程中的快速点击

这两个入口职责不同，不应互相替代。

### 3. 拖拽语义

建议支持三种拖拽。

### 从本地文件拖到素材包

行为：

- 上传文件
- 生成一个单条消息模板素材
- 自动归入当前素材包

### 从素材包拖到房间

行为：

- 将素材转成一条或多条 `ChatMessageRequest`
- 直接发送到当前房间

### 从素材包拖到房间快捷区

行为：

- 不发送消息
- 只是把该素材加入 `room.extra.sceneDockV1`

## 命名、备注与标签策略

讨论里已经明确要求“能命名，且和房间名区分开”。

因此建议拆成三层。

### 1. 素材名称 `name`

面向管理。

用于：

- 素材包中的素材列表展示
- 搜索
- 快捷区默认标题

### 2. 素材备注 `note`

面向识别。

用于：

- 给 GM 提示当前图片对应哪个剧情/地点
- 可选择在玩家端展示

备注是否对玩家可见，讨论里没有完全定死，因此 MVP 建议先只做管理端可见；如需要玩家可见，再加显式开关字段，例如 `noteVisibleToPlayers`。

### 3. 消息标注 `annotations`

这里在讨论里口语会说成 `tag`，但实现上应严格落到消息的 `annotations`。

例如：

- `背景`
- `展示`
- `BGM`

也就是说，素材的用途不是单独再发明一套 `tags` 字段，而是沿用现有消息标注体系。

## 关于“素材就是消息”的最终落地解释

为了避免实现时概念跑偏，这里把最终解释说清楚。

讨论里“素材就是消息”的产品含义是：

- 素材被应用到房间后，应该和普通消息走同一套演出链路
- 图片/音频/视频/文档只是消息类型不同
- `annotations` 和消息内容共同构成“素材”；为了方便非技术讨论，可以口语称为 tag

但在存储实现上，MVP 更合理的表达是：

> 素材包里的素材保存的是“消息模板快照”，不是已经发送到某个房间里的真实消息。

这样既不违背产品抽象，也符合当前代码约束。

## 后端实现建议

### 第一阶段：完全复用现有 extra 接口

默认方案：

- 空间素材库：`space.extra.materialLibraryV1`
- 房间快捷区：`room.extra.sceneDockV1`

优点：

- 不新增表
- 不改消息主模型
- 可以快速上线验证交互

缺点：

- `space.extra` 当前没有 WS 增量通知
- 素材包总数据整块 JSON 写入时存在并发覆盖风险

### 第二阶段：为素材库补专用接口

如果第一阶段验证通过，建议第二阶段至少补一个专用接口层，而不是继续大量堆在 `/space/extra` 上。

推荐方向：

- `GET /space/materialLibrary`
- `PUT /space/materialLibrary`
- `POST /space/materialLibrary/apply`
- `PUT /room/sceneDock`

哪怕底层仍先写 `space.extra` / `room.extra`，接口层也应从通用 extra 抽离出来，避免前端散落太多 key 字符串。

### 第三阶段：高频协作时再拆表

如果确认是高频使用的核心模块，再走独立表和增量同步。

## 风险点

### 1. `space.extra` 当前没有 WS 推送

现状已经在 `SpaceService` 里写了 `TODO`。

这意味着：

- A 用户编辑素材包数据后
- B 用户不会像 `room.extra` 那样自动收到变更

MVP 可接受的做法：

- 本地编辑后主动失效 `getSpaceInfo`
- 切空间/切页面时重新拉取

如果多人同时管理素材包，这一点会很快成为瓶颈。

### 2. 整块 JSON 更新存在覆盖风险

无论 `space.extra` 还是 `room.extra`，第一阶段都不是细粒度 patch。

因此会出现典型风险：

- A 改文件夹名
- B 同时改素材备注
- 后写入的一方覆盖前者

如果素材包开始频繁协作，建议尽快引入：

- 版本号
- 乐观锁
- 专用接口

这点可直接参考现有 `space/sidebarTree` 的版本化做法。

### 3. 组合素材会放大编辑复杂度

单条素材很直观，组合素材则涉及：

- 排序
- 预览主图
- 点击行为
- 局部启用/停用

因此 MVP 建议只支持：

- 固定顺序执行
- 不做组合内部单项开关
- 不做复杂条件编排

否则功能会迅速从“素材包体系”膨胀成“演出编排器”。

## 推荐开发顺序

### 第一步

补一份前端 `materialLibrary` 类型定义与解析函数。

目标：

- 统一读写 `space.extra.materialLibraryV1`
- 统一读写 `room.extra.sceneDockV1`

### 第二步

做空间级素材包左侧树。

MVP 范围：

- 素材包展示
- 素材包重命名
- 素材列表
- 素材预览
- 素材重命名
- 备注编辑

### 第三步

做“上传文件生成素材”。

MVP 先支持：

- 图片
- 音频

原因：

- 这两类正好覆盖“场景图 + BGM”的核心诉求

### 第四步

做“素材应用到房间”。

包括：

- 单素材发送
- 组合素材批量发送

### 第五步

做房间快捷区。

包括：

- 从素材包加入快捷区
- 快捷区排序
- 点击快捷应用

### 第六步

如果体验验证通过，再补：

- 外部素材包导入
- 组合素材编辑器
- `space.extra` 变更推送

## MVP 范围建议

为了尽快上线，MVP 建议只做：

- 空间级素材包树
- 文件夹管理
- 图片/音频两类素材
- 素材命名与备注
- 单素材应用到房间
- 组合素材批量应用到房间
- 房间级场景快捷区

先不做：

- 全局素材市场
- 素材包增量同步
- 复杂搜索筛选
- 组合素材内部条件逻辑
- 玩家端备注显式展示开关
- 自动绑定 BGM 循环策略编辑

## 总结

当前最合适的落地方式是：

- 素材包总数据先放 `space.extra.materialLibraryV1`
- 房间快捷区先放 `room.extra.sceneDockV1`
- 素材条目保存“消息模板快照”，而不是直接保存真实消息
- 应用素材到房间时，再转成一条或多条 `ChatMessageRequest`
- 单条素材和组合素材走同一模型
- 左侧负责管理，底部负责快速切换

这条路线和现有代码结构是对齐的，也能最大程度保留你们讨论里已经定下来的产品方向。
