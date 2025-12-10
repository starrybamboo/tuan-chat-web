# 骰娘指令编写指北

## 架构概述

骰娘模块采用**分层架构**设计，将命令解析、规则管理、执行逻辑和数据持久化分离，提供了灵活且可扩展的TRPG骰子系统。

### 架构层次

```
┌─────────────────────────────────────────────────┐
│              聊天室界面层                         │
│            (Chat Room UI Layer)                 │
└─────────────────┬───────────────────────────────┘
                  │ ExecutorProp
                  ↓
┌─────────────────────────────────────────────────┐
│             命令预处理层                          │
│         (cmdPre.tsx - Command Parser)           │
│  • 解析指令格式 (.r, .rc, .st 等)                 │
│  • 提取参数和@的角色                              │
│  • 管理消息队列                                   │
│  • 构建CPI接口                                   │
└─────────────────┬───────────────────────────────┘
                  │ CPI + args
                  ↓
┌─────────────────────────────────────────────────┐
│             规则命名空间层                         │
│      (RuleNameSpace - cmd.ts)                    │
│  • executorPublic (通用指令)                      │
│  • executorCoc (COC7规则)                        │
│  • executorDnd (DnD规则)                         │
│  • executorFu (最终物语规则)                      │
└─────────────────┬───────────────────────────────┘
                  │ 路由到具体命令
                  ↓
┌─────────────────────────────────────────────────┐
│           命令执行器层                            │
│     (CommandExecutor - 具体实现)                 │
│  • cmdR  - 掷骰 (.r)                             │
│  • cmdSt - 属性设置 (.st)                        │
│  • cmdRc - 技能检定 (.rc)                        │
│  • cmdSc - 理智检定 (.sc)                        │
│  • ... 更多规则特定指令                            │
└─────────────────┬───────────────────────────────┘
                  │ 调用工具函数
                  ↓
┌─────────────────────────────────────────────────┐
│              工具函数层                           │
│         (Utils & Core Logic)                    │
│  • dice.ts - 骰子表达式解析器                      │
│  • utils.ts - 工具函数集                          │
│  • aliasMap.ts - 属性别名映射                     │
└─────────────────┬───────────────────────────────┘
                  │ 通过CPI回调
                  ↓
┌─────────────────────────────────────────────────┐
│            数据持久化层                           │
│         (Backend API & Database)                │
│  • 角色能力数据 (RoleAbility)                     │
│  • 消息发送 (ChatMessage)                        │
│  • 规则配置 (Rule Config)                        │
└─────────────────────────────────────────────────┘
```

### 设计优势

#### 1. **高度模块化**

- **规则独立**: 每个TRPG规则系统（COC、DnD、FU等）独立封装为RuleNameSpace，互不干扰
- **命令解耦**: CommandExecutor将命令元信息与执行逻辑分离，便于管理和测试
- **可插拔架构**: 新增规则系统只需创建新的RuleNameSpace并注册，无需修改核心代码

#### 2. **灵活的别名系统**

- 支持属性别名映射（如"力量"↔"str"，"理智"↔"san值"）
- 因变量自动计算（如COC中的最大生命值 `hpm = (体型+体质)/10`）
- 多语言友好，用户可使用中英文混合输入

#### 3. **统一的接口抽象**

- CPI（Command Processor Interface）提供标准化的数据访问和消息发送接口
- 执行器无需关心底层实现细节（React hooks、后端API等）
- 便于单元测试和模拟环境

#### 4. **强大的表达式引擎**

- 支持复杂骰子表达式（`3d6+2d4*5`）
- 智能括号处理和运算符优先级
- 全角符号自动转换（`。` → `.`，`（）` → `()`）

#### 5. **多角色协同**

- 支持@提及机制，可为他人投骰或修改属性
- 优先级处理（mentioned数组顺序）
- 私聊暗骰功能（`-h`参数）

## 核心组件

### 1. RuleNameSpace（规则命名空间）

规则命名空间是管理一组相关命令的容器，代表一个完整的TRPG规则系统。

```typescript
class RuleNameSpace {
  id: number;                    // 规则ID（对应后端数据库）
  name: string;                  // 规则名称（如"coc7"）
  alias: string[];               // 规则别名（如["coc", "coc7th"]）
  description: string;           // 规则描述
  cmdMap: Map<string, CommandExecutor>;  // 命令映射表
  aliasMap: Map<string, string>; // 属性别名映射
  dependentValueMap: Map<...>;   // 因变量计算方程
}
```

**关键方法:**

- `addCmd(cmd)`: 添加命令到命名空间
- `execute(name, args, mentioned, cpi)`: 执行指定命令
- `getCmd(name)`: 获取命令信息
- `getDependentValue(key, ability)`: 计算因变量值

**实例:**

```typescript
// COC7规则命名空间
const executorCoc = new RuleNameSpace(
  1,                              // 规则ID
  "coc7",                        // 规则名
  ["coc", "coc7th"],            // 别名
  "COC7版规则的指令集",
  new Map(Object.entries(ABILITY_MAP)),        // 属性别名
  new Map(Object.entries(DEPENDENT_VALUE_MAP)) // 因变量
);
```

### 2. CommandExecutor（命令执行器）

命令执行器封装单个命令的信息和执行逻辑。

```typescript
class CommandExecutor {
  cmdInfo: CommandInfo;  // 命令元信息
  solve: (args, mentioned, cpi) => Promise<boolean>;  // 执行函数
  
  constructor(
    name: string,        // 命令名（如"rc"）
    alias: string[],     // 别名（如["ra"]）
    description: string, // 功能描述
    examples: string[], // 使用示例
    usage: string,      // 用法说明
    solve: Function     // 执行函数
  )
}
```

**示例:**

```typescript
const cmdRc = new CommandExecutor(
  "rc",                          // 命令名
  ["ra"],                        // 别名
  "进行技能检定",                 // 描述
  [".rc 侦查 50", ".rc 力量"],   // 示例
  "rc [技能名] [技能值]?",       // 用法
  async (args, mentioned, cpi) => {
    // 执行逻辑
    return true;
  }
);
```

### 3. Dice Parser（骰子表达式解析器）

骰子表达式解析器负责将字符串表达式转换为实际的掷骰结果。

**核心功能:**

- 词法分析（Tokenize）
- 语法解析（Parse）
- 表达式求值（Evaluate）

**支持的表达式:**

```typescript
"3d6"           // 投3个6面骰
"d%"            // 投百分骰（1d100）
"2d6+1d4"       // 复合表达式
"3d6*5"         // 带乘法
"(2d6+3)*2"     // 带括号
"2d6+力量"       // 混合属性（需配合utils.ts）
```

**返回结果:**

```typescript
{
  result: 15,                    // 最终结果
  expanded: "3d6=[2,5,8]=15",   // 展开过程
  detail: "...",                // 详细信息
  isDice: true                  // 是否包含骰子
}
```

## CPI接口

**CPI（Command Processor Interface）** 是连接命令执行器与外部系统的关键接口，提供了数据访问、消息发送、角色能力管理等核心功能。

### 接口定义

```typescript
interface CPI {
  // 消息发送
  replyMessage: (msg: string) => void;                  // 发送公开消息
  sendToast: (msg: string) => void;                     // 发送Toast提示
  
  // 骰娘文案系统
  setCopywritingKey: (key: string | null) => void;      // 设置文案关键词
  
  // 角色数据访问
  getRoleAbilityList: (roleId: number) => RoleAbility;  // 获取角色能力
  setRoleAbilityList: (roleId: number, ability: RoleAbility) => void;  // 设置角色能力
  
  // 空间数据访问
  getSpaceInfo: () => Space | null | undefined;         // 获取空间信息
  getSpaceData: (key: string) => string | undefined;    // 获取空间 dicerData 字段
  setSpaceData: (key: string, value: string | null) => void;  // 设置/删除空间 dicerData 字段
}
```

**版本变更：**

- 原版本：4个方法（replyMessage、sendToast、getRoleAbilityList、setRoleAbilityList）
- v2：5个方法（新增 setCopywritingKey）
- 当前版本：8个方法（新增 getSpaceInfo、getSpaceData、setSpaceData）

### CPI的作用

#### 1. **抽象层隔离**

CPI将命令执行逻辑与具体实现（React hooks、后端API、状态管理）完全隔离：

```typescript
// ❌ 错误做法：命令直接依赖React hooks
const cmdSt = new CommandExecutor(..., async (args) => {
  const mutation = useMutation();  // 违反React规则！
  await mutation.mutate(...);
});

// ✅ 正确做法：通过CPI访问
const cmdSt = new CommandExecutor(..., async (args, mentioned, cpi) => {
  const ability = cpi.getRoleAbilityList(roleId);
  ability.basic.strength = 70;
  cpi.setRoleAbilityList(roleId, ability);  // CPI负责持久化
});
```

#### 2. **统一的数据访问接口**

无论数据来自本地缓存、React Query缓存还是后端API，命令执行器都通过统一的CPI接口访问：

```typescript
// 在cmdPre.tsx中构建CPI实现
const getRoleAbilityList = (roleId: number): RoleAbility => {
  // 从本地Map缓存获取
  if (mentionedRoles.has(roleId)) {
    return mentionedRoles.get(roleId)!;
  }
  // 返回默认值
  return { roleId, ruleId };
};

const setRoleAbilityList = (roleId: number, ability: RoleAbility) => {
  // 更新本地缓存
  mentionedRoles.set(roleId, ability);
  // 实际的后端同步在execute函数结束后批量进行
};
```

#### 3. **消息队列管理**

CPI的消息发送方法实际上是向队列中添加消息，由cmdPre统一管理发送顺序：

```typescript
// 命令执行器调用
cpi.replyMessage("掷骰结果：3d6=15");
cpi.replyMessage("大成功！");

// cmdPre.tsx中的实现
const replyMessage = (message: string) => {
  dicerMessageQueue.push(message);  // 加入队列
};

// 执行完毕后批量发送
for (const message of dicerMessageQueue) {
  await sendMessageMutation.mutateAsync({
    content: message,
    roleId: dicerRoleId,
    replayMessageId: originalMessageId
  });
}
```

#### 4. **支持事务性操作**

通过CPI，可以确保多个操作的原子性：

```typescript
// 角色能力修改在内存中进行
cpi.setRoleAbilityList(roleId, ability1);
cpi.setRoleAbilityList(roleId, ability2);

// 命令执行完成后，cmdPre统一提交到后端
for (const [id, ability] of mentionedRoles) {
  if (ability.abilityId) {
    updateAbilityMutation.mutate(ability);  // 更新
  } else {
    setAbilityMutation.mutate(ability);     // 创建
  }
}
```

#### 5. **易于测试**

可以为测试环境提供Mock实现：

```typescript
// 测试用CPI实现
const mockCPI: CPI = {
  replyMessage: (msg) => console.log(msg),
  sendToast: (msg) => console.log(msg),
  getRoleAbilityList: (id) => mockAbilityData[id],
  setRoleAbilityList: (id, ability) => { mockAbilityData[id] = ability; }
};

// 测试命令执行
await cmdRc.solve(["侦查", "50"], [mockRole], mockCPI);
```

