## Context

Web 房间页同时显示消息流、聚合输入框、房间背景层和场景特效层。当前内联房间演出由 `ChatFrameList` 汇报当前消息索引，再由 `useChatFrameVisualEffects` 根据该索引前的消息推导背景、清背景和场景特效。

此前实现容易把虚拟列表的 `rangeChanged.endIndex` 当作当前消息，但 `react-virtuoso` 的可渲染范围会受到 overscan 和动态高度影响，不等同于用户视觉上已经读到的位置。聚合输入框上边缘是用户看到消息区的自然底线，也是在截图与产品语义中最稳定的“消息看完”判定线。

## Goals / Non-Goals

**Goals:**

- 用聚合输入框上边缘定义 Web 房间消息列表的演出已读线。
- 当消息底部越过演出已读线时，认为该消息已看完，可参与房间内联演出状态推导。
- 让背景、清背景和场景特效跟随已看完消息推进，避免受虚拟列表 overscan 尾部影响。
- 保持输入框高度变化、附件预览、回复提示、插入提示展开时判定线与真实输入框上边缘一致。

**Non-Goals:**

- 不改变服务端已读回执、未读数、`lastReadSyncId` 的语义。
- 不改变消息模型、消息发送 API、标注常量或媒体 URL 质量档位。
- 不改变 WebGAL 实时渲染器写场景脚本的历史渲染规则；该规则仍由 `docs/reference/webgal-realtime-render-rules.md` 维护。

## Decisions

1. **演出已读线绑定聚合输入框上边缘**

   判定线优先取当前房间 `RoomComposerPanel` 根节点的 `getBoundingClientRect().top`。这样输入框高度、附件预览和移动端布局变化都会自然反映到判定线位置。

   备选方案是继续使用消息滚动容器底边，但这会在输入框覆盖、浮层或布局调整时和用户视觉线不一致。

2. **消息看完判定使用消息 DOM 底部**

   对当前渲染出来的消息节点读取 `data-index` 和 `getBoundingClientRect().bottom`，取最后一个 `bottom <= lineTop` 的消息作为当前已看完索引。这样语义是“滑动到消息底部越过输入框上边缘，才算看完这条消息”。

   备选方案是使用可见范围中点或顶部索引，但它们都无法表达“底部越线才算看完”。

3. **找不到输入框时回退到消息滚动容器底边**

   副窗口、测试环境或未来不显示 composer 的只读场景可能没有聚合输入框。此时用消息滚动容器底边作为兼容回退，保证演出状态仍可推进。

4. **房间内联演出与 WebGAL 实时渲染保持分层**

   房间内联演出是“用户滚动到哪里，当前页面背景/特效显示到哪里”；WebGAL 实时渲染是“把房间历史写成 WebGAL 场景脚本”。二者都消费消息标注，但推进时机不同，不能混用同一个锚点。

## Risks / Trade-offs

- [Risk] DOM 几何读取发生在滚动期间，可能增加少量布局读取成本。 → Mitigation: 只在 Virtuoso 范围变化后按 `requestAnimationFrame` 合并读取，并限制查询在当前房间容器内。
- [Risk] 当前消息节点未渲染时无法被选为已看完消息。 → Mitigation: 使用当前可见范围起点作为 fallback；虚拟列表会保证判定线附近节点可渲染。
- [Risk] 多个房间/副窗口同时存在时选错 composer。 → Mitigation: 优先在当前消息列表最近的 `data-tc-doc-ref-drop-zone` 内查找 composer，再全局回退。
- [Risk] 以后调整 composer DOM 结构时丢失标记。 → Mitigation: 将 `data-chat-composer-root` 写入 spec 并补测试/维护说明。
