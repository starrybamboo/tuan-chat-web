import type { DocMode } from "@blocksuite/affine/model";
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import type { BlocksuiteTcHeaderState } from "./blocksuiteRuntimeTypes";
import { FileTextIcon } from "@phosphor-icons/react";
import { useCallback, useMemo } from "react";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { setBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { imageMediumUrl, imageMediumUrlFromUrl } from "@/utils/mediaUrl";

interface BlocksuiteTcHeaderProps {
  docId: string;
  readOnly: boolean;
  allowModeSwitch: boolean;
  currentMode: DocMode;
  isBrowserFullscreen: boolean;
  canForcePullFromCloud: boolean;
  isForcePullingCloud: boolean;
  tcHeaderState: BlocksuiteTcHeaderState;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
  storeRef: RefObject<any>;
  onToggleBrowserFullscreen: () => void | Promise<void>;
  onForcePullFromCloud: () => void | Promise<void>;
  onToggleMode: () => void;
}

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
  const tcHeaderDisplayImageUrl = imageMediumUrl(tcHeaderState?.header.imageFileId) || imageMediumUrlFromUrl(tcHeaderImageUrl);
  const tcHeaderTitle = tcHeaderState?.header.title ?? fallbackTitle ?? "";
  const hasTcHeaderImage = Boolean(tcHeaderDisplayImageUrl || tcHeaderImageUrl.trim());
  const copperedCompressionPreset = useMemo(() => {
    const parsed = parseDescriptionDocId(docId);
    return parsed && ["space", "room", "space_user_doc", "space_doc"].includes(parsed.entityType) ? "avatarThumb" : undefined;
  }, [docId]);

  const handleOpenTcHeaderImagePreview = useCallback(() => {
    if (!tcHeaderDisplayImageUrl)
      return;
    toastWindow(
      onClose => <ResizableImg src={tcHeaderDisplayImageUrl} onClose={onClose} />,
      {
        fullScreen: true,
        transparent: true,
      },
    );
  }, [tcHeaderDisplayImageUrl]);

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
                  setOriginalDownloadUrl={(url) => {
                    const store = storeRef.current;
                    if (!store)
                      return;
                    setBlocksuiteDocHeader(store, { originalImageUrl: url });
                  }}
                  setCopperedDownloadUrl={(url) => {
                    const store = storeRef.current;
                    if (!store)
                      return;
                    setBlocksuiteDocHeader(store, { imageUrl: url });
                  }}
                  mutate={(data) => {
                    const store = storeRef.current;
                    if (!store)
                      return;
                    setBlocksuiteDocHeader(store, {
                      imageFileId: typeof data?.avatarFileId === "number" ? data.avatarFileId : undefined,
                      originalImageFileId: typeof data?.originFileId === "number" ? data.originFileId : undefined,
                      imageMediaType: "image",
                    });
                  }}
                  fileName={`blocksuite-header-${docId.replaceAll(":", "-")}`}
                  aspect={1}
                  copperedCompressionPreset={copperedCompressionPreset}
                >
                  <div className={`tc-blocksuite-tc-header-avatar${hasTcHeaderImage ? "" : " tc-blocksuite-tc-header-avatar-empty"}`} aria-label="更换头像">
                    {hasTcHeaderImage
                        ? (
                          <img
                            src={tcHeaderDisplayImageUrl}
                            alt={tcHeaderTitle || "文档封面"}
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
                          src={tcHeaderDisplayImageUrl}
                          alt={tcHeaderTitle || "文档封面"}
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
