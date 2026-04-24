# Blocksuite 集成架构图

这份图面向“先看全局，再钻源码”的阅读方式，重点展示当前 BlockSuite 集成的 5 个层面：

- 宿主侧 iframe 入口与路由隔离
- frame 控制面与 runtime orchestrator
- editor 装配与业务扩展注入
- SpaceWorkspace 为核心的数据运行时
- 远端接口、本地存储与上游 BlockSuite 内核依赖

建议结合 [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md)、[DIRECTORY.md](./DIRECTORY.md) 和 [editor/ARCHITECTURE.md](./editor/ARCHITECTURE.md) 一起看。

<div style="width: 1420px; box-sizing: border-box; position: relative; background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%); padding: 24px; border-radius: 10px; border: 1px solid #dbe4f0; overflow: hidden;">
  <style scoped>
    .arch-title { text-align: center; font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: 0.02em; }
    .arch-subtitle { text-align: center; font-size: 12px; color: #475569; margin-bottom: 18px; }
    .arch-wrapper { display: flex; gap: 14px; align-items: flex-start; }
    .arch-sidebar { width: 196px; flex-shrink: 0; }
    .arch-main { flex: 1; min-width: 0; }
    .arch-layer { margin: 8px 0; padding: 14px; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05); position: relative; }
    .arch-layer-title { font-size: 13px; font-weight: 800; margin-bottom: 10px; text-align: center; letter-spacing: 0.04em; text-transform: uppercase; }
    .arch-grid { display: grid; gap: 8px; }
    .arch-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .arch-grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .arch-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .arch-box { border-radius: 8px; padding: 10px; text-align: center; font-size: 11px; font-weight: 700; line-height: 1.4; color: #0f172a; background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(148, 163, 184, 0.34); min-height: 56px; display: flex; flex-direction: column; justify-content: center; }
    .arch-box small { display: block; margin-top: 4px; font-size: 10px; font-weight: 500; color: #475569; line-height: 1.35; }
    .arch-box.highlight { background: #ffffff; border: 2px solid #334155; box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.18); }
    .arch-box.tech { font-size: 10px; font-weight: 600; }
    .arch-layer.user { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #3b82f6; }
    .arch-layer.user .arch-layer-title { color: #1d4ed8; }
    .arch-layer.application { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #f97316; }
    .arch-layer.application .arch-layer-title { color: #c2410c; }
    .arch-layer.ai { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; }
    .arch-layer.ai .arch-layer-title { color: #15803d; }
    .arch-layer.data { background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 2px solid #ec4899; }
    .arch-layer.data .arch-layer-title { color: #be185d; }
    .arch-layer.infra { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #64748b; }
    .arch-layer.infra .arch-layer-title { color: #334155; }
    .arch-layer.external { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #94a3b8; }
    .arch-layer.external .arch-layer-title { color: #475569; }
    .arch-sidebar-panel { border-radius: 10px; padding: 10px; background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(148, 163, 184, 0.35); margin-bottom: 10px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
    .arch-sidebar-title { font-size: 12px; font-weight: 800; text-align: center; color: #0f172a; margin-bottom: 8px; }
    .arch-sidebar-item { font-size: 10px; text-align: center; color: #334155; background: #ffffff; padding: 6px; border-radius: 7px; margin: 4px 0; border: 1px solid rgba(148, 163, 184, 0.28); line-height: 1.35; }
    .arch-sidebar-item.metric { background: linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%); border: 1px solid #38bdf8; color: #0f172a; font-weight: 700; }
    .arch-product-group { display: flex; gap: 10px; }
    .arch-product { flex: 1; border-radius: 8px; padding: 10px; background: rgba(255, 255, 255, 0.56); border: 1px dashed rgba(71, 85, 105, 0.4); }
    .arch-product-title { font-size: 11px; font-weight: 800; color: #1e293b; margin-bottom: 8px; text-align: center; }
    .arch-subgroup { display: flex; gap: 8px; margin-top: 8px; }
    .arch-subgroup-box { flex: 1; border-radius: 8px; padding: 8px; background: rgba(255, 255, 255, 0.58); border: 1px solid rgba(148, 163, 184, 0.26); }
    .arch-subgroup-title { font-size: 10px; font-weight: 800; color: #334155; text-align: center; margin-bottom: 6px; }
    .arch-user-types { display: flex; gap: 4px; justify-content: center; margin-top: 8px; flex-wrap: wrap; }
    .arch-user-tag { font-size: 9px; padding: 3px 7px; border-radius: 999px; background: rgba(59, 130, 246, 0.14); color: #1d4ed8; font-weight: 700; }
    .arch-conn { stroke: #64748b; stroke-width: 1.5; fill: none; }
    .arch-conn-dashed { stroke: #94a3b8; stroke-width: 1.5; fill: none; stroke-dasharray: 6 4; }
    .arch-conn-label { font-size: 9px; fill: #475569; font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
  <div class="arch-title">Blocksuite 集成架构图</div>
  <div class="arch-subtitle">宿主 iframe、frame 控制面、editor 装配、SpaceWorkspace 数据运行时，以及外部服务与本地存储的关系</div>
  <div style="position: relative;">
    <div class="arch-wrapper">
      <div class="arch-sidebar">
        <div class="arch-sidebar-panel"><div class="arch-sidebar-title">宿主侧入口</div><div class="arch-sidebar-item">blocksuiteDescriptionEditor.tsx<br><small>iframe host + skeleton + 主题同步</small></div><div class="arch-sidebar-item">useBlocksuiteFrameBridge<br><small>postMessage、导航、mode、tcHeader</small></div><div class="arch-sidebar-item">blocksuiteMentionProfilePopover.tsx<br><small>宿主层渲染的 mention 卡片</small></div></div>
        <div class="arch-sidebar-panel"><div class="arch-sidebar-title">关键流程</div><div class="arch-sidebar-item metric">冷启动：host -> frame -> runtime -> store -> editor</div><div class="arch-sidebar-item metric">实时协作：WS join / push / ack / awareness</div><div class="arch-sidebar-item metric">离线恢复：IndexedDB updates + snapshot 合并</div></div>
        <div class="arch-sidebar-panel"><div class="arch-sidebar-title">横切辅助</div><div class="arch-sidebar-item">warmFrame / perf / debugFlags</div><div class="arch-sidebar-item">document/docHeader + docExcerpt</div><div class="arch-sidebar-item">shared/frameProtocol + frameSrc</div></div>
      </div>
      <div class="arch-main">
        <div class="arch-layer user">
          <div class="arch-layer-title">User / Host Layer</div>
          <div class="arch-grid arch-grid-4"><div class="arch-box">聊天页 / DocCard<br><small>React 页面内嵌文档入口</small></div><div class="arch-box highlight">宿主 iframe Host<br><small>blocksuiteDescriptionEditor.tsx</small></div><div class="arch-box">/blocksuite-frame Route<br><small>app/routes/blocksuiteFrame.tsx</small></div><div class="arch-box">独立 mention / 导航 UI<br><small>必须与 iframe 并列渲染</small></div></div>
          <div class="arch-user-types"><span class="arch-user-tag">阅读模式</span><span class="arch-user-tag">编辑模式</span><span class="arch-user-tag">Page / Edgeless</span><span class="arch-user-tag">Fullscreen</span></div>
        </div>
        <div class="arch-layer application">
          <div class="arch-layer-title">Frame Control Plane</div>
          <div class="arch-product-group">
            <div class="arch-product">
              <div class="arch-product-title">路由与协议</div>
              <div class="arch-grid arch-grid-2"><div class="arch-box highlight">BlocksuiteRouteFrameClient.tsx<br><small>frame 子图入口 + bootstrap 壳层</small></div><div class="arch-box">useBlocksuiteFrameProtocol.ts<br><small>query 解析、ready 握手、消息校验</small></div></div>
            </div>
            <div class="arch-product">
              <div class="arch-product-title">运行时编排</div>
              <div class="arch-grid arch-grid-2"><div class="arch-box highlight">BlocksuiteDescriptionEditorRuntime.browser.tsx<br><small>唯一 orchestrator</small></div><div class="arch-box">BlocksuiteTcHeader.tsx<br><small>标题、封面、模式按钮、云端覆盖</small></div></div>
            </div>
          </div>
          <div class="arch-subgroup">
            <div class="arch-subgroup-box"><div class="arch-subgroup-title">状态与生命周期 Hook</div><div class="arch-grid arch-grid-3"><div class="arch-box tech">useBlocksuiteDocModeProvider</div><div class="arch-box tech">useBlocksuiteEditorLifecycle</div><div class="arch-box tech">blocksuiteEditorLifecycleHydration</div><div class="arch-box tech">useBlocksuiteEditorModeSync</div><div class="arch-box tech">useBlocksuiteViewportBehavior</div><div class="arch-box tech">useBlocksuiteTcHeaderSync</div></div></div>
            <div class="arch-subgroup-box"><div class="arch-subgroup-title">启动前置</div><div class="arch-grid arch-grid-2"><div class="arch-box tech">bootstrap/browser.ts<br><small>样式、custom elements、effects</small></div><div class="arch-box tech">spec/coreElements.browser.ts<br><small>BlockSuite 核心元素注册</small></div></div></div>
          </div>
        </div>
        <div class="arch-layer ai">
          <div class="arch-layer-title">Editor Assembly / Logic Layer</div>
          <div class="arch-product-group">
            <div class="arch-product">
              <div class="arch-product-title">Runtime Loader 与能力收口</div>
              <div class="arch-grid arch-grid-2"><div class="arch-box">runtimeLoader.browser.ts<br><small>统一暴露 workspace / doc / editor 能力</small></div><div class="arch-box">spaceWorkspaceRegistry.ts<br><small>Space 业务语义到 runtime 窄接口</small></div></div>
            </div>
            <div class="arch-product">
              <div class="arch-product-title">Editor 创建</div>
              <div class="arch-grid arch-grid-2"><div class="arch-box highlight">createBlocksuiteEditor.client.ts<br><small>总装入口：bundle、style、navigation</small></div><div class="arch-box">tcAffineEditorContainer.ts<br><small>BlockStdScope.render() 真正产出 editor DOM</small></div></div>
            </div>
          </div>
          <div class="arch-subgroup">
            <div class="arch-subgroup-box"><div class="arch-subgroup-title">Manager / Spec</div><div class="arch-grid arch-grid-3"><div class="arch-box tech">manager/store.ts</div><div class="arch-box tech">manager/view.ts</div><div class="arch-box tech">manager/featureSet.ts</div><div class="arch-box tech">spec/tcMentionElement.client.ts</div><div class="arch-box tech">spec/roomMapEmbedConfig.ts</div><div class="arch-box tech">styles/frameBase.css + tcHeader.css</div></div></div>
            <div class="arch-subgroup-box"><div class="arch-subgroup-title">Extension Builders</div><div class="arch-grid arch-grid-4"><div class="arch-box tech">coreEditorExtensions</div><div class="arch-box tech">mentionExtensions</div><div class="arch-box tech">linkedDocExtensions</div><div class="arch-box tech">embedExtensions</div></div></div>
          </div>
        </div>
        <div class="arch-layer data">
          <div class="arch-layer-title">SpaceWorkspace Data Runtime</div>
          <div class="arch-grid arch-grid-3"><div class="arch-box highlight">space/runtime/spaceWorkspace.ts<br><small>root Y.Doc -> subdoc -> Store 的核心数据底座</small></div><div class="arch-box">RemoteSnapshotDocSource<br><small>snapshot / updates 合并、compaction、离线 flush</small></div><div class="arch-box">blocksuiteWsClient.ts<br><small>join / leave / update / awareness / ack</small></div></div>
          <div class="arch-subgroup">
            <div class="arch-subgroup-box"><div class="arch-subgroup-title">本地与元信息</div><div class="arch-grid arch-grid-3"><div class="arch-box tech">descriptionDocDb.ts<br><small>IndexedDB updates 队列</small></div><div class="arch-box tech">spaceDocMetaPersistence.ts<br><small>doc meta 本地缓存</small></div><div class="arch-box tech">InMemoryWorkspaceMeta<br><small>title / tags / createDate</small></div></div></div>
            <div class="arch-subgroup-box"><div class="arch-subgroup-title">BlockSuite 底层对象</div><div class="arch-grid arch-grid-3"><div class="arch-box tech">Y.Doc / subdoc / blocks map</div><div class="arch-box tech">DocEngine + BlobEngine</div><div class="arch-box tech">IndexedDBDocSource + AwarenessStore</div></div></div>
          </div>
        </div>
        <div class="arch-layer external">
          <div class="arch-layer-title">External Services / Upstream Dependencies</div>
          <div class="arch-grid arch-grid-4"><div class="arch-box tech">TuanChat REST API<br><small>spaceRole / roomNpcRole / room 列表 / 文档 snapshot & updates</small></div><div class="arch-box tech">TuanChat WebSocket<br><small>文档 update fanout、ack、awareness、token 恢复</small></div><div class="arch-box tech">浏览器能力<br><small>IndexedDB、localStorage、fullscreen、iframe</small></div><div class="arch-box tech">@blocksuite/* + Yjs<br><small>store、std、sync、affine、widgets、lit</small></div></div>
        </div>
      </div>
      <div class="arch-sidebar">
        <div class="arch-sidebar-panel"><div class="arch-sidebar-title">业务扩展服务</div><div class="arch-sidebar-item">blocksuiteRoleService.ts<br><small>NPC 角色 mention 列表</small></div><div class="arch-sidebar-item">blocksuiteSpaceMemberService.ts<br><small>成员筛选与预取</small></div><div class="arch-sidebar-item">blocksuiteRoomService.ts<br><small>空间内房间文档过滤</small></div><div class="arch-sidebar-item">quickSearchService / tuanChatUserService</div></div>
        <div class="arch-sidebar-panel"><div class="arch-sidebar-title">边界与约束</div><div class="arch-sidebar-item metric">根层只保留 frame 接入链路</div><div class="arch-sidebar-item metric">业务能力通过 extension builder 注入</div><div class="arch-sidebar-item metric">SpaceWorkspace 封装 Yjs 与远端同步细节</div></div>
        <div class="arch-sidebar-panel"><div class="arch-sidebar-title">典型读图顺序</div><div class="arch-sidebar-item">1. host 与 route 如何隔离</div><div class="arch-sidebar-item">2. runtime 如何拼装 editor</div><div class="arch-sidebar-item">3. mention / linked doc 如何接业务</div><div class="arch-sidebar-item">4. snapshot / ws / IndexedDB 如何协同</div></div>
      </div>
    </div>
    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;">
      <defs>
        <marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="none" stroke="#64748b" stroke-width="1"/>
        </marker>
      </defs>
      <path d="M 408,108 L 408,126 L 705,126 L 705,154" class="arch-conn" marker-end="url(#arch-arrow)"/>
      <path d="M 705,254 L 705,274 L 705,274 L 705,322" class="arch-conn" marker-end="url(#arch-arrow)"/>
      <path d="M 705,440 L 705,458 L 705,458 L 705,518" class="arch-conn" marker-end="url(#arch-arrow)"/>
      <path d="M 614,356 L 614,376 L 482,376 L 482,602" class="arch-conn-dashed" marker-end="url(#arch-arrow)"/>
      <path d="M 801,356 L 801,376 L 944,376 L 944,602" class="arch-conn-dashed" marker-end="url(#arch-arrow)"/>
      <path d="M 482,640 L 482,662 L 482,662 L 482,726" class="arch-conn" marker-end="url(#arch-arrow)"/>
      <path d="M 944,640 L 944,662 L 944,662 L 944,726" class="arch-conn" marker-end="url(#arch-arrow)"/>
      <text x="520" y="121" class="arch-conn-label">host bridge / route isolate</text>
      <text x="724" y="266" class="arch-conn-label">lifecycle orchestration</text>
      <text x="724" y="468" class="arch-conn-label">workspace / doc runtime</text>
      <text x="438" y="366" class="arch-conn-label">editor create</text>
      <text x="962" y="366" class="arch-conn-label">service inject</text>
      <text x="500" y="655" class="arch-conn-label">snapshot / updates</text>
      <text x="962" y="655" class="arch-conn-label">ws realtime</text>
    </svg>
  </div>
</div>

## 图例说明

- `User / Host Layer` 表示 React 宿主页面与 iframe 页面之间的边界。
- `Frame Control Plane` 表示 `/blocksuite-frame` 内负责协议、参数桥接和运行时编排的部分。
- `Editor Assembly / Logic Layer` 表示如何把 runtime、manager、spec 和业务 extension 组装成真正的 editor DOM。
- `SpaceWorkspace Data Runtime` 表示本项目对 BlockSuite/Yjs 运行时的封装，不让上层直接接触 Y.Doc 与同步细节。
- `External Services / Upstream Dependencies` 表示真正的外部接口和上游内核依赖。
