# 04 iframe 和主线程的通信系统

## 核心结论

宿主和 BlockSuite runtime 之间的边界，是一套 `postMessage` 协议，不是 props 直传。

宿主负责：

- 创建 iframe
- 发参数
- 收状态
- 承接 iframe 外层 UI
- 作为 host adapter 做协议校验和宿主副作用分发

iframe 负责：

- 真正的 editor runtime
- 模式回传
- 导航请求
- mention / header 事件上抛
- 由 frame adapter 承接 query、消息协议和 runtime 参数桥接

编辑器内部还保留一层 runtime emitters：

- `navigate`
- `tc-header`
- `mention-click`
- `mention-hover`

这些事件允许在 runtime 或局部控件里就近发出，但都必须走同一套协议 envelope。

## 通信全景图

```mermaid
flowchart TB
        subgraph Host[宿主应用]
            HostView[blocksuiteDescriptionEditor.tsx]
            HostBridge[useBlocksuiteFrameBridge.ts]
            HostUI[路由 跳转 mention popover tcHeader side effects]
        end

        subgraph Frame[iframe 内]
            FrameEntry[BlocksuiteRouteFrameClient.tsx]
            FrameProtocol[useBlocksuiteFrameProtocol.ts]
            Runtime[BlocksuiteDescriptionEditorRuntime.browser.tsx]
            Lifecycle[useBlocksuiteEditorLifecycle.ts]
        end

        subgraph DataPlane[文档同步层]
            Workspace[spaceWorkspace.ts]
            RemoteSource[remoteDocSource.ts]
            WsClient[blocksuiteWsClient.ts]
            LocalQueue[IndexedDB updates queue]
        end

        subgraph Backend[服务端]
            HttpApi[HTTP snapshot updates API]
            WsGateway[WebSocket 网关]
        end

        HostView --> HostBridge
        HostBridge -->|postMessage sync-params theme| FrameProtocol
        FrameProtocol -->|postMessage ready render-ready mode navigate mention tc-header| HostBridge
        HostBridge --> HostUI

        FrameEntry --> FrameProtocol --> Runtime --> Lifecycle --> Workspace
        Workspace --> RemoteSource

        RemoteSource -->|pull snapshot updates| HttpApi
        HttpApi -->|snapshot updates diff| RemoteSource

        RemoteSource -->|WS open: tryPushUpdateIfOpen| WsClient
        WsClient -->|join leave push awareness| WsGateway
        WsGateway -->|doc update fanout| WsClient
        WsClient -->|onUpdate subscribe| RemoteSource

        RemoteSource -->|WS 不可用时暂存| LocalQueue
        LocalQueue -->|恢复后 flushOfflineUpdates| HttpApi
```

## 关键时序图

```mermaid
sequenceDiagram
        participant User as 用户
        participant Host as 宿主
        participant Frame as iframe 协议层
        participant Runtime as 编辑器 runtime
        participant Remote as remoteDocSource
        participant WS as blocksuiteWsClient
        participant WSG as WebSocket 网关
        participant HTTP as Snapshot Updates API

        User->>Host: 打开文档
        Host->>Frame: 加载 iframe + query 参数
        Frame-->>Host: ready
        Host-->>Frame: sync-params + theme
        Frame->>Runtime: 启动并注入参数

        Runtime->>Remote: pull(docId, stateVector)
        Remote->>HTTP: GET snapshot + updates
        HTTP-->>Remote: 返回快照与增量
        Remote-->>Runtime: diff update

        Runtime->>WS: joinDoc
        WS->>WSG: JOIN room

        User->>Runtime: 编辑文档
        Runtime->>Remote: push(update)

        alt WS 已连接
            Remote->>WS: tryPushUpdateIfOpen
            WS->>WSG: PUSH_UPDATE
            WSG-->>WS: UPDATE_ACK
            WSG-->>WS: DOC_UPDATE fanout
            WS-->>Remote: onUpdate(update)
            Remote-->>Runtime: apply remote update
        else WS 未连接
            Remote->>Remote: addUpdate 到 IndexedDB
            Remote->>HTTP: 后台 flushOfflineUpdates
            HTTP-->>Remote: 写入成功
        end

        Runtime-->>Host: mode navigate mention-hover mention-click tc-header render-ready
        Host->>Host: 路由跳转 弹层渲染 头图状态同步
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

iframe 侧现在也会校验：

- `origin`
- `source === window.parent`
- `data.tc`
- `data.instanceId`

## 2. 宿主发给 iframe

主要是 2 类消息：

- `sync-params`
- `theme`

用途分别是：

- 增量同步文档参数
- 同步主题

## 3. iframe 回给宿主

主要消息：

- `ready`
- `render-ready`
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
- [shared/frameProtocol.ts](../../shared/frameProtocol.ts)
- [BlocksuiteRouteFrameClient.tsx](../../BlocksuiteRouteFrameClient.tsx)
- [useBlocksuiteFrameProtocol.ts](../../useBlocksuiteFrameProtocol.ts)
- [useBlocksuiteFrameThemeSync.ts](../../shared/components/BlockSuite/useBlocksuiteFrameThemeSync.ts)
- [useBlocksuiteTcHeaderSync.ts](../../useBlocksuiteTcHeaderSync.ts)
- [tcMentionElement.client.ts](../../spec/tcMentionElement.client.ts)