### CPI数据流与消息发送流程

#### 基础数据流

```
用户输入指令
    ↓
cmdPre解析并构建CPI
    ↓
调用RuleNameSpace.execute(cmd, args, mentioned, CPI)
    ↓
路由到CommandExecutor.solve(args, mentioned, CPI)
    ↓
执行器通过CPI读写数据
    ↓                     ↓
CPI.getRoleAbilityList   CPI.replyMessage
    ↓                     ↓
本地Map缓存            消息队列（dicerMessageQueue）
    ↓                     ↓
CPI.setRoleAbilityList   批量发送（带文案和标签处理）
    ↓                     ↓
更新本地缓存          显示在聊天室
    ↓
命令执行完成，cmdPre批量提交到后端
    ↓
updateAbilityMutation / setAbilityMutation
    ↓
后端数据库持久化
```

#### 消息发送流程（增强版）

系统使用**双队列架构**分别管理公开消息和私聊消息，支持**文案系统**和**标签系统**。

**1. 双队列架构**

```typescript
// 公开消息队列（所有人可见）
const dicerMessageQueue: string[] = [];

// 私聊消息队列（1v1可见）
const dicePrivateMessageQueue: string[] = [];
```

**队列特点:**

- 独立管理，互不干扰
- 批量发送，保证顺序
- 支持文案追加
- 支持标签解析

**2. 文案系统（Copywriting System）**

**文案格式:** `关键词::权重::文本内容`

```typescript
// 示例文案库（存储在骰娘角色的 extra.copywriting 字段）
[
  "成功::3::干得漂亮！",        // 权重3
  "成功::2::不错的结果！",      // 权重2
  "成功::1::成功了。",          // 权重1
  "失败::5::运气不太好呢...",   // 权重5
  "大成功::10::太棒了！！！"    // 权重10
]
```

**文案选择算法:**

```typescript
// 1. 通过 setCopywritingKey 设置关键词
cpi.setCopywritingKey("成功");

// 2. 命令执行完成后，从文案库中筛选
const matchedCopywriting = dicerRole.extra?.copywriting?.filter(
  item => item.startsWith("成功::")
);
// 结果: ["成功::3::干得漂亮！", "成功::2::不错的结果！", "成功::1::成功了。"]

// 3. 构建加权候选池
const weightedTexts: string[] = [];
for (const item of matchedCopywriting) {
  const match = item.match(/^::(\d+)::/);
  if (match) {
    const weight = Number(match[1]);  // 提取权重
    const text = item.slice(match[0].length);  // 提取文本
    for (let i = 0; i < weight; i++) {
      weightedTexts.push(text);  // 根据权重放入池中多次
    }
  }
}
// 结果: ["干得漂亮！", "干得漂亮！", "干得漂亮！",  ← 权重3
//       "不错的结果！", "不错的结果！",          ← 权重2
//       "成功了。"]                             ← 权重1

// 4. 随机选择
const randomIdx = Math.floor(Math.random() * weightedTexts.length);
const copywritingSuffix = `\n${weightedTexts[randomIdx]}`;
```

**3. 标签系统（Tag System）**

标签用于控制骰娘角色的头像选择，格式为 `#标签名#`。

**标签语法:**

- `#默认#` - 指定使用"默认"标签的头像
- `#严肃#` - 指定使用"严肃"标签的头像
- `#高兴#` - 指定使用"高兴"标签的头像

**标签解析规则:**

1. 提取消息中的所有标签（包括文案中的标签）
2. 取**最后一个**标签作为有效标签
3. 从骰娘角色的头像列表中匹配 `avatarTitle.label` 等于该标签的头像
4. 如果有多个匹配，随机选择一个
5. 如果没有匹配，回退到"默认"标签头像，再回退到第一个头像

**标签解析代码:**

```typescript
// 1. 从所有消息和文案中提取标签
const allMessages = dicerMessageQueue.join(" ") + copywritingSuffix;
const tagMatches = allMessages.match(/#([^#]+)#/g);
// 示例: ["#高兴#", "#默认#", "#严肃#"]

// 2. 取最后一个标签
let lastTag: string | null = null;
if (tagMatches && tagMatches.length > 0) {
  const lastMatch = tagMatches[tagMatches.length - 1];
  lastTag = lastMatch.replace(/#/g, "").trim();  // "严肃"
}

// 3. 匹配头像
let matchedAvatar: RoleAvatar | null = null;
if (lastTag) {
  const matches = avatars.filter(a => 
    (a.avatarTitle?.label || "") === lastTag
  );
  
  if (matches.length > 1) {
    // 多个匹配，随机选择
    const idx = Math.floor(Math.random() * matches.length);
    matchedAvatar = matches[idx];
  } else {
    matchedAvatar = matches[0] || null;
  }
}

// 4. 回退策略
const fallbackDefaultLabelAvatar = avatars.find(a => 
  (a.avatarTitle?.label || "") === "默认"
);
const chosenAvatarId = matchedAvatar?.avatarId
  ?? fallbackDefaultLabelAvatar?.avatarId
  ?? avatars[0]?.avatarId
  ?? 0;
```

**标签使用示例:**

```typescript
// 示例1: 检定成功显示高兴表情
cpi.replyMessage("检定成功！#高兴#");

// 示例2: 检定失败显示难过表情
cpi.replyMessage("检定失败...#难过#");

// 示例3: 严肃的系统提示
cpi.replyMessage("#严肃# 当前HP已低于50%，请注意安全");

// 示例4: 多条消息，最后一个标签生效
cpi.replyMessage("投掷骰子中...#默认#");
cpi.replyMessage("结果出来了！#高兴#");  // 最终使用"高兴"头像

// 示例5: 文案也可以包含标签
// 文案库: "成功::5::干得漂亮！#高兴#"
cpi.setCopywritingKey("成功");
cpi.replyMessage("侦查检定成功");
// 最终消息: "侦查检定成功\n干得漂亮！#高兴#"
// 使用"高兴"头像
```

**4. 消息清理与发送**

在发送前，系统会自动清理消息中的标签：

```typescript
// 清理标签
const cleanMessage = message.replace(/#[^#]+#/g, "").trim();
const cleanCopywriting = copywritingSuffix.replace(/#[^#]+#/g, "").trim();

// 拼接最终消息
dicerMessageRequest.content = cleanMessage + 
  (cleanCopywriting ? `\n${cleanCopywriting}` : "");

// 发送到后端
await sendMessageMutation.mutateAsync(dicerMessageRequest);
```

**完整发送流程:**

```
命令执行中
    ↓
cpi.replyMessage("检定成功！#高兴#")
cpi.setCopywritingKey("成功")
    ↓
消息入队: dicerMessageQueue.push("检定成功！#高兴#")
    ↓
命令执行完成
    ↓
从文案库匹配关键词 "成功"
    ↓
构建加权候选池并随机选择
    ↓
copywritingSuffix = "\n干得漂亮！#高兴#"
    ↓
提取所有标签: ["#高兴#", "#高兴#"]
    ↓
取最后一个标签: "高兴"
    ↓
匹配头像: 找到label="高兴"的头像
    ↓
清理标签: "检定成功！" + "\n干得漂亮！"
    ↓
发送消息:
{
  content: "检定成功！\n干得漂亮！",
  avatarId: 5,  // "高兴"头像的ID
  roleId: dicerRoleId
}
    ↓
显示在聊天室（使用"高兴"头像）
```

**5. 公开消息与私聊消息的处理差异**

```typescript
// 公开消息处理
if (dicerMessageQueue.length > 0) {
  // 1. 获取文案
  const copywritingSuffix = getCopywriting(copywritingKey, dicerRole);
  
  // 2. 提取标签（从公开消息 + 文案）
  const allMessages = dicerMessageQueue.join(" ") + copywritingSuffix;
  const lastTag = extractLastTag(allMessages);
  
  // 3. 选择头像
  const avatarId = selectAvatar(lastTag, avatars);
  
  // 4. 清理并发送每条消息
  for (const message of dicerMessageQueue) {
    const cleanMessage = removeAllTags(message);
    const cleanCopywriting = removeAllTags(copywritingSuffix);
    await sendMessage({
      content: cleanMessage + (cleanCopywriting ? `\n${cleanCopywriting}` : ""),
      avatarId,
      roleId: dicerRoleId,
      messageType: 0  // 公开消息
    });
  }
}

// 私聊消息处理（类似流程）
if (dicePrivateMessageQueue.length > 0) {
  // 1-4步与公开消息相同
  // ...
  
  // 5. 发送私聊消息
  await sendMessage({
    content: cleanMessage + (cleanCopywriting ? `\n${cleanCopywriting}` : ""),
    avatarId,
    roleId: dicerRoleId,
    messageType: 1,  // 私聊消息
    replayMessageId: originalMessageId  // 指定接收者
  });
}
```

**关键差异:**

- 公开消息: `messageType: 0`, 无 `replayMessageId`
- 私聊消息: `messageType: 1`, 带 `replayMessageId`（回复原消息，形成1v1私聊）
- 文案和标签处理完全相同

**6. 系统特性总结**

| 特性               | 说明                     | 使用方式                                   |
| ------------------ | ------------------------ | ------------------------------------------ |
| **消息队列** | 公开消息统一管理         | `replyMessage` |
| **文案系统** | 加权随机选择风味文本     | `setCopywritingKey(key)` + 文案库        |
| **标签系统** | 动态控制头像显示         | 消息中嵌入 `#标签#`                      |
| **批量发送** | 保证消息顺序             | 命令执行完成后统一发送                     |
| **自动清理** | 发送前移除标签标记       | 自动处理                                   |
| **回退机制** | 标签匹配失败时的降级策略 | 自动处理                                   |

### CPI方法详解

#### replyMessage - 发送公开消息

向聊天室发送所有人可见的消息。

```typescript
replyMessage(msg: string): void
```

**使用场景:**

- 公开检定结果
- 属性设置确认
- 系统提示消息

**实现原理:**
消息不会立即发送，而是加入队列，命令执行完成后批量发送。

**使用示例:**

```typescript
// 基础用法
cpi.replyMessage("掷骰结果：3d6=15");

// 多条消息（按顺序发送）
cpi.replyMessage("开始进行力量检定...");
cpi.replyMessage(`检定结果：D100=45/70 成功`);
cpi.replyMessage("检定完成！");

// 多行消息（使用模板字符串）
cpi.replyMessage(
  `力量检定结果：\n` +
  `骰子：D100=45\n` +
  `目标值：70\n` +
  `结果：成功`
);

// 实际应用：COC技能检定
const cmdRc = new CommandExecutor("rc", [], "技能检定", [], "",
  async (args, mentioned, cpi) => {
    const role = mentioned[0];
    const skillName = args[0];
    const roll = Math.floor(Math.random() * 100) + 1;
    const target = 50;
  
    let result = `${role.roleName}进行${skillName}检定：`;
    result += `D100=${roll}/${target} `;
    result += roll <= target ? "成功" : "失败";
  
    cpi.replyMessage(result);
    return true;
  }
);
```

