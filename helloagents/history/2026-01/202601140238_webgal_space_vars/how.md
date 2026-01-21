# 技术设计: WebGAL 空间变量系统（聊天指令驱动）

## 技术方案

### 核心思路

- 引入新消息类型 `MessageType.WEBGAL_VAR`（名称可调整），用于表达“变量操作”。
- 在 Chat 发送侧解析 `/var` 指令，生成结构化 payload，并发送为 `WEBGAL_VAR`。
- 发送侧在成功发送后（或发送前乐观）将变更合并写入 `space.extra.webgalVars`，完成空间级持久化。
- WebGAL `RealtimeRenderer` 在渲染阶段将 `WEBGAL_VAR` 转换为等价 WebGAL Script：`setVar:<key>=<expr> -global;`（强制 `-global` 以匹配“空间级持久化”的语义）。

### 消息数据结构（建议）

```ts
type WebgalVarScope = "space";
type WebgalVarOp = "set";

export interface WebgalVarMessagePayload {
  scope: WebgalVarScope;  // 固定为 "space"
  op: WebgalVarOp;        // 当前仅支持 "set"
  key: string;            // 变量名，例如 "a" / "stage.hp"（是否允许点号见约束）
  expr: string;           // WebGAL 表达式/字面量，例如 "1" / "true" / "random(1,10)" / "a+1"
  global: true;           // 固定 true（映射到 WebGAL 的 -global）
}
```

约束建议：
- `key` 仅允许 `[A-Za-z_][A-Za-z0-9_]*`（第一期保守），避免与 WebGAL 内置变量域（`$stage`/`$userData`）以及复杂路径产生歧义；后续再放开点号/数组。
- `expr` 作为“原样字符串”传递，不在聊天侧求值；展示时原样显示。

### Chat 指令语法（建议）

- `/var set <key>=<expr>`
- 示例：
  - `/var set a=1`
  - `/var set flag=true`
  - `/var set dice=random(1,20)`
  - `/var set b=a+1`

发送侧行为：
1. 解析为 `WEBGAL_VAR` 消息（`extra.webgalVar` 或 `extra` 内直挂 payload，视现有约定而定）
2. `content` 可为空或用于回显（建议为空，避免重复展示）
3. 将变更合并写入 `space.extra.webgalVars`

### 空间持久化（space.extra）

推荐在 `space.extra`（JSON 字符串）内维护：

```ts
interface SpaceExtraWebgalVars {
  webgalVars?: Record<string, { expr: string; updatedAt: number; updatedByMessageId?: number }>;
}
```

合并策略：
- 读取当前 `space.extra` -> JSON.parse -> 合并 `webgalVars[key]` -> JSON.stringify -> `setSpaceExtraMutation`
- 多端并发：不做强一致保证，采用 last-write-wins；后续如需要可引入 `updatedByMessageId` / `syncId` 对比减少回滚

### WebGAL 渲染联动

`RealtimeRenderer` 增加对 `MessageType.WEBGAL_VAR` 的处理：
- 将 payload 转换为一行脚本：`setVar:${key}=${expr} -global;`
- 写入当前房间 scene（与 `WEBGAL_COMMAND` 类似），并触发同步

初始化/补偿（可选但建议）：
- 当实时渲染启动且切换房间/重建场景时，从 `space.extra.webgalVars` 生成一组 `setVar:* -global;` 作为“状态回放”，写入 `start.txt` 或每个 scene 的开头，确保只依赖持久化也能恢复变量状态。

## 架构决策 ADR

### ADR-001: 使用新消息类型承载变量变更

**上下文:** 已存在 `WEBGAL_COMMAND` 可写入任意脚本，但变量变更需要更结构化、更易展示与持久化同步。

**决策:** 新增 `MessageType.WEBGAL_VAR`，并使用结构化 payload 表达变量更新；渲染侧再转换为 WebGAL Script。

**替代方案:**
- 复用 `WEBGAL_COMMAND` 直接发送 `setVar:*`：实现最少，但无法满足“给一个消息类型”的诉求，也不利于 UI/导出识别与持久化同步。

**影响:** 需要更新枚举、展示/导出、渲染器；变更范围可控。

## 安全与性能

- **安全:** 不新增生产环境连接/密钥处理；变量表达式可能被用于 WebGAL 执行，但现状已允许 `WEBGAL_COMMAND` 发送任意脚本，风险增量有限。
- **性能:** `space.extra` 更新频率可能较高；建议对同一消息只写一次，并避免在“接收侧”重复写回（以减少写放大）。

## 测试与验收

- 单元测试：`/var` 指令解析、`space.extra` 合并逻辑（保持其他字段不变）
- 集成验证：
  - 发送 `/var set a=1` 后聊天中出现变量消息
  - 重新进入空间后变量仍可从 `space.extra` 恢复
  - 开启 WebGAL 实时渲染后变量消息会写入 `setVar:* -global;` 并影响 `-when` 分支

