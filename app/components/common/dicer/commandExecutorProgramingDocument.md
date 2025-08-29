# 骰娘指令编写指北

## 概述

本文档旨在帮助项目新人快速理解如何编写骰娘指令（cmdExe）。骰娘指令是用于处理用户输入并执行相应逻辑的模块。每个指令都包含元信息和执行逻辑。
在设计上参考了`SealDice`的指令实现方式，并结合项目实际需求进行了调整。

## 核心概念

### 1. RuleNameSpace (规则命名空间)

RuleNameSpace 是一个用于管理和执行一组相关命令的类。它包含以下属性：

- `id`: 命名空间的唯一标识符
- `name`: 命名空间名称
- `alias`: 命名空间别名数组
- `description`: 命名空间描述
- `cmdMap`: 命令映射表，存储命令名称/别名与执行器的映射

主要方法：

- `addCmd(cmd: CommandExecutor)`: 添加命令到命名空间
- `getCmd(name: string)`: 获取命令信息
- `getCmdList()`: 获取命名空间下所有命令的列表
- `execute(name: string, args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp)`: 执行命令

### 2. CommandExecutor (命令执行器)

#### `CommandExecutor` 是封装命令信息和执行逻辑的类。它包含以下属性

- `cmdInfo`: 命令的元信息
- `solve`: 命令执行函数

#### `CommandExecutor` 的构造函数参数

- `name`: 命令名称
- `alias`: 命令别名数组
- `description`: 命令描述
- `examples`: 使用示例数组
- `usage`: 用法说明
- `solve`: 命令执行函数

### 3. 相关接口

#### CommandInfo`

```typescript
interface CommandInfo {
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
}
```

#### `ExecutorProp`

```typescript
/**
 * 指令原始信息属性
 * 用于传递指令原始信息，包括指令名称、参数、被提及的用户等
 */
interface ExecutorProp {
  roomId?: number;
  originMessage?: string;
  replyMessageId?: number;
  dicerRoleId?: number;
  dicerAvatarId?: number;
  command: string;
  mentionedRoles?: UserRole[];
}
```

#### CPI

```typescript
/**
 * Command Programming Interface
 * 提供指令执行所需的接口
 */
interface CPI {
  /**
   * 获取角色能力列表
   * @param roleId 角色ID
   * @returns 角色能力列表
   */
   */
  getRoleAbilityList: (roleId: number) => RoleAbility;
  /**
   * 设置角色能力列表
   * @param roleId 角色ID
   * @param abilityList 角色能力列表
   * @returns void
   */
  setRoleAbilityList: (roleId: number, abilityList: RoleAbility) => void;
  /**
   * 发送信息
   * @param prop 指令原始信息属性
   * @param msg 要发送的消息
   * @returns void
   * @description 发送消息，注意在发送消息时，角色的原始指令也会发送到聊天中。尽量避免多次调用此接口。
   */
  sendMsg: (prop: ExecutorProp, msg: string) => void;
  /**
   * 发送Toast消息
   * @param msg 要发送的Toast消息
   * @returns void
   * @description 发送Toast消息，注意在发送Toast消息时，角色的原始指令不会发送到聊天中。
   */
  sendToast: (msg: string) => void;
}
```

#### UserRole

```typescript
interface UserRole {
  userId: number;
  roleId: number;
  roleName?: string;
  description?: string;
  avatarId?: number;
  state?: number;
  modelName?: string;
  speakerName?: string;
  createTime?: string;
  updateTime?: string;
}
```

#### RoleAbility

```typescript
interface RoleAbility {
  abilityId?: number;
  roleId?: number;
  ruleId?: number;
  act?: Record<string, string>;
  ability?: Record<string, number>;
}
```

## 编写指令步骤

### 1. 创建 RuleNameSpace 实例

首先，创建一个 RuleNameSpace 实例来管理相关命令：

```typescript
import { RuleNameSpace } from "@/components/common/dicer/cmd";

const ruleCoc = new RuleNameSpace(
  0,
  "coc7",
  ["coc", "coc7th"],
  "COC7版规则的指令集",
);

export default ruleCoc;
```

### 2. 创建 CommandExecutor 实例

为每个具体指令创建 CommandExecutor 实例：

```typescript
import { CommandExecutor } from "@/components/common/dicer/cmd";

const cmdRc = new CommandExecutor(
  "rc",
  ["ra"],
  "进行技能检定",
  [".rc 侦查 50", ".rc 侦查 +10", ".rc p 手枪", ".rc 力量"],
  "rc [奖励/惩罚骰]? [技能名] [技能值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
    // 实现指令逻辑
    // ...
    return true;
  },
);
```

### 3. 将命令添加到命名空间

使用 `addCmd` 方法将命令添加到命名空间：

```typescript
ruleCoc.addCmd(cmdRc);
```

### 4. 指令逻辑实现要点

在实现指令逻辑时，需要注意以下几点：

1. **参数解析**: 从 `args` 参数中解析用户输入的指令参数。
2. **角色信息获取**: 使用 `cpi.getRoleAbilityList(roleId)` 获取角色信息。

> 这里专门说一下`mentions`参数，这是一个包含了所有被提及的用户的数组，包括发送者自己。其中发送者的信息会被放在数组的最后一个位置。
>
> **为什么这样设计？**
>
> 我们知道在骰娘中有时需要代骰这样一个功能，在传统骰系中，受制于QQ的功能限制，我们需要单独获取被@的用户，但是有时候，指令响应本身也可能需要@骰娘，这就需要首先判断是代骰还是提及骰娘自己，然后单独进行处理。
> 这一逻辑在QQ上是很合理的，但是在团剧共创中，骰娘本身是不会被@的，所以我们完全可以用一种更加优雅的方式来实现代骰的处理。即把所有被提及的用户信息按照优先级从高到低排列（具体顺序为信息原文中被@的用户顺序和发送消息的用户自身），在处理时只处理需要的前n个用户信息即可。这样就不需要单独处代骰的情况了。

3. **消息发送**: 使用 `cpi.sendMsg(prop, msg)` 发送消息到聊天框，或使用 `cpi.sendToast(msg)` 发送Toast消息。
4. **角色信息更新**: 使用 `cpi.setRoleAbilityList(roleId, abilityList)` 更新角色信息。
5. **错误处理**: 适当处理可能出现的错误情况，并向用户反馈。用信息或者弹窗提示均可。

## 最佳实践

1. **保持指令简洁**: 每个指令应该只负责一个特定的功能。
2. **良好的错误处理**: 适当处理各种可能的错误情况，并向用户提供清晰的错误信息。
3. **合理的参数解析**: 设计清晰的参数解析逻辑，使用户能够方便地使用指令。
4. **充分的文档**: 为每个指令提供清晰的描述、使用示例和用法说明。
5. **代码复用**: 将通用的逻辑封装成函数或工具方法，以便在多个指令中复用。

## 参考资料

- [SealDice编写手册](https://docs.sealdice.com/advanced/js_example.html)
- [OlivaOS编写手册](https://doc.olivos.wiki/DevPlugin/API/)
