# Blocksuite 业务能力接入

本文档说明两件事：

- 上游 Blocksuite / AFFiNE 提供了什么
- 本仓库如何把业务能力接进 editor，以及后续应该如何新增一个业务插件

## 1. 上游提供什么

上游主要提供的是通用编辑器内核，而不是 TuanChat 业务编辑器。

这里真正被复用的是：

- 文档模型与 block tree
- `page / edgeless` 两种模式
- `BlockStdScope` 渲染宿主
- `ExtensionType` 扩展体系
- 若干官方 extension / widget / service token

在本仓库里，上游能力最终会被送进：

- [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts)

关键调用是：

```ts
new BlockStdScope({
  store: this.doc,
  extensions: this._specs.value,
})
```

也就是说，上游真正吃进去的是：

- `store`
- `extensions`

## 2. 本仓库补了什么

本仓库补的是“业务适配层”，让通用 editor 变成能在聊天文档场景里运行的 editor。

主要分成四块：

- `runtime/`
  负责 workspace、doc source、同步、snapshot、loader
- `editors/`
  负责创建 editor web component，并把 extension 装进 editor
- `services/`
  负责业务数据访问与业务服务桥接
- `frame/`
  负责 iframe 宿主协议、启动链路和运行时编排

## 3. 当前 editor 装配调用链

当前正式调用链是：

