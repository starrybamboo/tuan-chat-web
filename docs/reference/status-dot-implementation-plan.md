# 状态、DOT 与计数器实现思路

## 背景

当前需求的核心不是“再做一个单独的面板”，而是给房间内的战斗单位提供一套可聚合的战斗状态模型，使用户能在同一处看到：

- 状态叠层后的属性修正汇总
- DOT 的总伤害或总效果
- 角色独立计数器
- 房间级环境计数器

目标效果示例：

- 已定义状态：
  - `疯狂`：命中 `-3`，伤害 `-2`，移速 `+2`
  - `兴奋`：伤害 `+1`，移速 `+1`
  - `专注`：命中 `+1`
- 某角色当前拥有：
  - `疯狂 x2`
  - `兴奋 x3`
  - `专注 x4`
- 最终展示为：
  - `状态：命中-2，伤害-1，移速+7`

## 现有代码基础

当前项目里已经有两个可复用的挂点：

### 1. 房间扩展字段 `room.extra`

先攻表当前就是通过 `room.extra` 存储的：

- 前端读写入口：`app/components/chat/core/hooks.tsx`
- 先攻表使用处：`app/components/chat/room/drawers/initiativeList.tsx`
- 后端接口：
  - `TuanChat/src/main/java/com/jxc/tuanchat/room/controller/RoomController.java`
  - `TuanChat/src/main/java/com/jxc/tuanchat/room/service/RoomService.java`
  - `TuanChat/src/main/resources/mapper/RoomMapper.xml`

这套链路已经支持：

- 按 key 存 JSON
- WebSocket 通知房间 extra 变更
- 前端收到后按 key 刷新缓存

### 2. 空间扩展字段 `space.extra`

如果某些内容是“规则或空间层面的预设”，而不是当前房间即时数据，更适合挂在 `space.extra`。

这类内容包括：

- 状态模板定义
- DOT 模板定义
- 计数器模板定义
- 展示顺序、显示名、单位等元数据

## 建议分层

建议把这套能力拆成两层数据：

### 1. 定义层：模板

存储位置建议：`space.extra.combatDefinitions`

作用：

- 定义有哪些状态
- 每个状态包含哪些效果
- 哪些计数器是角色级
- 哪些计数器是房间级
- 每个统计项如何显示

这一层应当是“配置”，不直接记录当前谁有几层。

### 2. 运行层：当前战斗态

存储位置建议：`room.extra.combatState`

作用：

- 当前房间里每个战斗单位挂了哪些状态
- 每个状态叠了几层
- 每个单位当前独立计数器是多少
- 当前房间环境计数器是多少

这一层应当是“即时状态”，不负责定义模板本身。

## 为什么不要直接挂到角色本体

不建议把战斗状态直接塞进 `UserRole.extra`，原因有三个：

1. `UserRole` 更偏向角色卡静态信息。
2. 同一个角色可能出现在多个房间，战斗状态会串房间。
3. 这类状态明显属于“房间内一场战斗的局部态”，不属于永久角色资料。

## 核心数据模型建议

关键点：不要用中文显示名做聚合键，要用稳定的机器键。

例如：

- `hit`
- `damage`
- `move`

显示时再映射成：

- 命中
- 伤害
- 移速

这样做的好处：

- 改显示文案不会影响聚合逻辑
- 中英文规则可以共用一套底层逻辑
- 可以稳定排序和扩展

### 定义层示例

```json
{
  "statDefs": {
    "hit": { "label": "命中", "order": 10 },
    "damage": { "label": "伤害", "order": 20 },
    "move": { "label": "移速", "order": 30 }
  },
  "statusTemplates": {
    "crazy": {
      "name": "疯狂",
      "stackable": true,
      "effects": [
        { "kind": "modifier", "statKey": "hit", "value": -3 },
        { "kind": "modifier", "statKey": "damage", "value": -2 },
        { "kind": "modifier", "statKey": "move", "value": 2 }
      ]
    },
    "excited": {
      "name": "兴奋",
      "stackable": true,
      "effects": [
        { "kind": "modifier", "statKey": "damage", "value": 1 },
        { "kind": "modifier", "statKey": "move", "value": 1 }
      ]
    },
    "focused": {
      "name": "专注",
      "stackable": true,
      "effects": [
        { "kind": "modifier", "statKey": "hit", "value": 1 }
      ]
    }
  },
  "dotTemplates": {
    "burning": {
      "name": "灼烧",
      "effects": [
        { "kind": "dot", "dotKey": "hpLossPerRound", "value": 2 }
      ]
    }
  },
  "counterTemplates": {
    "resonance": {
      "label": "共鸣",
      "scope": "combatant",
      "min": 0,
      "max": 10
    },
    "temperature": {
      "label": "温度",
      "scope": "room",
      "unit": "°C"
    }
  }
}
```

### 运行层示例

```json
{
  "combatants": {
    "c1": {
      "roleId": 1001,
      "name": "示例角色",
      "statuses": [
        { "templateId": "crazy", "stacks": 2 },
        { "templateId": "excited", "stacks": 3 },
        { "templateId": "focused", "stacks": 4 }
      ],
      "dots": [
        { "templateId": "burning", "stacks": 1 }
      ],
      "counters": {
        "resonance": 3
      }
    }
  },
  "roomCounters": {
    "temperature": 50
  }
}
```

## 聚合算法

聚合逻辑应当只依赖“模板 + 当前层数”。

### 状态聚合

对某个战斗单位：

