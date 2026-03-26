# Blocksuite Shared Architecture

## 路径

- [shared/](../../shared)

## 目标

承载跨 `frame / space/runtime / editors / services` 复用的横切基础件。

## 当前文件

- [base64.ts](../../shared/base64.ts)
- [blocksuiteDocError.ts](../../shared/blocksuiteDocError.ts)
- [debugFlags.ts](../../shared/debugFlags.ts)
- [perf.ts](../../shared/perf.ts)

## 负责的事

- 二进制与 base64 转换
- Blocksuite 文档错误分类与非重试判断
- 调试开关读取
- 打开链路性能打点

## 不负责的事

- 不承担文档 header/excerpt 语义
- 不承担 mention UI
- 不承担 iframe 协议或 editor 装配