#### sendToast - 发送Toast提示

向命令发送者发送轻量级提示消息，不记录到消息历史。

```typescript
sendToast(msg: string): void
```

**使用场景:**

- 错误提示
- 参数验证失败
- 操作确认
- 属性查询结果

**特点:**

- 不会在聊天室显示
- 不会被记录到消息历史
- 适合临时提示和错误反馈

**使用示例:**

```typescript
// 错误提示
if (!skillName) {
  cpi.sendToast("错误：缺少技能名称");
  return false;
}

// 参数验证
const skillValue = Number(args[1]);
if (isNaN(skillValue) || skillValue < 0 || skillValue > 100) {
  cpi.sendToast("错误：技能值必须在0-100之间");
  return false;
}

// 属性查询（不污染聊天记录）
const cmdShowStats = new CommandExecutor("show", [], "查询属性", [], "",
  async (args, mentioned, cpi) => {
    const role = mentioned[0];
    const ability = cpi.getRoleAbilityList(role.roleId);
  
    const stats = [
      `力量: ${ability.basic?.力量 ?? "未设置"}`,
      `敏捷: ${ability.basic?.敏捷 ?? "未设置"}`,
      `体质: ${ability.basic?.体质 ?? "未设置"}`
    ].join("\n");
  
    cpi.sendToast(`${role.roleName}的属性：\n${stats}`);
    return true;
  }
);

// 操作确认反馈
cpi.sendToast("属性设置成功！");
cpi.sendToast("暗骰已投掷，结果已私聊发送");
```

**三种消息方式对比:**

| 方法                    | 可见范围      | 记录历史 | 使用场景                     |
| ----------------------- | ------------- | -------- | ---------------------------- |
| `replyMessage`        | 所有人        | ✅       | 公开检定、属性设置、系统提示 |
| `sendToast`           | 仅发送者      | ❌       | 错误提示、参数验证、临时反馈 |

#### setCopywritingKey - 设置骰娘文案关键词

设置当前命令使用的文案关键词，用于从骰娘角色的文案库中随机选择个性化文案。

```typescript
setCopywritingKey(key: string | null): void
```

**参数:**

- `key`: 文案关键词（如"成功"、"失败"、"大成功"等），传入 `null` 清除关键词

**文案系统原理:**

1. 骰娘角色在 `extra.copywriting` 中存储文案库
2. 文案格式：`关键词::权重::文本内容`
3. 支持加权随机选择（权重越高，出现概率越大）
4. 文案会自动追加到消息末尾

**文案格式示例:**

```typescript
// 骰娘角色的 extra.copywriting 字段
{
  "copywriting": [
    "成功::3::干得漂亮！",           // 权重3
    "成功::2::不错的结果！",         // 权重2
    "成功::1::成功了。",             // 权重1
    "失败::5::运气不太好呢...",      // 权重5
    "失败::3::下次会更好的。",       // 权重3
    "大成功::10::太棒了！！！",      // 权重10
    "大失败::8::这...真是糟糕。"     // 权重8
  ]
}
```

**权重规则:**

- `::N::` 表示权重为N
- 无权重标记默认为权重1
- 权重N意味着该文案被放入候选池N次
- 最终从候选池中随机选择一条

**使用示例:**

```typescript
// 基础用法
const cmdRc = new CommandExecutor("rc", [], "技能检定", [], "",
  async (args, mentioned, cpi) => {
    const skillName = args[0];
    const target = Number(args[1]) || 50;
    const roll = Math.floor(Math.random() * 100) + 1;
  
    let resultKey = "失败";
    if (roll === 1) resultKey = "大成功";
    else if (roll === 100) resultKey = "大失败";
    else if (roll <= target) resultKey = "成功";
  
    // 设置文案关键词
    cpi.setCopywritingKey(resultKey);
  
    // 发送检定结果
    cpi.replyMessage(`${skillName}检定：D100=${roll}/${target} ${resultKey}`);
    // 实际输出示例：
    // "侦查检定：D100=25/50 成功
    //  干得漂亮！"  ← 从文案库中随机选择的"成功"文案
  
    return true;
  }
);

// 高级用法：根据成功程度选择文案
const cmdCocRc = new CommandExecutor("rc", [], "COC检定", [], "",
  async (args, mentioned, cpi) => {
    const target = Number(args[1]) || 50;
    const roll = Math.floor(Math.random() * 100) + 1;
  
    let level = "失败";
    let resultKey = "失败";
  
    if (roll === 1) {
      level = "大成功";
      resultKey = "大成功";
    } else if (roll === 100) {
      level = "大失败";
      resultKey = "大失败";
    } else if (roll <= target / 5) {
      level = "极难成功";
      resultKey = "成功_极难";  // 可以使用更细分的关键词
    } else if (roll <= target / 2) {
      level = "困难成功";
      resultKey = "成功_困难";
    } else if (roll <= target) {
      level = "成功";
      resultKey = "成功";
    }
  
    cpi.setCopywritingKey(resultKey);
    cpi.replyMessage(`检定：D100=${roll}/${target} ${level}`);
  
    return true;
  }
);

// 多条消息共享文案
const cmdMultiRoll = new CommandExecutor("multi", [], "多次检定", [], "",
  async (args, mentioned, cpi) => {
    const count = Number(args[0]) || 3;
    let successCount = 0;
  
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * 100) + 1;
      if (roll <= 50) successCount++;
      cpi.replyMessage(`第${i + 1}次：D100=${roll}`);
    }
  
    // 根据成功次数设置文案
    if (successCount === count) {
      cpi.setCopywritingKey("全部成功");
    } else if (successCount === 0) {
      cpi.setCopywritingKey("全部失败");
    } else {
      cpi.setCopywritingKey("部分成功");
    }
  
    cpi.replyMessage(`成功 ${successCount}/${count} 次`);
  
    return true;
  }
);

// 清除文案（不使用文案系统）
const cmdPlainRoll = new CommandExecutor("plain", [], "纯掷骰", [], "",
  async (args, mentioned, cpi) => {
    cpi.setCopywritingKey(null);  // 清除文案关键词
    const roll = Math.floor(Math.random() * 6) + 1;
    cpi.replyMessage(`D6=${roll}`);  // 不会追加文案
    return true;
  }
);
```

**文案系统工作流程:**

```
1. 命令执行器调用 cpi.setCopywritingKey("成功")
      ↓
2. cmdPre 记录 copywritingKey = "成功"
      ↓
3. 命令执行完成，准备发送消息
      ↓
4. cmdPre 从骰娘角色的 extra.copywriting 的"成功"字段中筛选:
   ["::3::干得漂亮！", "::2::不错的结果！", "::1::成功了。"]
      ↓
5. 构建加权候选池:
   ["干得漂亮！", "干得漂亮！", "干得漂亮！",  ← 权重3，放3次
    "不错的结果！", "不错的结果！",          ← 权重2，放2次
    "成功了。"]                              ← 权重1，放1次
      ↓
6. 随机选择一条: "干得漂亮！"
      ↓
7. 追加到消息末尾:
   原消息: "侦查检定：D100=25/50 成功"
   最终消息: "侦查检定：D100=25/50 成功\n干得漂亮！"
```

**注意事项:**

- ⚠️ 如果骰娘角色没有 `extra.copywriting` 字段，文案系统不生效
- ⚠️ 如果没有匹配关键词的文案，不追加任何内容
- ⚠️ 文案会追加到**所有消息**的末尾（公开消息和私聊消息）
- ⚠️ 文案关键词作用于当前命令的全部消息
- ⚠️ `setCopywritingKey(null)` 可以清除文案关键词

#### getRoleAbilityList - 获取角色数据

从缓存中获取指定角色的能力数据。

```typescript
getRoleAbilityList(roleId: number): RoleAbility
```

**参数:**

- `roleId`: 角色ID

**返回值:**

- 角色能力对象，如果不存在返回空对象 `{ roleId, ruleId }`

**数据结构:**

```typescript
interface RoleAbility {
  abilityId?: number;              // 能力组ID
  roleId?: number;                 // 角色ID
  ruleId?: number;                 // 规则ID
  act?: Record<string, string>;    // 行动相关
  basic?: Record<string, string>;  // 基础属性（力量、敏捷等）
  ability?: Record<string, string>; // 特殊能力
  skill?: Record<string, string>;  // 技能列表
  record?: Record<string, string>; // 记录信息
  extra?: Record<string, string>;  // 扩展字段
}
```

**使用示例:**

```typescript
// 基础用法
const role = mentioned[0];
const ability = cpi.getRoleAbilityList(role.roleId);

// 读取属性（推荐使用UTILS）
const strength = Number(ability.basic?.力量 ?? "0");
const dex = Number(ability.basic?.敏捷 ?? "0");

// 检查属性是否存在
if (!ability.basic || Object.keys(ability.basic).length === 0) {
  cpi.sendToast("当前角色尚未设置属性");
  return false;
}

// 多角色操作
const cmdCompare = new CommandExecutor("compare", [], "比较属性", [], "",
  async (args, mentioned, cpi) => {
    if (mentioned.length < 2) {
      cpi.sendToast("需要@至少两个角色");
      return false;
    }
  
    const results: string[] = [];
    for (const role of mentioned.slice(0, -1)) {  // 排除发送者
      const ability = cpi.getRoleAbilityList(role.roleId);
      const str = Number(ability.basic?.力量 ?? "0");
      results.push(`${role.roleName}的力量：${str}`);
    }
  
    cpi.replyMessage(`力量对比：\n${results.join("\n")}`);
    return true;
  }
);

// 缓存预加载（在cmdPre中自动完成）
// cmdPre会预先加载所有mentioned角色的数据
const mentionedRoles = new Map<number, RoleAbility>();
for (const role of mentioned) {
  const ability = await getRoleAbility(role.roleId);
  mentionedRoles.set(role.roleId, ability);
}
```

#### setRoleAbilityList - 更新角色数据

更新指定角色的能力数据到缓存。

```typescript
setRoleAbilityList(roleId: number, ability: RoleAbility): void
```

**参数:**

- `roleId`: 角色ID
- `ability`: 更新后的角色能力对象

**重要提示:**

- ⚠️ 此方法仅更新**内存缓存**
- 💾 实际持久化在命令执行完成后由 cmdPre 批量提交
- 🔄 支持事务性：多次修改同一角色数据会合并

**使用示例:**