1. 取出其所有 `statuses`
2. 根据 `templateId` 找到对应状态模板
3. 读取模板里的 `modifier` 效果
4. 用 `effect.value * stacks` 累加到 `summary[statKey]`
5. 过滤值为 `0` 的项
6. 按 `statDefs.order` 排序输出

### 示例计算

对于：

- `疯狂 x2`
- `兴奋 x3`
- `专注 x4`

结果为：

- 命中：`-3 * 2 + 1 * 4 = -2`
- 伤害：`-2 * 2 + 1 * 3 = -1`
- 移速：`2 * 2 + 1 * 3 = 7`

最终展示：

- `状态：命中-2，伤害-1，移速+7`

### DOT 聚合

DOT 可以沿用同一套思路，但建议显示为单独一行，不要混在属性修正里。

示例：

- `灼烧 x2`
- 每层每回合 `2`

汇总后：

- `DOT：灼烧 4/轮`

如果有多种 DOT，可并列显示：

- `DOT：灼烧 4/轮，流血 2/轮`

## 单位标识建议

这里有一个实现上的关键问题：

当前先攻表项主要还是按 `name` 识别和更新，这对状态系统不够稳定。

建议在先攻表数据里补一个稳定主键，例如：

- `combatantId`

不要再只依赖：

- 角色名
- 可选的 `roleId`

原因：

- 临时敌人可能没有 `roleId`
- 同名单位会冲突
- 改名后旧状态可能丢失或串到别的条目

### 建议做法

先把先攻表项改成：

```ts
interface Initiative {
  combatantId: string;
  name: string;
  value: number;
  hp?: number | null;
  maxHp?: number | null;
  extras?: Record<string, string | number | null>;
  roleId?: number;
}
```

之后状态、DOT、计数器都挂到 `combatantId` 上。

## UI 建议

不建议单独再做一个完全独立的面板，第一阶段最自然的方案是“依附先攻表”。

### 方案 A：先攻表内扩展

在每个先攻条目中增加一段折叠区：

- 第一行：基础信息（名字 / HP / 先攻）
- 第二行：状态汇总
- 第三行：DOT 汇总
- 第四行：独立计数器

房间环境计数器放在列表顶部或底部单独区域。

优点：

- 战斗相关信息集中
- 用户理解成本低
- 复用现有先攻抽屉

### 方案 B：先攻抽屉内双区布局

左侧保留先攻列表，右侧显示当前选中单位的详细状态编辑区。

优点：

- 适合状态很多的系统
- 编辑体验更完整

缺点：

- 改造成本更高
- 需要处理移动端空间

如果目标是先落地 MVP，优先建议方案 A。

## 后端实现建议

### 第一阶段：最小可落地版本

继续复用现有 `room.extra` / `space.extra` 能力，不新增表。

优点：

- 改动小
- 复用当前缓存和 WebSocket 机制
- 先把规则与展示跑通

适合：

- 频率不算极高
- 同时编辑人数有限
- 先验证产品形态

### 第二阶段：高频协作版本

如果后续出现这些情况，就需要独立接口甚至独立表：

- 多人同时频繁加减层数
- 回合推进时自动结算
- 需要细粒度 WebSocket 增量同步
- 需要日志、撤销、审计

这时建议参考房间地图模块的做法，走独立服务而不是继续整块覆盖 `room.extra`。

## 风险点

### 1. `room.extra` 是整块覆盖写入

现有 `useRoomExtra` 的写法是整块 JSON 覆盖。

这意味着：

- A 用户改状态
- B 用户同时改计数器
- 后写的一方可能覆盖前写的一方

第一阶段可以接受，但一定要在设计上记住这是已知限制。

### 2. 先攻项缺少稳定主键

如果继续用名字做主键，后续状态编辑一定会出问题。

### 3. 模板与运行态不能混在一起

如果把模板定义和运行数据塞到一个对象里，后面会很难维护：

- 复制房间时难拆分
- 规则复用困难
- UI 编辑边界混乱

## 推荐开发顺序

### 第一步

先攻数据补稳定 `combatantId`。

### 第二步

新增 `space.extra.combatDefinitions`：

- 状态模板
- DOT 模板
- 计数器模板
- 统计项显示信息

### 第三步

新增 `room.extra.combatState`：

- 单位状态
- 单位 DOT
- 单位独立计数器
- 房间环境计数器

### 第四步

在先攻表中增加：

- 状态汇总展示
- DOT 汇总展示
- 计数器展示

### 第五步

补编辑能力：

- 加减层数
- 直接设置层数
- 增减计数器
- 选中模板快速挂状态

### 第六步

如果确认高频使用，再把 `room.extra` 方案升级成独立接口和独立 WS 增量事件。

## MVP 范围建议

为了尽快上线，MVP 建议只做这几项：

- 状态模板定义
- 角色状态叠层
- 状态聚合展示
- 角色独立计数器
- 房间环境计数器

先不做：

- 自动回合推进
- DOT 自动结算
- 状态持续时间自动减少
- 完整日志与撤销

## 总结

这套需求本质上不是“多显示几列”，而是补一层房间级战斗状态系统。

推荐结论：

- 模板定义放 `space.extra`
- 当前战斗状态放 `room.extra`
- 先攻表继续作为主要承载 UI
- 聚合基于稳定机器键，不基于中文显示名
- 先把先攻项补 `combatantId`
- 第一阶段不新增表，先验证产品形态

这样可以在不破坏现有结构的前提下，最小成本把状态、DOT 和计数器能力接进来。
