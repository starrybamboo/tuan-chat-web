# Blocksuite Guide

这组文档按“问题导向”组织，面向已经读过 `README.md` / `ARCHITECTURE-OVERVIEW.md`，但还想按主题深入理解实现链路的人。

建议阅读顺序：

1. [01 项目如何集成 BlockSuite 引擎](./01-how-blocksuite-is-integrated.md)
2. [02 编辑器首屏渲染的逻辑](./02-first-screen-rendering.md)
3. [03 编辑器的更新逻辑](./03-editor-update-flow.md)
4. [04 iframe 和主线程的通信系统](./04-iframe-host-bridge.md)
5. [05 如何接入该项目的业务](./05-business-integration.md)
6. [06 如何自定义块、扩展和编辑器能力](./06-custom-blocks-and-extensions.md)
7. [07 本地与远程同步层逻辑](./07-local-and-remote-sync.md)
8. [08 BlockSuite 底层设计的数据抽象](./08-data-abstractions.md)

使用方式：

- 想先建立整体认识，先读 01。
- 想排查“为什么打开慢 / 为什么会闪”，先读 02。
- 想排查“为什么没更新 / 为什么切模式异常”，先读 03。
- 想排查宿主和 iframe 之间的边界问题，先读 04。
- 想新增业务能力或页面接入，先读 05 和 06。
- 想理解存储、恢复、WS、离线队列，先读 07。
- 想从底层抽象视角理解 BlockSuite，再读 08。