```typescript
// 基础用法：修改属性
const role = mentioned[0];
const ability = cpi.getRoleAbilityList(role.roleId);

// 修改属性（推荐使用UTILS）
if (!ability.basic) ability.basic = {};
ability.basic.力量 = "75";
ability.basic.敏捷 = "80";

// 更新到缓存
cpi.setRoleAbilityList(role.roleId, ability);

// 完整示例：属性设置命令
const cmdSet = new CommandExecutor("set", [], "设置属性", [], "",
  async (args, mentioned, cpi) => {
    const role = mentioned[0];
    const ability = cpi.getRoleAbilityList(role.roleId);
  
    // 解析参数：.set 力量70 敏捷80
    const updates: string[] = [];
    for (const arg of args) {
      const match = arg.match(/^([^\d]+)(\d+)$/);
      if (match) {
        const [, key, value] = match;
    
        if (!ability.basic) ability.basic = {};
        const oldValue = ability.basic[key] || "0";
        ability.basic[key] = value;
    
        updates.push(`${key}: ${oldValue}→${value}`);
      }
    }
  
    // 更新缓存
    cpi.setRoleAbilityList(role.roleId, ability);
  
    // 反馈结果
    if (updates.length > 0) {
      cpi.replyMessage(`属性更新：\n${updates.join("\n")}`);
    } else {
      cpi.sendToast("未找到有效的属性更新");
    }
  
    return true;
  }
);

// 多次修改会自动合并
const ability = cpi.getRoleAbilityList(roleId);

ability.basic.力量 = "70";
cpi.setRoleAbilityList(roleId, ability);  // 第1次更新

ability.basic.敏捷 = "80";
cpi.setRoleAbilityList(roleId, ability);  // 第2次更新

ability.skill.侦查 = "50";
cpi.setRoleAbilityList(roleId, ability);  // 第3次更新

// 命令结束后，cmdPre会将最终状态提交到后端（只发送一次请求）
```

### CPI最佳实践

#### 1. 消息发送策略

**根据场景选择正确的发送方式：**

| 场景         | 方法                    | 原因                         |
| ------------ | ----------------------- | ---------------------------- |
| 错误提示     | `sendToast`           | 不污染聊天记录，仅发送者可见 |
| 参数验证失败 | `sendToast`           | 即时反馈，不影响其他人       |
| 公开检定结果 | `replyMessage`        | 所有人需要看到               |
| 暗骰结果     | `replyMessage`        | 公开提示，所有人都能看到             |
| 操作确认     | `sendToast`           | 轻量级反馈                   |
| 属性查询     | `sendToast`           | 个人信息，不公开             |

```typescript
// ✅ 推荐：根据场景选择发送方式
const cmdCheck = new CommandExecutor("check", [], "检定", [], "",
  async (args, mentioned, cpi) => {
    // 错误提示 → 用 sendToast
    if (!args[0]) {
      cpi.sendToast("错误：缺少参数");
      return false;
    }
  
    // 执行检定
    const roll = Math.floor(Math.random() * 100) + 1;
    const result = `检定结果：D100=${roll}`;
  
    // 公开发送结果
    cpi.replyMessage(result);
  
    return true;
  }
);

// ❌ 避免：错误提示发送到公开频道
if (!args[0]) {
  cpi.replyMessage("错误：缺少参数");  // 会污染聊天记录
  return false;
}

// ❌ 避免：暗骰结果用sendToast
if (isHidden) {
  cpi.sendToast(result);  // 不会记录到历史，玩家事后无法查看
}
```

**三种消息方式快速对比：**

| 方法                    | 可见范围      | 记录历史 | 使用场景                     |
| ----------------------- | ------------- | -------- | ---------------------------- |
| `replyMessage`        | 所有人        | ✅       | 公开检定、属性设置、系统提示 |
| `sendToast`           | 仅发送者      | ❌       | 错误提示、参数验证、临时反馈 |

#### 2. 文案系统最佳实践

**何时使用文案系统：**

- ✅ 检定结果（成功/失败/大成功/大失败）
- ✅ 战斗行动（攻击/防御/闪避）
- ✅ 系统提示（升级/获得物品）
- ❌ 错误提示（保持简洁直接）
- ❌ 数值计算结果（不需要风味文本）

```typescript
// ✅ 推荐：检定类指令使用文案
const cmdRc = new CommandExecutor("rc", [], "技能检定", [], "",
  async (args, mentioned, cpi) => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const target = Number(args[1]) || 50;
  
    let resultKey = "失败";
    if (roll === 1) resultKey = "大成功";
    else if (roll === 100) resultKey = "大失败";
    else if (roll <= target / 5) resultKey = "极难成功";
    else if (roll <= target / 2) resultKey = "困难成功";
    else if (roll <= target) resultKey = "成功";
  
    // 设置文案关键词
    cpi.setCopywritingKey(resultKey);
  
    // 发送结果（文案会自动追加）
    cpi.replyMessage(`${args[0]}检定：D100=${roll}/${target} ${resultKey}`);
  
    return true;
  }
);

// ✅ 推荐：需要纯粹数值的指令清除文案
const cmdCalc = new CommandExecutor("calc", [], "计算", [], "",
  async (args, mentioned, cpi) => {
    cpi.setCopywritingKey(null);  // 清除文案
    const result = eval(args.join(" "));
    cpi.replyMessage(`计算结果：${result}`);
    return true;
  }
);

// ❌ 避免：错误提示使用文案
if (!args[0]) {
  cpi.setCopywritingKey("错误");  // 错误提示不需要风味文本
  cpi.sendToast("缺少参数");
  return false;
}
```

**文案库设计建议：**

```typescript
// ✅ 推荐：分级设计，权重合理
{
  "copywriting": [
    // 成功类 - 权重中等偏低（避免过于频繁）
    "成功::3::不错！",
    "成功::2::干得漂亮！",
    "成功::1::成功了。",
  
    // 大成功类 - 权重高（强化惊喜感）
    "大成功::10::太棒了！！！",
    "大成功::8::奇迹般的成功！",
    "大成功::5::完美！",
  
    // 失败类 - 权重适中（鼓励性质）
    "失败::5::下次会更好的。",
    "失败::3::运气不太好...",
    "失败::2::失败了。",
  
    // 大失败类 - 权重中等（避免打击感过强）
    "大失败::5::这真是...糟糕。",
    "大失败::3::哎呀...",
    "大失败::2::大失败！"
  ]
}

// ❌ 避免：权重失衡
{
  "copywriting": [
    "成功::100::不错！",  // 权重过高，缺乏变化
    "成功::1::干得漂亮！",
    "失败::1::失败了。"   // 失败文案权重过低
  ]
}
```

#### 3. 标签系统最佳实践

**标签放置位置：**

```typescript
// ✅ 推荐：标签放在消息末尾（清晰直观）
cpi.replyMessage("检定成功！#高兴#");
cpi.replyMessage("#难过# 检定失败...");  // 也可以放前面

// ✅ 推荐：多条消息，最后一条决定头像
cpi.replyMessage("投掷骰子中...#默认#");
cpi.replyMessage("结果是...#默认#");
cpi.replyMessage("成功！#高兴#");  // 最终使用"高兴"头像

// ⚠️ 注意：标签在发送前会被自动移除
// 最终显示: "成功！" （没有#高兴#标记）

// ✅ 推荐：文案库中也可以包含标签
{
  "copywriting": [
    "成功::5::干得漂亮！#高兴#",
    "失败::5::下次加油...#难过#",
    "大成功::10::太棒了！！！#兴奋#"
  ]
}
```

**标签命名规范：**

```typescript
// ✅ 推荐：使用清晰的情绪/状态标签
头像标签设计：
- "默认" - 中性表情
- "高兴" - 成功/愉悦
- "难过" - 失败/沮丧
- "严肃" - 重要提示
- "疑惑" - 不确定
- "生气" - 大失败/愤怒
- "害羞" - 特殊场景

// ❌ 避免：使用数字或不明确的标签
- "1", "2", "3" - 难以理解
- "a", "b", "c" - 无语义
- "tag1" - 不清晰
```

**回退策略理解：**

```typescript
// 标签匹配顺序：
// 1. 尝试匹配最后一个标签
// 2. 如果没有匹配，尝试"默认"标签
// 3. 如果仍没有，使用第一个头像

// ✅ 推荐：确保有"默认"标签头像
avatars = [
  { avatarId: 1, avatarTitle: { label: "默认" } },  // 回退头像
  { avatarId: 2, avatarTitle: { label: "高兴" } },
  { avatarId: 3, avatarTitle: { label: "难过" } }
];

// ❌ 避免：没有"默认"标签
avatars = [
  { avatarId: 1, avatarTitle: { label: "表情1" } },
  { avatarId: 2, avatarTitle: { label: "表情2" } }
];
// 如果使用了未定义的标签，会回退到第一个头像（可能不合适）
```

#### 4. 数据读写顺序

```typescript
// ✅ 推荐：先读取，修改，再写入
const ability = cpi.getRoleAbilityList(roleId);  // 1. 读取
ability.basic.力量 = "70";                        // 2. 修改
cpi.setRoleAbilityList(roleId, ability);         // 3. 写入

// ❌ 避免：直接修改不写回
const ability = cpi.getRoleAbilityList(roleId);
ability.basic.力量 = "70";
// 忘记调用 setRoleAbilityList，修改不会生效！

// ❌ 避免：重复读取
for (const role of mentioned) {
  const ability1 = cpi.getRoleAbilityList(role.roleId);
  const strength = ability1.basic.力量;
  
  const ability2 = cpi.getRoleAbilityList(role.roleId);  // 重复读取
  const dex = ability2.basic.敏捷;
}

// ✅ 推荐：读取一次，多次使用
for (const role of mentioned) {
  const ability = cpi.getRoleAbilityList(role.roleId);
  const strength = ability.basic.力量;
  const dex = ability.basic.敏捷;
}
```

#### 3. 错误处理

```typescript
// ✅ 推荐：使用 sendToast 返回错误
const cmdSet = new CommandExecutor("set", [], "设置", [], "",
  async (args, mentioned, cpi) => {
    // 参数验证
    if (args.length === 0) {
      cpi.sendToast("错误：缺少参数");
      return false;  // 返回 false 表示执行失败
    }
  
    // 数据验证
    const ability = cpi.getRoleAbilityList(mentioned[0].roleId);
    if (!ability) {
      cpi.sendToast("错误：无法获取角色数据");
      return false;
    }
  
    // 业务逻辑
    try {
      // ... 执行操作
      cpi.replyMessage("操作成功");
      return true;
    } catch (error) {
      cpi.sendToast(`错误：${error.message}`);
      return false;
    }
  }
);

// ❌ 避免：抛出未捕获的异常
const cmdBad = new CommandExecutor("bad", [], "", [], "",
  async (args, mentioned, cpi) => {
    throw new Error("这会导致整个命令系统崩溃！");
  }
);
```

#### 4. 多角色操作

