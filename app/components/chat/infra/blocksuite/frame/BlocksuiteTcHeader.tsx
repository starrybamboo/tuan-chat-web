import type { DocMode } from "@blocksuite/affine/model";
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from "react";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { FileTextIcon } from "@phosphor-icons/react";
import { useCallback } from "react";
import { setBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";

type TcHeaderState = {
  docId: string;
  header: BlocksuiteDocHeader;
} | null;

type BlocksuiteTcHeaderProps = {
  docId: string;
  readOnly: boolean;
  allowModeSwitch: boolean;
  currentMode: DocMode;
  isBrowserFullscreen: boolean;
  canForcePullFromCloud: boolean;
  isForcePullingCloud: boolean;
  tcHeaderState: TcHeaderState;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
  storeRef: MutableRefObject<any>;
  onToggleBrowserFullscreen: () => void | Promise<void>;
  onForcePullFromCloud: () => void | Promise<void>;
  onToggleMode: () => void;
};

export function BlocksuiteTcHeader(props: BlocksuiteTcHeaderProps) {
  const {
    docId,
    readOnly,
    allowModeSwitch,
    currentMode,
    isBrowserFullscreen,
    canForcePullFromCloud,
    isForcePullingCloud,
    tcHeaderState,
    fallbackTitle,
    fallbackImageUrl,
    storeRef,
    onToggleBrowserFullscreen,
    onForcePullFromCloud,
    onToggleMode,
  } = props;

  const canEditTcHeader = !readOnly;
  const tcHeaderImageUrl = tcHeaderState?.header.imageUrl ?? fallbackImageUrl ?? "";
  const tcHeaderTitle = tcHeaderState?.header.title ?? fallbackTitle ?? "";
  const hasTcHeaderImage = Boolean(tcHeaderImageUrl.trim());

  const handleOpenTcHeaderImagePreview = useCallback(() => {
    const imageUrl = tcHeaderImageUrl.trim();
    if (!imageUrl)
      return;
    toastWindow(
      onClose => <ResizableImg src={imageUrl} onClose={onClose} />,
      {
        fullScreen: true,
        transparent: true,
      },
    );
  }, [tcHeaderImageUrl]);

  const handleTcHeaderImagePreviewKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ")
      return;
    event.preventDefault();
    handleOpenTcHeaderImagePreview();
  }, [handleOpenTcHeaderImagePreview]);

  return (
    <div className="tc-blocksuite-tc-header">
      <div className="tc-blocksuite-tc-header-inner">
        <div className="tc-blocksuite-tc-header-top">
          {canEditTcHeader
            ? (
                <ImgUploaderWithCopper
                  key={`tcHeader:${docId}`}
                  setCopperedDownloadUrl={(url) => {
                    const store = storeRef.current;
                    if (!store)
                      return;
                    setBlocksuiteDocHeader(store, { imageUrl: url });
                  }}
                  fileName={`blocksuite-header-${docId.replaceAll(":", "-")}`}
                  aspect={1}
                >
                  <div className={`tc-blocksuite-tc-header-avatar${hasTcHeaderImage ? "" : " tc-blocksuite-tc-header-avatar-empty"}`} aria-label="更换头像">
                    {hasTcHeaderImage
                      ? (
                          <img
                            src={tcHeaderImageUrl}
                            alt={tcHeaderTitle || "header"}
                            className="tc-blocksuite-tc-header-avatar-img"
                          />
                        )
                      : (
                          <div className="tc-blocksuite-tc-header-avatar-placeholder" aria-hidden="true">
                            <span className="tc-blocksuite-tc-header-avatar-placeholder-glyph">
                              <FileTextIcon className="tc-blocksuite-tc-header-avatar-placeholder-icon" weight="bold" />
                            </span>
                          </div>
                        )}
                    <div className="tc-blocksuite-tc-header-avatar-overlay">
                      <span className="tc-blocksuite-tc-header-avatar-overlay-text">更换</span>
                    </div>
                  </div>
                </ImgUploaderWithCopper>
              )
            : (
                <div
                  className={`tc-blocksuite-tc-header-avatar tc-blocksuite-tc-header-avatar-readonly${hasTcHeaderImage ? " tc-blocksuite-tc-header-avatar-previewable" : ""}${hasTcHeaderImage ? "" : " tc-blocksuite-tc-header-avatar-empty"}`}
                  role={hasTcHeaderImage ? "button" : undefined}
                  tabIndex={hasTcHeaderImage ? 0 : undefined}
                  aria-label={hasTcHeaderImage ? "查看封面大图" : undefined}
                  title={hasTcHeaderImage ? "点击查看大图" : undefined}
                  onClick={hasTcHeaderImage ? handleOpenTcHeaderImagePreview : undefined}
                  onKeyDown={hasTcHeaderImage ? handleTcHeaderImagePreviewKeyDown : undefined}
                >
                  {hasTcHeaderImage
                    ? (
                        <img
                          src={tcHeaderImageUrl}
                          alt={tcHeaderTitle || "header"}
                          className="tc-blocksuite-tc-header-avatar-img"
                        />
                      )
                    : (
                        <div className="tc-blocksuite-tc-header-avatar-placeholder" aria-hidden="true">
                          <span className="tc-blocksuite-tc-header-avatar-placeholder-glyph">
                            <FileTextIcon className="tc-blocksuite-tc-header-avatar-placeholder-icon" weight="bold" />
                          </span>
                        </div>
                      )}
                  {hasTcHeaderImage && (
                    <div className="tc-blocksuite-tc-header-avatar-overlay">
                      <span className="tc-blocksuite-tc-header-avatar-overlay-text">查看</span>
                    </div>
                  )}
                </div>
              )}

          <input
            className="tc-blocksuite-tc-header-title"
            value={tcHeaderTitle}
            disabled={!canEditTcHeader}
            placeholder="标题"
            onChange={(event) => {
              const store = storeRef.current;
              if (!store)
                return;
              setBlocksuiteDocHeader(store, { title: event.target.value });
            }}
            onBlur={(event) => {
              const store = storeRef.current;
              if (!store)
                return;
              setBlocksuiteDocHeader(store, { title: event.target.value.trim() });
            }}
          />

          <div className="tc-blocksuite-tc-header-actions">
            {currentMode === "edgeless"
              ? (
                  <button
                    type="button"
                    className="tc-blocksuite-tc-header-btn tc-blocksuite-tc-header-btn-ghost"
                    onClick={() => void onToggleBrowserFullscreen()}
                  >
                    {isBrowserFullscreen ? "退出全屏" : "全屏"}
                  </button>
                )
              : null}
            {canForcePullFromCloud
              ? (
                  <button
                    type="button"
                    className="tc-blocksuite-tc-header-btn tc-blocksuite-tc-header-btn-ghost"
                    disabled={isForcePullingCloud}
                    onClick={() => void onForcePullFromCloud()}
                  >
                    {isForcePullingCloud ? "拉取中..." : "云端覆盖"}
                  </button>
                )
              : null}
            {allowModeSwitch
              ? (
                  <button
                    type="button"
                    className="tc-blocksuite-tc-header-btn"
                    onClick={onToggleMode}
                  >
                    {currentMode === "page" ? "切换画布" : "退出画布"}
                  </button>
                )
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
