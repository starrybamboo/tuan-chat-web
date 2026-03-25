# Blocksuite Bootstrap Architecture

## 路径

`app/components/chat/infra/blocksuite/bootstrap/`

## 目标

负责浏览器侧必须提前执行的初始化动作。

这一层的角色是“预热与注册”，不是运行时编排器。

## 当前文件

- `browser.ts`：浏览器 bootstrap 入口

## 负责的事

- 确保浏览器环境下所需注册已完成
- 给上层 route/client 提供可 await 的初始化入口

## 不负责的事

- 不直接创建 editor
- 不处理 iframe 消息协议
- 不管理文档加载和 hydration