```typescript
// ✅ 推荐：正确处理 mentioned 数组
const cmdGroupCheck = new CommandExecutor("group", [], "团队检定", [], "",
  async (args, mentioned, cpi) => {
    // mentioned 数组结构：[被@的角色1, 被@的角色2, ..., 命令发送者]
    const sender = mentioned[mentioned.length - 1];  // 最后一个是发送者
    const targets = mentioned.slice(0, -1);          // 其他是被@的角色
  
    if (targets.length === 0) {
      cpi.sendToast("请@至少一个角色");
      return false;
    }
  
    const results: string[] = [];
    for (const role of targets) {
      const ability = cpi.getRoleAbilityList(role.roleId);
      const roll = Math.floor(Math.random() * 100) + 1;
      const target = Number(ability.skill?.侦查 ?? "50");
      const success = roll <= target;
  
      results.push(`${role.roleName}: ${roll}/${target} ${success ? "成功" : "失败"}`);
    }
  
    cpi.replyMessage(`团队侦查检定：\n${results.join("\n")}`);
    return true;
  }
);

// 代骰功能：为第一个@的角色投骰
const cmdRollFor = new CommandExecutor("rf", [], "代骰", [], "",
  async (args, mentioned, cpi) => {
    const target = mentioned[0];  // 第一个是被@的角色（或发送者自己）
  
    const ability = cpi.getRoleAbilityList(target.roleId);
    // ... 为 target 投骰
  
    cpi.replyMessage(`为${target.roleName}投骰：...`);
    return true;
  }
);
```

#### 5. 测试友好的命令编写

```typescript
// ✅ 推荐：依赖CPI接口，易于测试
const cmdTestable = new CommandExecutor("test", [], "", [], "",
  async (args, mentioned, cpi) => {
    // 所有外部依赖都通过CPI
    const ability = cpi.getRoleAbilityList(mentioned[0].roleId);
    const result = "测试结果";
    cpi.replyMessage(result);
    return true;
  }
);

// 测试代码
const mockCPI: CPI = {
  replyMessage: vi.fn(),
  sendToast: vi.fn(),
  getRoleAbilityList: () => ({ roleId: 1, ruleId: 1, basic: { 力量: "70" } }),
  setRoleAbilityList: vi.fn(),
};

const mockRole: UserRole = { userId: 1, roleId: 1, roleName: "测试", type: 0 };
await cmdTestable.solve([], [mockRole], mockCPI);

expect(mockCPI.replyMessage).toHaveBeenCalledWith("测试结果");

// ❌ 避免：直接依赖外部模块
const cmdUntestable = new CommandExecutor("bad", [], "", [], "",
  async (args, mentioned, cpi) => {
    // 直接访问外部API，难以测试
    const data = await fetch("https://api.example.com/data");
    const ability = await tuanchat.abilityController.get(roleId);  // 硬编码依赖
  
    // 直接操作DOM，无法在Node环境测试
    document.getElementById("result").textContent = "结果";
  }
);
```

---

## UTILS 工具包使用指南

UTILS 是骰娘系统的核心工具包，提供了角色数据操作、表达式计算、参数检查等常用功能。配合CPI接口使用，可以极大简化命令开发。

### 快速导入

```typescript
import UTILS from "@/components/common/dicer/utils/utils";
```

### 为什么需要UTILS？

在命令开发中，我们经常需要：

- 读写角色属性（力量、敏捷、技能等）
- 计算复杂表达式（如最大生命值 = (体型+体质)/10）
- 处理属性别名（用户可能输入"str"或"力量"）
- 检查命令参数（如 `-h` 暗骰标志）

UTILS 封装了这些常用操作，让你专注于业务逻辑。

### API 参考

#### 1. 角色能力值操作

##### 1.1 getRoleAbilityValue - 获取角色属性

从角色能力对象中读取属性值，支持自动搜索和类型指定。

```typescript
UTILS.getRoleAbilityValue(
  role: RoleAbility,
  key: string,
  type?: "auto" | "skill" | "ability" | "basic"
): string | undefined
```

**参数说明:**

- `role`: 角色能力对象（通过 `cpi.getRoleAbilityList()` 获取）
- `key`: 属性键名（支持别名）
- `type`: 搜索类型（默认 `"auto"`）
  - `"auto"`: 自动搜索 basic → ability → skill
  - `"basic"`: 仅在基础属性中搜索
  - `"ability"`: 仅在特殊能力中搜索
  - `"skill"`: 仅在技能列表中搜索

**返回值:**

- 找到属性时返回字符串值
- 未找到时返回 `undefined`

**使用示例:**

```typescript
// 配合CPI使用（推荐模式）
const cmdCheck = new CommandExecutor("check", [], "检定", [], "",
  async (args, mentioned, cpi) => {
    const role = mentioned[0];
    const ability = cpi.getRoleAbilityList(role.roleId);  // 通过CPI获取数据
  
    // 自动搜索（推荐）
    const strength = UTILS.getRoleAbilityValue(ability, "力量");
    // → "70"
  
    // 使用别名（需要配置 ABILITY_MAP）
    const str = UTILS.getRoleAbilityValue(ability, "str");
    // → "70"（如果 ABILITY_MAP 中配置了 str: "力量"）
  
    // 指定搜索类型
    const search = UTILS.getRoleAbilityValue(ability, "侦查", "skill");
    // → "50"
  
    // 使用空值合并运算符提供默认值（推荐）
    const value = Number(UTILS.getRoleAbilityValue(ability, "力量") ?? "0");
    // → 70
  
    // 检查属性是否存在
    const skillValue = UTILS.getRoleAbilityValue(ability, args[0]);
    if (skillValue === undefined) {
      cpi.sendToast(`错误：找不到属性 ${args[0]}`);
      return false;
    }
  
    return true;
  }
);
```

##### 1.2 setRoleAbilityValue - 设置角色属性

向角色能力对象写入属性值，支持自动分类和表达式计算。

```typescript
UTILS.setRoleAbilityValue(
  role: RoleAbility,
  key: string,
  value: string,
  default_type: "skill" | "ability" | "basic",
  type?: "auto" | "skill" | "ability" | "basic"
): void
```

**参数说明:**

- `role`: 角色能力对象
- `key`: 属性键名
- `value`: 属性值（支持表达式，如 `"70+10"`）
- `default_type`: 当属性不存在时，默认添加到哪个字段
- `type`: 设置类型（默认 `"auto"`）

**特性:**

- **表达式自动计算**: 如果 `value` 包含运算符，自动计算结果后设置
- **自动查找**: `type="auto"` 时会依次搜索已存在的键
- **字段自动创建**: 如果目标字段不存在，会自动创建

**使用示例:**

```typescript
// 配合CPI使用（标准流程）
const cmdSet = new CommandExecutor("set", [], "设置属性", [], "",
  async (args, mentioned, cpi) => {
    const role = mentioned[0];
    const ability = cpi.getRoleAbilityList(role.roleId);  // 1. 读取
  
    // 2. 修改（使用UTILS）
    UTILS.setRoleAbilityValue(ability, "力量", "80", "basic");
    UTILS.setRoleAbilityValue(ability, "侦查", "50", "skill");
  
    // 表达式计算
    UTILS.setRoleAbilityValue(ability, "力量", "70+10", "basic");
    // ability.basic.力量 = "80"（自动计算）
  
    cpi.setRoleAbilityList(role.roleId, ability);  // 3. 写回
    cpi.replyMessage("属性设置成功");
    return true;
  }
);

// 批量设置
const updates = [
  { key: "力量", value: "75" },
  { key: "敏捷", value: "80" },
  { key: "san值", value: "65" }
];

const ability = cpi.getRoleAbilityList(roleId);
updates.forEach(({ key, value }) => {
  UTILS.setRoleAbilityValue(ability, key, value, "basic", "auto");
});
cpi.setRoleAbilityList(roleId, ability);
```

#### 2. 表达式计算

##### 2.1 calculateExpression - 计算数学表达式

计算包含角色属性引用的数学表达式。这是UTILS最强大的功能之一。

```typescript
UTILS.calculateExpression(
  expression: string,
  role: RoleAbility
): number
```

**支持的功能:**

- ✅ 四则运算：`+`, `-`, `*`, `/`
- ✅ 括号：`(`, `)`
- ✅ 整数和小数：`42`, `3.14`
- ✅ 属性引用：直接使用属性名作为变量
- ✅ 别名支持：自动处理属性别名映射
- ✅ 自动向下取整：除法结果自动向下取整
- ✅ 未定义属性：视为 `0`

**运算符优先级:**

1. 括号 `()`
2. 乘法 `*` 和除法 `/`
3. 加法 `+` 和减法 `-`

**使用示例:**

```typescript
// 配合CPI使用
const cmdCalc = new CommandExecutor("calc", [], "计算", [], "",
  async (args, mentioned, cpi) => {
    const role = mentioned[0];
    const ability = cpi.getRoleAbilityList(role.roleId);
  
    // 基础四则运算
    UTILS.calculateExpression("10+20", ability);
    // → 30
  
    UTILS.calculateExpression("100/3", ability);
    // → 33（向下取整）
  
    // 引用角色属性
    UTILS.calculateExpression("体型+体质", ability);
    // → 110
  
    // 复杂表达式
    UTILS.calculateExpression("(体型+体质)/10", ability);
    // → 11
  
    // 实际应用：计算COC最大生命值
    const hpm = UTILS.calculateExpression("(体型+体质)/10", ability);
    UTILS.setRoleAbilityValue(ability, "最大生命值", hpm.toString(), "ability");
    cpi.setRoleAbilityList(role.roleId, ability);
  
    cpi.replyMessage(`最大生命值已更新为：${hpm}`);
    return true;
  }
);

// 实际应用：自动计算因变量
const DEPENDENT_VALUE_MAP = {
  hpm: (ability: RoleAbility) => ({
    type: "number",
    value: UTILS.calculateExpression("(体型+体质)/10", ability)
  }),
  sanm: (ability: RoleAbility) => ({
    type: "number", 
    value: UTILS.calculateExpression("99-克苏鲁神话", ability)
  }),
};
```

**错误处理:**

```typescript
try {
  UTILS.calculateExpression("10/0", ability);
} catch (error) {
  cpi.sendToast(`计算错误：${error.message}`);  // "除数不能为零"
  return false;
}

try {
  UTILS.calculateExpression("(10+20", ability);
} catch (error) {
  cpi.sendToast(`计算错误：${error.message}`);  // "括号不匹配"
  return false;
}
```

#### 3. 参数检查

##### 3.1 doesHaveArg - 检查并移除参数

检查参数列表中是否包含指定标志，如果包含则移除并返回 `true`。

```typescript
UTILS.doesHaveArg(
  args: string[],
  arg: string
): boolean
```

**特性:**

- 🔍 **不区分大小写**: 自动转换为小写比较
- 🗑️ **自动移除**: 找到时从原数组中移除该参数
- ✂️ **去除空格**: 自动 trim 处理

**使用示例:**

```typescript
// 配合CPI使用（处理暗骰标志）
const cmdRc = new CommandExecutor("rc", [], "检定", [], "",
  async (args, mentioned, cpi) => {
    // 检查暗骰标志（检查后会自动从 args 中移除）
    const isHidden = UTILS.doesHaveArg(args, "h");
  
    // 剩余参数用于正常解析
    const [skillName, skillValue] = args;
  
    // 执行检定...
    const result = `检定结果...`;
  
    // 根据标志选择发送方式
    if (isHidden) {
      cpi.sendToast(result);  // 暗骰：只有自己看到
      cpi.replyMessage(`${mentioned[0].roleName}进行了一次暗骰`);
    } else {
      cpi.replyMessage(result);  // 公开检定
    }
  
    return true;
  }
);

// 使用示例：
// .rc -h 侦查 50
// 解析后：isHidden=true, args=["侦查", "50"]

// 多个标志
const cmdAdvanced = new CommandExecutor("adv", [], "高级检定", [], "",
  async (args, mentioned, cpi) => {
    const isHidden = UTILS.doesHaveArg(args, "h");    // 暗骰
    const isVerbose = UTILS.doesHaveArg(args, "v");   // 详细输出
    const isQuiet = UTILS.doesHaveArg(args, "q");     // 静默模式
  
    // 剩余参数
    const [skillName] = args;
  
    // ...
    return true;
  }
);
```

