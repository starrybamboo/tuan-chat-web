# 04 iframe 和主线程的通信系统

## 核心结论

宿主和 BlockSuite runtime 之间的边界，是一套 `postMessage` 协议，不是 props 直传。

宿主负责：

- 创建 iframe
- 发参数
- 收状态
- 承接 iframe 外层 UI

iframe 负责：

- 真正的 editor runtime
- 高度回传
- 模式回传
- 导航请求
- mention / header 事件上抛

## 协议图

```mermaid
flowchart LR
    A[宿主] -->|postMessage| B[iframe]
    B -->|postMessage| A
```

## 1. 协议隔离

所有消息都带：

- `tc: "tc-blocksuite-frame"`
- `instanceId`

宿主还会校验：

- `origin`
- `source === iframe.contentWindow`
- `data.tc`
- `data.instanceId`

## 2. 宿主发给 iframe

主要是 3 类消息：

- `sync-params`
- `theme`
- `request-height`

用途分别是：

- 增量同步文档参数
- 同步主题
- 要求重新测量高度

## 3. iframe 回给宿主

主要消息：

- `ready`
- `render-ready`
- `height`
- `mode`
- `navigate`
- `mention-click`
- `mention-hover`
- `tc-header`

## 4. mention 为什么一定走宿主

自定义 [tcMentionElement.client.ts](../../spec/tcMentionElement.client.ts) 会把：

- `userId`
- `anchorRect`
- hover / click 状态

发给宿主。真正的 popover 在宿主侧渲染，这样才能稳稳覆盖 iframe。

## 5. 导航为什么也走宿主

编辑器内部知道目标 docId，但业务路由属于宿主应用。

因此 runtime 会发：

- `postMessage({ type: "navigate", to })`

宿主决定：

- 自己处理
- 或走默认 `navigate(to)`

## 关键文件

- [useBlocksuiteFrameBridge.ts](../../shared/components/BlockSuite/useBlocksuiteFrameBridge.ts)
- [BlocksuiteRouteFrameClient.tsx](../../BlocksuiteRouteFrameClient.tsx)
- [useBlocksuiteFrameThemeSync.ts](../../shared/components/BlockSuite/useBlocksuiteFrameThemeSync.ts)
- [useBlocksuiteTcHeaderSync.ts](../../useBlocksuiteTcHeaderSync.ts)
- [tcMentionElement.client.ts](../../spec/tcMentionElement.client.ts)