- [useBlocksuiteEditorLifecycle.ts](../../frame/useBlocksuiteEditorLifecycle.ts)
  -> [runtimeLoader.browser.ts](../../runtime/runtimeLoader.browser.ts)
  -> [createBlocksuiteEditor.browser.ts](../../editors/createBlocksuiteEditor.browser.ts)
  -> [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
  -> [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts)

其中：

- [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
  只负责 orchestration
- 真正的业务能力装配，已经收口到：
  - [extensions/](../../editors/extensions)
- 更完整的 editor 专区文档看：
  - [README.md](./README.md)
  - [ARCHITECTURE.md](./ARCHITECTURE.md)
  - [PLUGINS.md](./PLUGINS.md)
  - [MOUNTING.md](./MOUNTING.md)

## 4. extension 是怎么接进 editor 的

每个业务能力最后都要变成 `ExtensionType`，或者变成一组能参与 `pageSpecs / edgelessSpecs` 的 extension。

当前接入过程固定是：

1. 在 `editors/extensions/` 里创建 builder
2. builder 返回 `BlocksuiteExtensionBundle`
3. [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts) 调用多个 builder
4. 用 `mergeBlocksuiteExtensionBundles(...)` 合并
5. 把合并后的结果挂到：
   - `editor.pageSpecs`
   - `editor.edgelessSpecs`
6. [tcAffineEditorContainer.ts](../../editors/tcAffineEditorContainer.ts) 内部把这些 specs 交给 `BlockStdScope`

## 5. 统一的插件协议

现在 `extensions/` 层统一使用：

- [types.ts](../../editors/extensions/types.ts)

核心类型是：

```ts
type BlocksuiteExtensionBundle<TApi = undefined> = {
  sharedExtensions?: ExtensionType[]
  pageExtensions?: ExtensionType[]
  edgelessExtensions?: ExtensionType[]
  disposers?: Array<() => void>
  api?: TApi
}
```

含义：

- `sharedExtensions`
  page 和 edgeless 都会装
- `pageExtensions`
  只装到 page
- `edgelessExtensions`
  只装到 edgeless
- `disposers`
  editor 销毁时需要清理的副作用
- `api`
  提供给其他 builder 或装配入口消费的辅助接口

`api` 的用途不是给上游 Blocksuite 用，而是给本仓库内部 builder 协作用。

当前例子：

- [buildBlocksuiteMentionExtensions.ts](../../editors/extensions/buildBlocksuiteMentionExtensions.ts)
  通过 `api.getMentionMenuGroup` 暴露 mention 菜单能力
- [buildBlocksuiteLinkedDocExtensions.ts](../../editors/extensions/buildBlocksuiteLinkedDocExtensions.ts)
  再把这个能力接进 linked-doc 菜单系统

## 6. 目录职责

### [editors/](../../editors)

只放 editor 装配核心：

- 浏览器边界
- client 侧 orchestration
- editor 实例上下文
- web component 容器
- 最小宿主 mock service

### [editors/extensions/](../../editors/extensions)

只放业务扩展装配逻辑：

- core extension builder
- quick search extension builder
- mention extension builder
- linked-doc extension builder
- embed extension builder
- 标题读取 / meta 同步等和 extension 强关联的辅助模块
- bundle 类型

### [services/](../../services)

只放业务服务与数据访问，不直接装 editor。

统一规则：

- service 负责拿数据
- extension builder 负责把业务能力装进 Blocksuite

## 7. 新增一个业务插件的标准步骤

如果后续要新增业务插件，统一按这套流程：

### 第一步：先判断是否需要业务 service

如果插件需要请求业务数据，先在：

- [services/](../../services)

里新增 service / helper。

不要直接在 builder 里写 `tuanchat.xxxController`。

### 第二步：在 `editors/extensions/` 新建 builder

命名建议：

- `buildBlocksuiteXxxExtension.ts`

例如：

- `buildBlocksuiteDocTagExtension.ts`

### 第三步：builder 返回 `BlocksuiteExtensionBundle`

推荐形态：

```ts
export function buildBlocksuiteXxxExtension(
  context: BlocksuiteEditorAssemblyContext,
): BlocksuiteExtensionBundle {
  return {
    sharedExtensions: [
      SomeBlocksuiteExtension({...}),
    ],
  };
}
```

如果需要和其他 builder 协作，再通过 `api` 暴露内部能力。

### 第四步：在 `createBlocksuiteEditor.client.ts` 里接入

统一做法：

```ts
const xxx = buildBlocksuiteXxxExtension(context)

const merged = mergeBlocksuiteExtensionBundles(
  core,
  xxx,
  ...
)
```

不要手工散落地拼各种 `sharedExtensions`、`edgelessExtensions`。

### 第五步：补测试

测试放在：

- [test/](../../test)

优先补 builder 级测试，而不是直接依赖真实 DOM。

## 8. 当前已有的业务插件

### Core

- [buildBlocksuiteCoreEditorExtensions.ts](../../editors/extensions/buildBlocksuiteCoreEditorExtensions.ts)

负责：

- mode provider override
- link preview provider override
- editor setting
- parse doc url
- doc title 过滤

### Quick Search

- [buildBlocksuiteQuickSearchExtension.ts](../../editors/extensions/buildBlocksuiteQuickSearchExtension.ts)
- [blocksuiteQuickSearchPicker.ts](../../editors/extensions/blocksuiteQuickSearchPicker.ts)

负责：

- quick search extension 接入
- `service` 适配层在 [quickSearchService.ts](../../services/quickSearchService.ts)
- picker DOM 控制器放在 extension 目录内部，不再留在 `services/`

### Mention

- [buildBlocksuiteMentionExtensions.ts](../../editors/extensions/buildBlocksuiteMentionExtensions.ts)

负责：

- 用户服务接入
- mention 菜单
- mention 插入
- mention 锁与去重

### Linked Doc

- [buildBlocksuiteLinkedDocExtensions.ts](../../editors/extensions/buildBlocksuiteLinkedDocExtensions.ts)

负责：

- linked-doc 菜单
- 标题读取
- room doc 过滤
- doc link 导航

### Embed

- [buildBlocksuiteEmbedExtensions.ts](../../editors/extensions/buildBlocksuiteEmbedExtensions.ts)

负责：

- room map embed option
- no-credentialless iframe view override
- edgeless embed synced-doc header

## 9. 不要这样做

- 不要在 `createBlocksuiteEditor.client.ts` 里直接堆业务逻辑
- 不要在 builder 里直接打业务 API，先抽到 `services/`
- 不要把普通 helper 也硬拆成单独文件，只有语义独立的模块才值得拆
- 不要让不同 builder 各自发明一套返回结构，统一走 `BlocksuiteExtensionBundle`

## 10. 推荐阅读顺序

1. [../architecture/EDITORS.md](../architecture/EDITORS.md)
2. [../frame/DEEP-DIVE.md](../frame/DEEP-DIVE.md)
3. [createBlocksuiteEditor.client.ts](../../editors/createBlocksuiteEditor.client.ts)
4. [extensions/types.ts](../../editors/extensions/types.ts)
5. 具体 builder 文件