#### 4. 别名系统

##### 4.1 initAliasMap - 初始化别名映射

初始化全局别名映射表，应在系统启动时调用一次（在 `cmdPre.tsx` 中）。

```typescript
UTILS.initAliasMap(
  aliasMapSet: { [key: string]: Map<string, string> }
): void
```

**使用示例:**

```typescript
// 在 cmdPre.tsx 中初始化
const ALIAS_MAP_SET: { [key: string]: Map<string, string> } = {
  1: executorCoc.aliasMap,   // COC规则
  2: executorDnd.aliasMap,   // DnD规则
  3: executorFu.aliasMap,    // FU规则
};

UTILS.initAliasMap(ALIAS_MAP_SET);
```

##### 4.2 getAlias - 获取别名映射

根据别名和规则ID获取标准属性名。通常不需要直接调用，`getRoleAbilityValue` 和 `calculateExpression` 会自动使用。

```typescript
UTILS.getAlias(
  alias: string,
  ruleCode: string
): string
```

#### 5. 辅助工具

##### 5.1 sleep - 异步延迟

返回一个在指定毫秒后 resolve 的 Promise。

```typescript
UTILS.sleep(ms: number): Promise<void>
```

**使用示例:**

```typescript
// 批量发送消息时添加间隔
const cmdMulti = new CommandExecutor("multi", [], "多条消息", [], "",
  async (args, mentioned, cpi) => {
    const messages = ["第一条", "第二条", "第三条"];
  
    for (const message of messages) {
      cpi.replyMessage(message);
      await UTILS.sleep(500);  // 每条消息间隔 0.5 秒
    }
  
    return true;
  }
);
```

##### 5.2 getDicerRoleId - 获取骰娘角色ID

获取当前房间的骰娘角色ID。通常在 `cmdPre.tsx` 中使用，命令开发者一般不需要直接调用。

```typescript
UTILS.getDicerRoleId(
  roomContext: RoomContextType
): Promise<number>
```

**查找优先级:**

1. 当前角色绑定的骰娘ID
2. 当前用户配置的骰娘ID
3. 空间配置的骰娘ID
4. 默认骰娘ID（2）

### UTILS + CPI 完整工作流

UTILS 和 CPI 配合使用的标准模式：

```typescript
const cmdExample = new CommandExecutor(
  "example", [], "示例命令",
  [".example 力量+10"],
  ".example [属性] [修正值]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // ========== 第1步：参数检查（使用UTILS） ==========
    const isHidden = UTILS.doesHaveArg(args, "h");
  
    if (args.length === 0) {
      cpi.sendToast("错误：缺少参数");
      return false;
    }
  
    // ========== 第2步：获取角色数据（使用CPI） ==========
    const role = mentioned[0];
    const ability = cpi.getRoleAbilityList(role.roleId);
  
    // ========== 第3步：读取属性（使用UTILS） ==========
    const attrName = args[0];
    const attrValue = UTILS.getRoleAbilityValue(ability, attrName);
  
    if (attrValue === undefined) {
      cpi.sendToast(`错误：找不到属性 ${attrName}`);
      return false;
    }
  
    // ========== 第4步：计算（使用UTILS） ==========
    const baseValue = Number(attrValue);
    const modifier = Number.parseInt(args[1] || "0", 10);
    const finalValue = baseValue + modifier;
  
    // 或使用表达式计算
    const calculated = UTILS.calculateExpression(`${attrName}+${modifier}`, ability);
  
    // ========== 第5步：更新数据（使用UTILS） ==========
    UTILS.setRoleAbilityValue(ability, attrName, finalValue.toString(), "basic");
  
    // ========== 第6步：写回缓存（使用CPI） ==========
    cpi.setRoleAbilityList(role.roleId, ability);
  
    // ========== 第7步：发送反馈（使用CPI） ==========
    const result = `${attrName}: ${baseValue} → ${finalValue}`;
  
    if (isHidden) {
      cpi.sendToast(result);
      cpi.replyMessage(`${role.roleName}进行了一次操作`);
    } else {
      cpi.replyMessage(result);
    }
  
    return true;
  }
);
```

### 常见问题

**Q1: getRoleAbilityValue 和 setRoleAbilityValue 应该用 auto 还是指定类型？**

A: 推荐使用 `"auto"` 模式。这样可以：

- 读取时自动在所有字段中搜索，避免遗漏
- 写入时自动更新已存在的属性，保持数据一致性
- 只有在明确需要控制字段位置时才指定类型

**Q2: 为什么 setRoleAbilityValue 修改后还要调用 cpi.setRoleAbilityList？**

A: 这是必须的！

- `UTILS.setRoleAbilityValue` 只修改内存中的对象
- `cpi.setRoleAbilityList` 将修改后的对象写回缓存
- 不写回的话，修改不会生效，也不会持久化到后端

正确流程：

```typescript
const ability = cpi.getRoleAbilityList(roleId);      // 1. 读取
UTILS.setRoleAbilityValue(ability, "力量", "70", "basic");  // 2. 修改
cpi.setRoleAbilityList(roleId, ability);             // 3. 写回 ⚠️ 必须！
```

**Q3: calculateExpression 不支持哪些功能？**

A: 目前不支持：

- 指数运算（`^` 或 `**`）
- 取模运算（`%`）
- 比较运算（`>`, `<`, `==`）
- 逻辑运算（`&&`, `||`）
- 函数调用（`max()`, `min()`, `abs()`）

如需这些功能，可在命令中手动实现。

**Q4: doesHaveArg 会修改原数组吗？**

A: **会！** 如果找到参数，会从原数组中移除。如果需要保留原数组，请先复制：

```typescript
const argsCopy = [...args];
const hasFlag = UTILS.doesHaveArg(argsCopy, "h");
// args 保持不变，argsCopy 被修改
```

**Q5: 如何在命令中使用属性别名？**

A: 需要两步：

1. 在规则命名空间中定义别名映射：

```typescript
const ABILITY_MAP = {
  "str": "力量",
  "dex": "敏捷",
  "computer": "计算机使用",
};

const executorMyRule = new RuleNameSpace(
  1, "myrule", [], "描述",
  new Map(Object.entries(ABILITY_MAP))
);
```

2. 在命令中使用 UTILS：

```typescript
// UTILS 会自动处理别名
const strength = UTILS.getRoleAbilityValue(ability, "str");  // "str" → "力量"
const result = UTILS.calculateExpression("str+dex", ability);  // 自动转换
```

---

## 开发指南

### 第一步：创建规则命名空间

在 `app/components/common/dicer/cmdExe/`目录下创建新文件，如 `cmdExeMyRule.ts`：

```typescript
import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";

// 1. 定义属性别名映射
const ABILITY_MAP: { [key: string]: string } = {
  str: "力量",
  dex: "敏捷",
  // ... 添加你的属性映射
};

// 2. 定义因变量计算方程（可选）
const DEPENDENT_VALUE_MAP: { [key: string]: (ability: RoleAbility) => { type: string; value: string | number } } = {
  maxhp: (ability) => ({ 
    type: "number", 
    value: Number(ability.basic?.constitution ?? 0) * 10 
  }),
  // ... 添加你的计算公式
};

// 3. 创建规则命名空间
const executorMyRule = new RuleNameSpace(
  4,                                    // 规则ID（需与后端对应）
  "myrule",                            // 规则名
  ["mr", "myrule5e"],                 // 规则别名
  "我的规则系统描述",
  new Map(Object.entries(ABILITY_MAP)),
  new Map(Object.entries(DEPENDENT_VALUE_MAP))
);

export default executorMyRule;
```

### 第二步：添加命令

```typescript
// 4. 创建命令执行器
const cmdMyCheck = new CommandExecutor(
  "check",                             // 命令名
  ["chk", "检定"],                     // 别名
  "进行属性检定",                       // 描述
  [".check 力量", ".check 力量+5"],   // 使用示例
  ".check [属性名] [修正值]?",         // 用法说明
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // 5. 获取操作对象（第一个@的角色，或命令发送者）
    const targetRole = mentioned[0];
    const ability = cpi.getRoleAbilityList(targetRole.roleId);
  
    // 6. 解析参数
    const attrName = args[0]?.toLowerCase();
    const modifier = Number.parseInt(args[1] || "0", 10);
  
    // 7. 获取属性值（自动处理别名）
    const attrValue = UTILS.getRoleAbilityValue(ability, attrName);
    if (attrValue === undefined) {
      cpi.sendToast(`找不到属性：${attrName}`);
      return false;
    }
  
    // 8. 执行骰子逻辑
    const diceResult = roll("1d20");
    const finalValue = diceResult.result + Number(attrValue) + modifier;
  
    // 9. 判定结果
    const success = finalValue >= 15;  // 假设DC为15
  
    // 10. 发送结果消息
    cpi.replyMessage(
      `${targetRole.roleName}进行${attrName}检定：` +
      `1d20=${diceResult.result} + ${attrValue} + ${modifier} = ${finalValue} ` +
      `${success ? "成功！" : "失败..."}`
    );
  
    return true;
  }
);

// 11. 将命令添加到规则命名空间
executorMyRule.addCmd(cmdMyCheck);
```

### 第三步：注册规则到系统

在 `cmdPre.tsx`中注册你的规则：

```typescript
import executorMyRule from "@/components/common/dicer/cmdExe/cmdExeMyRule";

const RULES: Map<number, RuleNameSpace> = new Map();
RULES.set(1, executorCoc);
RULES.set(2, executorDnd);
RULES.set(3, executorFu);
RULES.set(4, executorMyRule);  // 添加你的规则

// 同时注册别名映射
const ALIAS_MAP_SET: { [key: string]: Map<string, string> } = {
  1: executorCoc.aliasMap,
  2: executorDnd.aliasMap,
  3: executorFu.aliasMap,
  4: executorMyRule.aliasMap,  // 添加你的别名映射
};
```

### 第四步：使用工具函数

#### 骰子相关

```typescript
import { roll, rollDice, parseDiceExpression } from "@/components/common/dicer/dice";

// 解析并执行骰子表达式
const result = roll("3d6+2");
// result = { result: 15, expanded: "3d6=[2,5,6]=13+2=15", ... }

// 只投骰不解析表达式
const dices = rollDice(3, 6);
// dices = [2, 5, 6]

// 只解析表达式不投骰
const expr = parseDiceExpression("2d6+1d4");
// expr = { diceCount: 3, operations: [...] }
```

