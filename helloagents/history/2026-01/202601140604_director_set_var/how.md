# 导演控制台设置 WebGAL 空间变量 - How

## 方案概述

1. 在导演控制台（`ChatToolbar` 下拉菜单）增加“设置变量…”入口，打开弹窗收集变量名与表达式。
2. 发送侧新增 `onSetWebgalVar(key, expr)` 回调链路：`ChatToolbar → RoomComposerPanel → RoomWindow`。
3. 在 `RoomWindow` 中复用现有 `WEBGAL_VAR` 发送与 `space.extra.webgalVars` 合并写入逻辑，提供一个独立的“设置变量”函数供按钮调用。
4. 输入框侧：当用户输入以 `/var` 开头时，不再解析发送，改为提示“请使用导演控制台设置变量”。
5. 同步更新文档与知识库：移除 `/var set ...` 作为用户入口的描述，替换为导演控制台入口说明。

## 校验规则（前端）

- `key`：`/^[A-Z_]\\w*$/i`
- `expr`：非空

