# Blocksuite Editor 文档

这个目录只解释 `editors/` 这条链路，不覆盖 frame 接入链路、`runtime/` 数据源组合、`space/description/` 业务语义。

适合回答这几类问题：

- editor 的分层架构是什么
- editor 是怎么从 `store/workspace` 变成真实 DOM 的
- extension 是怎么被创建、合并并注册到 web component 里的
- 新增一个业务插件时应该往哪里写

阅读顺序：

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [INTEGRATION.md](./INTEGRATION.md)
3. [MOUNTING.md](./MOUNTING.md)
4. [PLUGINS.md](./PLUGINS.md)

源码入口：

- [createBlocksuiteEditor.browser.ts](../../editors/createBlocksuiteEditor.browser.ts)
- [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
- [blocksuiteEditorAssemblyContext.ts](../../editors/blocksuiteEditorAssemblyContext.ts)
- [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts)
- [extensions/](../../editors/extensions)
