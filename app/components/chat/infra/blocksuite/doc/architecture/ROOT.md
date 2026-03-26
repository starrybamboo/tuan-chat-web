# Blocksuite Root Architecture

## 路径

- [blocksuite/](../../)

## 目标

根目录只保留顶层目录，不再放业务源码文件。

源码按语义收口后，顶层目录分工是：
- `shared/`：跨多个子域复用的基础件
- `document/`：文档语义 helper
- `mention/`：mention 相关宿主 UI

## 当前目录

- [shared/](../../shared)：共享基础件目录
- [document/](../../document)：文档语义 helper 目录
- [mention/](../../mention)：mention 宿主 UI 目录

## 不负责的事

- 不承担 iframe 协议
- 不承担 workspace 生命周期
- 不承担 description / space 业务映射
- 不承担 spec 注册和样式资源

## 维护约束

- 新源码默认不要再放回根目录
- 横切基础件放 [shared/](../../shared)
- 文档语义 helper 放 [document/](../../document)
- mention 宿主 UI 放 [mention/](../../mention)
