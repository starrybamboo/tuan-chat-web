import type { DocMode } from "@blocksuite/affine/model";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BlocksuiteMentionProfilePopover } from "@/components/chat/infra/blocksuite/mentionProfilePopover";
import { startBlocksuiteOpenSession } from "@/components/chat/infra/blocksuite/perf";
import { BlocksuiteFrameSkeleton } from "./BlocksuiteFrameSkeleton";
import type { BlocksuiteDescriptionEditorProps } from "./blocksuiteDescriptionEditor.shared";
import { useBlocksuiteFrameBridge } from "./useBlocksuiteFrameBridge";
import { useBlocksuiteFrameInit } from "./useBlocksuiteFrameInit";
import { useBlocksuiteFrameThemeSync } from "./useBlocksuiteFrameThemeSync";
import { useBlocksuiteMentionProfilePopover } from "./useBlocksuiteMentionProfilePopover";

/**
 * 宿主侧的 Blocksuite iframe host。
 *
 * 主文件现在只负责：
 * 1. 组合各个 host hook
 * 2. 管理少量顶层状态（mode / height / ready）
 * 3. 渲染 skeleton、popover 与 iframe
 */
function BlocksuiteDescriptionEditorIframeHost(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId,
    spaceId,
    docId,
    variant = "embedded",
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
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [hasFrameReadyOnce, setHasFrameReadyOnce] = useState(false);

  void intentPrewarm;

  useEffect(() => {
    startBlocksuiteOpenSession({
      instanceId,
      workspaceId,
      docId,
      variant,
    });
  }, [docId, instanceId, variant, workspaceId]);

  const isEdgelessFullscreenActive = allowModeSwitch && fullscreenEdgeless && frameMode === "edgeless";

  const mention = useBlocksuiteMentionProfilePopover({
    navigate,
    onNavigate,
  });

  const frameInit = useBlocksuiteFrameInit({
    instanceId,
    workspaceId,
    spaceId,
    docId,
    variant,
    readOnly,
    allowModeSwitch,
    fullscreenEdgeless,
    forcedMode,
    tcHeader,
    className,
    isEdgelessFullscreenActive,
    iframeHeight,
    isFrameReady,
    hasFrameReadyOnce,
  });

  const bridge = useBlocksuiteFrameBridge({
    iframeRef,
    instanceId,
    workspaceId,
    spaceId,
    docId,
    variant,
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
    setIframeHeight,
    setIsFrameReady,
    handleMentionClickMessage: mention.handleMentionClickMessage,
    handleMentionHoverMessage: mention.handleMentionHoverMessage,
  });

  useBlocksuiteFrameThemeSync({
    iframeRef,
    instanceId,
  });

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

  useEffect(() => {
    setIsFrameReady(false);
  }, [docId]);

  useEffect(() => {
    if (isFrameReady) {
      setHasFrameReadyOnce(true);
    }
  }, [isFrameReady]);

  return (
    <div className={frameInit.wrapperClassName}>
      <BlocksuiteFrameSkeleton
        visible={!hasFrameReadyOnce && !isFrameReady}
        variant={variant}
        iframeHeightAttr={frameInit.iframeHeightAttr}
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
      <iframe
        ref={iframeRef}
        src={frameInit.src}
        title="blocksuite-editor"
        className={frameInit.iframeClassName}
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
        height={frameInit.iframeHeightAttr}
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