#### 工具函数

```typescript
import UTILS from "@/components/common/dicer/utils/utils";

// 获取角色属性值（自动处理别名和因变量）
const strength = UTILS.getRoleAbilityValue(ability, "力量");
const strValue = UTILS.getRoleAbilityValue(ability, "str");  // 同上

// 设置角色属性值
UTILS.setRoleAbilityValue(ability, "力量", 70);

// 计算表达式（支持属性引用）
const result = UTILS.calculateExpression("(体型+体质)/10", ability);

// 检查参数
const hasHidden = UTILS.doesHaveArg(args, "h");  // 检查是否有-h参数
```

### 高级技巧

#### 1. 奖惩骰实现

```typescript
// 解析奖惩骰前缀
let bonusDice = 0;
if (args[0]?.match(/^[bp]\d*$/i)) {
  const prefix = args.shift()!;
  bonusDice = prefix[0].toLowerCase() === "b" 
    ? Number.parseInt(prefix.slice(1) || "1", 10)   // 奖励骰
    : -Number.parseInt(prefix.slice(1) || "1", 10); // 惩罚骰
}

// 投骰
const mainRoll = rollDice(1, 100)[0];
const extraRolls = rollDice(Math.abs(bonusDice), 10);

// 计算最终结果
const results = [mainRoll, ...extraRolls.map(r => mainRoll - (mainRoll % 10) + r)];
const finalResult = bonusDice >= 0 ? Math.min(...results) : Math.max(...results);
```

#### 2. 成功等级判定

```typescript
function getSuccessLevel(roll: number, target: number): string {
  if (roll === 1) return "大成功";
  if (roll === 100 || (roll > 95 && roll > target)) return "大失败";
  if (roll <= target / 5) return "极难成功";
  if (roll <= target / 2) return "困难成功";
  if (roll <= target) return "成功";
  return "失败";
}
```

#### 3. 支持多角色操作

```typescript
// 为多个角色投先攻
const cmdRi = new CommandExecutor("ri", [], "投先攻", [], "", 
  async (args, mentioned, cpi) => {
    // mentioned数组包含所有@的角色加命令发送者
    const results = [];
  
    for (const role of mentioned.slice(0, -1)) {  // 排除最后的发送者
      const ability = cpi.getRoleAbilityList(role.roleId);
      const dexValue = UTILS.getRoleAbilityValue(ability, "敏捷") ?? 0;
      const initiative = roll("1d20").result + dexValue;
      results.push(`${role.roleName}: ${initiative}`);
    }
  
    cpi.replyMessage(`先攻结果：\n${results.join("\n")}`);
    return true;
  }
);
```

#### 4. 私聊暗骰

```typescript
const isHidden = UTILS.doesHaveArg(args, "h");

if (isHidden) {
  cpi.sendToast(`暗骰结果：${result}`);  // 只有发送者看到
  cpi.replyMessage(`${roleName}进行了一次暗骰`);  // 其他人看到
} else {
  cpi.replyMessage(`掷骰结果：${result}`);  // 所有人看到
}
```

## 示例代码：COC7规则深度解析

本节以 `cmdExeCoc.ts` 为例，深入剖析一个完整的TRPG规则系统是如何实现的。

### 第一部分：规则初始化

#### 1.1 属性别名映射表

```typescript
// 属性名中英文对照表
const ABILITY_MAP: { [key: string]: string } = {
  str: "力量",
  dex: "敏捷",
  pow: "意志",
  con: "体质",
  app: "外貌",
  edu: "教育",
  siz: "体型",
  int: "智力",
  san: "san值",
  luck: "幸运",
  mp: "魔法",
  // 衍生属性的别名
  体力: "hp",
  生命值: "hp",
  理智: "san值",
  运气: "幸运",
  // 技能别名
  计算机: "计算机使用",
  图书馆: "图书馆使用",
  侦察: "侦查",
  // ... 更多别名
};
```

**设计要点:**

- 支持多语言输入：用户可以输入"str"或"力量"，系统自动识别
- 技能别名：处理常见的口语化表达（如"侦察"→"侦查"）
- 统一键名：所有别名映射到标准属性名，避免数据重复

#### 1.2 因变量计算方程

```typescript
const DEPENDENT_VALUE_MAP: { [key: string]: (ability: RoleAbility) => { type: string; value: string | number } } = {
  // 最大生命值 = (体型+体质)/10
  hpm: (ability) => ({ 
    type: "number", 
    value: Number(UTILS.calculateExpression("(体型+体质)/10", ability)) 
  }),
  
  // 最大魔法值 = 意志/10
  mpm: (ability) => ({ 
    type: "number", 
    value: Number(UTILS.calculateExpression("(意志)/10", ability)) 
  }),
  
  // 理智上限 = 99-克苏鲁神话
  sanm: (ability) => ({ 
    type: "number", 
    value: Number(UTILS.calculateExpression("99-克苏鲁神话", ability)) 
  }),
  
  // 伤害加深（DB）- 根据力量+体型计算
  db: (ability) => ({ 
    type: "dice", 
    value: (() => {
      const ref = UTILS.calculateExpression("敏捷+力量", ability);
      if (ref < 65) return "-2";
      if (ref < 85) return "-1";
      if (ref < 125) return "0";
      if (ref < 165) return "1d4";
      if (ref < 205) return "1d6";
      const diceCount = Math.floor((ref - 205) / 80) + 2;
      return `${diceCount}d6`;
    })()
  }),
};
```

**设计要点:**

- **自动计算**: 用户设置基础属性后，因变量自动更新
- **类型标识**: `type`字段区分数值型和骰子型因变量
- **动态计算**: 使用闭包和表达式引擎实现复杂逻辑
- **规则准确**: 严格遵循COC7版规则手册

#### 1.3 创建规则命名空间

```typescript
const executorCoc = new RuleNameSpace(
  0,                                      // 规则ID（对应后端数据库）
  "coc7",                                 // 规则名
  ["coc", "coc7th"],                     // 规则别名
  "COC7版规则的指令集",
  new Map(Object.entries(ABILITY_MAP)),   // 传入属性映射
  new Map(Object.entries(DEPENDENT_VALUE_MAP)) // 传入因变量映射
);

export default executorCoc;
```

### 第二部分：核心命令实现

#### 2.1 技能检定命令 (rc)

这是COC中最常用的命令，支持奖惩骰、暗骰、修正值等高级功能。

```typescript
const cmdRc = new CommandExecutor(
  "rc",                                   // 命令名
  ["ra"],                                 // 别名
  "进行技能检定",
  [".rc 侦查 50", ".rc 侦查 +10", ".rc p 手枪", ".rc 力量", ".rc 敏捷-10"],
  "rc [奖励/惩罚骰]? [技能名] [技能值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    // ========== 第1步：获取角色数据 ==========
    const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
    args = args.map(arg => arg.toLowerCase()); // 统一小写处理
    const isForceToasted = UTILS.doesHaveArg(args, "h"); // 检查暗骰标志

    // ========== 第2步：参数分类 ==========
    const signedNumbers: string[] = [];   // 带符号的修正值：["+10", "-5"]
    const unsignedNumbers: string[] = []; // 无符号的技能值：["50", "70"]
    const numWithBp: string[] = [];       // 奖惩骰标记：["b", "p", "2b"]
    const names: string[] = [];           // 技能名：["侦查", "力量"]

    for (const arg of args) {
      // 匹配"技能名+修正值"（如"力量+20"）
      const nameBonusMatch = arg.match(/^([a-z\u4E00-\u9FA5]+)([+-]\d+)$/i);
      if (nameBonusMatch) {
        names.push(nameBonusMatch[1]);
        signedNumbers.push(nameBonusMatch[2]);
      }
      // 匹配带符号数值（"+10"、"-5"）
      else if (/^[+-]\d+(?:\.\d+)?$/.test(arg)) {
        signedNumbers.push(arg);
      }
      // 匹配纯数值（"50"、"70"）
      else if (/^\d+(?:\.\d+)?$/.test(arg)) {
        unsignedNumbers.push(arg);
      }
      // 匹配奖惩骰标记（"b"、"2p"）
      else if (/^\d*[bp]$/.test(arg)) {
        numWithBp.push(arg);
      }
      // 其他视为技能名
      else {
        names.push(arg);
      }
    }

    // ========== 第3步：解析奖惩骰 ==========
    // 计算加权总和：b为+1，p为-1
    const bp: number = numWithBp.reduce((sum, item) => {
      const match = item.match(/^([+-]?\d*)([bp])$/);
      if (!match) return 0;
  
      const [, numStr, letter] = match;
      const n = numStr === "" ? 1 : Number.parseInt(numStr, 10);
      const weight = letter === "b" ? 1 : -1; // b=奖励，p=惩罚
  
      return sum + n * weight;
    }, 0);

    // ========== 第4步：获取技能值 ==========
    const [attr] = unsignedNumbers;
    const [bonus] = signedNumbers;
    let [name] = names;

    if (!name) {
      throw new Error("错误：缺少技能名称");
    }

    // 处理别名映射
    if (ABILITY_MAP[name.toLowerCase()]) {
      name = ABILITY_MAP[name.toLowerCase()];
    }

    // 从角色数据中读取技能值
    let value = Number.parseInt(UTILS.getRoleAbilityValue(curAbility, name) || "");

    // 如果角色数据中没有，使用命令中指定的值
    if ((value === undefined || Number.isNaN(value)) && attr === undefined && !bonus) {
      cpi.replyMessage("错误：未找到技能或属性且未指定技能值");
      return false;
    }

    if (attr !== undefined) {
      value = Number.parseInt(attr);
    }

    // 应用修正值
    if (bonus !== undefined) {
      value += Number.parseInt(bonus);
    }

    value = Math.max(0, value); // 最小值为0

    // ========== 第5步：执行掷骰 ==========
    const roll: number[] = rollDiceWithBP(bp);
  
    // ========== 第6步：构建结果 ==========
    let result: string = buildCheckResult(name, roll[0], value);
  
    if (bp > 0) {
      result += ` 奖励骰 [${roll.slice(1).join(",")}]`;
    }
    if (bp < 0) {
      result += ` 惩罚骰 [${roll.slice(1).join(",")}]`;
    }

    // ========== 第7步：发送结果 ==========
    if (isForceToasted) {
      cpi.sendToast(result); // 暗骰：只有自己看到
      cpi.replyMessage(`${mentioned[mentioned.length - 1].roleName}进行了一次暗骰`);
    } else {
      cpi.replyMessage(result); // 公开检定
    }

    return true;
  },
);
executorCoc.addCmd(cmdRc);
```

**命令执行流程图:**

```
用户输入: .rc p 侦查+10
    ↓
参数解析: ["p", "侦查+10"]
    ↓
分类结果:
  - numWithBp: ["p"]  → bp = -1
  - names: ["侦查"]
  - signedNumbers: ["+10"]
    ↓
获取技能值: 
  - 基础值: 50（从角色数据读取）
  - 修正值: +10
  - 最终值: 60
    ↓
执行掷骰: rollDiceWithBP(-1)
  - 主骰: 45
  - 惩罚骰: 7
  - 最终: 75（取较大值）
    ↓
判定结果:
  - 75 > 60 → "失败"
    ↓
输出: "侦查检定：D100=75/60 失败 惩罚骰 [7]"
```

