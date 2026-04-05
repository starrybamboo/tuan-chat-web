import type { DocMode } from "@blocksuite/affine/model";
import type { BlocksuiteDescriptionEditorProps } from "./blocksuiteDescriptionEditor.shared";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { startBlocksuiteOpenSession } from "@/components/chat/infra/blocksuite/shared/perf";
import { BlocksuiteFrameSkeleton } from "./BlocksuiteFrameSkeleton";
import { BlocksuiteMentionProfilePopover } from "./blocksuiteMentionProfilePopover";
import { useBlocksuiteFrameBridge } from "./useBlocksuiteFrameBridge";
import { useBlocksuiteFrameInit } from "./useBlocksuiteFrameInit";
import { useBlocksuiteFrameThemeSync } from "./useBlocksuiteFrameThemeSync";
import { useBlocksuiteMentionProfilePopover } from "./useBlocksuiteMentionProfilePopover";

/**
 * 宿主侧的 Blocksuite iframe host。
 *
 * 主文件现在只负责：
 * 1. 组合各个 host hook
 * 2. 管理少量顶层状态（mode / ready）
 * 3. 渲染 skeleton、popover 与 iframe
 */
function BlocksuiteDescriptionEditorIframeHost(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    intentPrewarm = false,
    mode: forcedMode = "page",
    readOnly = false,
    allowModeSwitch = false,
    fullscreenEdgeless = false,
    tcHeader,
    onTcHeaderChange,
    className,
    onModeChange,
    onNavigate,
  } = props;

  const navigate = useNavigate();
  const instanceId = useId();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [frameMode, setFrameMode] = useState<DocMode>(forcedMode);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [hasFrameReadyOnce, setHasFrameReadyOnce] = useState(false);

  void intentPrewarm;

  // 埋点：打开编辑器时触发，记录 workspaceId、docId 和 variant 以分析不同场景的打开速度表现
  useEffect(() => {
    startBlocksuiteOpenSession({
      instanceId,
      workspaceId,
      docId,
      variant: "full",
    });
  }, [docId, instanceId, workspaceId]);

  const isEdgelessFullscreenActive = allowModeSwitch && fullscreenEdgeless && frameMode === "edgeless";

  // mention profile popover 相关逻辑
  const mention = useBlocksuiteMentionProfilePopover({
    navigate,
    onNavigate,
  });

  // “给 BlockSuite iframe 准备初始化参数和样式参数”的整理器，主要把外部传入的状态加工成一组稳定、可直接给 iframe / 包裹层使用的数据。
  const frameInit = useBlocksuiteFrameInit({
    instanceId,
    workspaceId,
    spaceId,
    docId,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
    tcHeader,
    className,
    isEdgelessFullscreenActive,
    isFrameReady,
    hasFrameReadyOnce,
  });

  // 负责在宿主页面与 BlockSuite iframe 之间同步参数、接收事件，并转发交互结果
  const bridge = useBlocksuiteFrameBridge({
    iframeRef,
    instanceId,
    workspaceId,
    spaceId,
    docId,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
    tcHeaderEnabled: frameInit.tcHeaderEnabled,
    frozenTcHeaderTitle: frameInit.frozenTcHeaderTitle,
    frozenTcHeaderImageUrl: frameInit.frozenTcHeaderImageUrl,
    navigate,
    onNavigate,
    onModeChange,
    onTcHeaderChange,
    setFrameMode,
    setIsFrameReady,
    handleMentionClickMessage: mention.handleMentionClickMessage,
    handleMentionHoverMessage: mention.handleMentionHoverMessage,
  });

  // 主题同步
  useBlocksuiteFrameThemeSync({
    iframeRef,
    instanceId,
  });

  // 当进入 edgeless 全屏模式时，禁止宿主页面滚动以避免滚动穿透
  useEffect(() => {
    if (typeof document === "undefined")
      return;
    if (!isEdgelessFullscreenActive)
      return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isEdgelessFullscreenActive]);

  // 当 docId 变化时，重置 ready 状态以显示 loading skeleton
  useEffect(() => {
    setIsFrameReady(false);
  }, [docId]);

  // 一旦 iframe ready 过一次，就算后续切 doc 了也不再显示 skeleton 了（除非再次切回初始 doc），以避免频繁切 doc 时的闪烁
  useEffect(() => {
    if (isFrameReady) {
      setHasFrameReadyOnce(true);
    }
  }, [isFrameReady]);

  return (
    <div className={frameInit.wrapperClassName}>
      <BlocksuiteFrameSkeleton
        visible={!hasFrameReadyOnce && !isFrameReady}
        hasExplicitHeightClass={frameInit.hasExplicitHeightClass}
      />
      <BlocksuiteMentionProfilePopover
        state={mention.mentionProfilePopover}
        onRequestClose={() => {
          mention.clearMentionProfilePopoverCloseTimer();
          mention.setMentionProfilePopover(null);
        }}
        onHoverChange={(hovered) => {
          mention.setMentionProfilePopoverHovered(hovered);
          if (hovered) {
            mention.clearMentionProfilePopoverCloseTimer();
          }
          else if (mention.mentionProfilePopover) {
            mention.scheduleMentionProfilePopoverClose();
          }
        }}
      />
      {/* Frame 页面需要脚本执行和同源访问；安全 sandbox 组合会直接破坏鉴权、本地存储与运行时。 */}
      {/* eslint-disable-next-line react-dom/no-missing-iframe-sandbox */}
      <iframe
        ref={iframeRef}
        src={frameInit.src}
        title="blocksuite-editor"
        className={frameInit.iframeClassName}
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
        style={{ backgroundColor: "transparent" }}
        onLoad={() => {
          bridge.postFrameParams();
          bridge.syncFrameBasics();
        }}
      />
    </div>
  );
}

export default function BlocksuiteDescriptionEditor(props: BlocksuiteDescriptionEditorProps) {
  return <BlocksuiteDescriptionEditorIframeHost {...props} />;
}