#### 2.2 属性设置命令 (st)

支持批量设置、增量修改、属性查询等功能。

```typescript
const cmdSt = new CommandExecutor(
  "st",
  [],
  "属性设置",
  [".st 力量70", ".st show 敏捷", ".st 力量+10", ".st 敏捷-5"],
  ".st [属性名][属性值] / .st show [属性名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    const input = args.join("");
    const abilityChanges: {
      [key: string]: { old: number; op: string; val: number; new: number };
    } = {};

    const curAbility = cpi.getRoleAbilityList(role.roleId);
    if (!curAbility) {
      cpi.sendToast("非法操作，当前角色不存在于提及列表中。");
      return false;
    }

    // ========== 查询模式 ==========
    if (args[0]?.toLowerCase() === "show") {
      const showProps = args.slice(1).filter(arg => arg.trim() !== "");
      if (showProps.length === 0) {
        cpi.sendToast("请指定要展示的属性");
        return false;
      }

      const result: string[] = [];
      for (const prop of showProps) {
        const normalizedKey = prop.toLowerCase();
        const key = ABILITY_MAP[normalizedKey] || prop;
        const value = UTILS.getRoleAbilityValue(curAbility, key) ?? 0;
        result.push(`${key}: ${value}`);
      }

      cpi.sendToast(`${role?.roleName || "当前角色"}的属性展示：\n${result.join("\n")}`);
      return true;
    }

    // ========== 设置模式 ==========
    // 使用正则匹配所有"属性名+操作符+数值"的组合
    const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);

    for (const match of matches) {
      const rawKey = match[1].trim();
      const operator = match[2];        // "+" | "-" | ""
      const value = Number.parseInt(match[3], 10);

      const normalizedKey = rawKey.toLowerCase();
      const key = ABILITY_MAP[normalizedKey] || rawKey;

      const currentValue = Number.parseInt(
        UTILS.getRoleAbilityValue(curAbility, key) ?? "0"
      );
  
      let newValue: number;
      if (operator === "+") {
        newValue = currentValue + value; // 增量
      } else if (operator === "-") {
        newValue = currentValue - value; // 减量
      } else {
        newValue = value; // 直接赋值
      }

      // 存储变化详情
      abilityChanges[key] = {
        old: currentValue,
        op: operator || "=",
        val: value,
        new: newValue,
      };

      // 更新属性（自动选择合适的字段：basic/ability/skill）
      UTILS.setRoleAbilityValue(curAbility, key, newValue.toString(), "skill", "auto");
    }

    // ========== 生成变化报告 ==========
    const changeEntries = Object.entries(abilityChanges)
      .map(([key, { old, op, val, new: newValue }]) => {
        if (op !== "=") {
          return `${key}: ${old}${op}${val}->${newValue}`;
        } else {
          return `${key}: ${old}->${newValue}`;
        }
      });

    const updateDetails = `{\n${changeEntries.join("\n")}\n}`;
    cpi.setRoleAbilityList(role.roleId, curAbility);
    cpi.replyMessage(
      `属性设置成功：${role?.roleName || "当前角色"}的属性已更新: ${updateDetails}`
    );

    return true;
  },
);
executorCoc.addCmd(cmdSt);
```

**使用示例:**

```
.st 力量70 敏捷80 体质60
→ {
    力量: 0->70
    敏捷: 0->80
    体质: 0->60
  }

.st 力量+10 san值-5
→ {
    力量: 70+10->80
    san值: 65-5->60
  }

.st show 力量 敏捷 san值
→ 力量: 80
  敏捷: 80
  san值: 60
```

### 第三部分：工具函数

#### 3.1 奖惩骰掷骰函数

```typescript
/**
 * 带奖励骰和惩罚骰的D100检定
 * @param bp 奖惩骰数（正数=奖励，负数=惩罚）
 * @returns [最终结果, 十位数1, 十位数2, ...]
 */
function rollDiceWithBP(bp: number = 0): number[] {
  let bonus: boolean = bp > 0;
  bp = Math.abs(bp);
  
  // 投主骰：1个十位 + 1个个位
  let tens = Math.floor(Math.random() * 10);
  const ones = Math.floor(Math.random() * 10);
  
  const result: number[] = [0, tens]; // result[0]待定，result[1]是主骰十位
  
  // 投额外的十位骰
  for (let i = 1; i <= bp; i++) {
    const roll = Math.floor(Math.random() * 10);
  
    // 奖励骰取最小，惩罚骰取最大
    if ((connect2D10(tens, ones) > connect2D10(roll, ones)) === bonus) {
      tens = roll;
    }
  
    result.push(roll);
  }
  
  // 计算最终结果
  result[0] = connect2D10(tens, ones);
  return result;
}

/**
 * 将十位和个位组合成D100结果
 * @example connect2D10(3, 5) → 35
 * @example connect2D10(0, 0) → 100
 */
function connect2D10(tens: number, ones: number): number {
  let result = tens * 10 + ones;
  if (result === 0) result = 100; // 特殊规则：00 = 100
  return result;
}
```

**算法解析:**

```
场景1：奖励骰（b2，投3个十位取最小）
- 主骰个位: 5
- 十位1: 4 → 45
- 十位2: 7 → 75
- 十位3: 2 → 25
→ 最终取25（最小）

场景2：惩罚骰（p，投2个十位取最大）
- 主骰个位: 8
- 十位1: 3 → 38
- 十位2: 6 → 68
→ 最终取68（最大）
```

#### 3.2 成功等级判定函数

```typescript
/**
 * 构建COC检定结果字符串
 * @param attr 属性/技能名
 * @param roll 骰子结果（1-100）
 * @param value 目标值
 * @returns 格式化的检定结果
 */
function buildCheckResult(attr: string, roll: number, value: number): string {
  const fifth = Math.floor(value / 5);  // 极难成功阈值
  const half = Math.floor(value / 2);   // 困难成功阈值
  
  let result = "";
  
  // 判定优先级：大成功 > 大失败 > 失败 > 极难 > 困难 > 普通
  if (roll <= 5) {
    result = "大成功";
  } else if (roll >= 96) {
    result = "大失败";
  } else if (roll > value) {
    result = "失败";
  } else if (roll <= fifth) {
    result = "极难成功";
  } else if (roll <= half) {
    result = "困难成功";
  } else {
    result = "普通成功";
  }

  return `${attr}检定：D100=${roll}/${value} ${result}`;
}
```

**判定表:**

| 骰子结果 | 目标值70示例 | 判定结果 |
| -------- | ------------ | -------- |
| 1-5      | 任何值       | 大成功   |
| 6-14     | ≤14 (1/5)   | 极难成功 |
| 15-35    | ≤35 (1/2)   | 困难成功 |
| 36-70    | ≤70         | 普通成功 |
| 71-95    | >70          | 失败     |
| 96-100   | 任何值       | 大失败   |

### 第四部分：设计模式与最佳实践

#### 4.1 参数解析模式

cmdExeCoc使用了一种**多分类解析模式**，将用户输入分为多个类别：

```typescript
// 输入: ["-10", "侦查", "50", "b2", "力量+20"]
↓
// 分类结果:
signedNumbers: ["-10", "+20"]   // 带符号修正值
unsignedNumbers: ["50"]         // 无符号技能值
numWithBp: ["b2"]               // 奖惩骰标记
names: ["侦查", "力量"]         // 技能名
```

**优势:**

- 参数顺序无关：`.rc 侦查 b2 50` 和 `.rc b2 50 侦查` 等效
- 复合参数支持：`力量+20` 自动拆分为技能名和修正值
- 可扩展性强：新增参数类型只需添加一个分类器

#### 4.2 错误处理模式

```typescript
// 1. 早期返回
if (!name) {
  cpi.replyMessage("错误：缺少技能名称");
  return false;
}

// 2. 降级处理
let value = getRoleValue(name);
if (isNaN(value) && attr === undefined) {
  cpi.replyMessage("错误：未指定技能值");
  return false;
}
if (attr !== undefined) {
  value = attr; // 使用命令中的值降级
}

// 3. 兜底值
value = Math.max(0, value); // 保证非负
```

#### 4.3 UI反馈模式

```typescript
// 私聊反馈（Toast）
cpi.sendToast("这条消息只有你看到");

// 公开反馈（群聊消息）
cpi.replyMessage("所有人都能看到这条消息");

// 暗骰模式（混合反馈）
if (isHidden) {
  cpi.sendToast(`暗骰结果：${detail}`);        // 详细结果给自己
  cpi.replyMessage(`${name}进行了一次暗骰`); // 简略提示给他人
}
```

---

## 附录

### 1. 常用工具函数

| 函数                                             | 说明                     | 示例                                                     |
| ------------------------------------------------ | ------------------------ | -------------------------------------------------------- |
| `roll(expr)`                                   | 解析并执行骰子表达式     | `roll("3d6+2")`                                        |
| `rollDice(count, faces)`                       | 投指定数量和面数的骰子   | `rollDice(3, 6)`                                       |
| `UTILS.getRoleAbilityValue(ability, key)`      | 获取角色属性值           | `UTILS.getRoleAbilityValue(ab, "力量")`                |
| `UTILS.setRoleAbilityValue(ability, key, val)` | 设置角色属性值           | `UTILS.setRoleAbilityValue(ab, "力量", "70", "basic")` |
| `UTILS.calculateExpression(expr, ability)`     | 计算包含属性引用的表达式 | `UTILS.calculateExpression("力量+敏捷", ab)`           |
| `UTILS.doesHaveArg(args, flag)`                | 检查参数中是否有指定标志 | `UTILS.doesHaveArg(args, "h")`                         |

```typescript
// RoleAbility 角色能力结构
interface RoleAbility {
  abilityId?: number;
  roleId?: number;
  ruleId?: number;
  act?: Record<string, string>;       // 行动相关
  basic?: Record<string, string>;     // 基础属性（力量、敏捷等）
  ability?: Record<string, string>;   // 特殊能力
  skill?: Record<string, string>;     // 技能列表
  record?: Record<string, string>;    // 记录信息
  extra?: Record<string, string>;     // 扩展字段
}

// UserRole 角色信息
interface UserRole {
  userId: number;
  roleId: number;
  roleName?: string;
  description?: string;
  avatarId?: number;
  type: number;  // 0=角色, 1=骰娘
  // ... 其他字段
}
```

### 2. 调试技巧

1. **在CPI回调中添加日志**

```typescript
const replyMessage = (msg: string) => {
  console.log("[骰娘回复]", msg);
  dicerMessageQueue.push(msg);
};
```

2. **使用sendToast进行即时反馈**

```typescript
cpi.sendToast(`调试信息：attrValue=${attrValue}, result=${result}`);
```

3. **检查命令是否正确注册**

```typescript
console.log(executorMyRule.getCmdList());
```
