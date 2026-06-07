import type { ChatMessageResponse } from "../../../../../api";

import { FileTextIcon } from "@phosphor-icons/react";
import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";
import { RoomContext } from "@/components/chat/core/roomContext";
import { documentModalShellClassName, getDocumentModalFrameClassName } from "@/components/chat/shared/components/documentModalShell";
import { setDocRefDragData } from "@/components/chat/utils/docRef";
import { MediaImage } from "@/components/common/mediaImage";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { useIsMobile } from "@/utils/getScreenSize";
import { extractDocCardReferencePayload, resolveDocCardDisplayCoverUrl } from "./docCardMedia";

function DocCardMessageImpl({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  const roomContext = use(RoomContext);
  const isMobile = useIsMobile();
  const { message } = messageResponse;

  const payload = useMemo(() => extractDocCardReferencePayload(message.extra), [message.extra]);
  const [isOpen, setIsOpen] = useState(false);

  const previewSpaceId = typeof payload?.spaceId === "number" && payload.spaceId > 0
    ? payload.spaceId
    : roomContext.spaceId;
  const previewDocId = payload?.roomId ? String(payload.roomId) : payload?.docId;
  const title = payload?.title || (payload?.docId ? `文档：${payload.docId}` : "文档");
  const coverUrl = payload?.imageUrl ?? "";
  const coverFileId = payload?.imageFileId;
  const originalCoverFileId = payload?.originalImageFileId;
  const imageMediaType = payload?.imageMediaType;
  const displayCoverUrl = resolveDocCardDisplayCoverUrl(payload, "medium");
  const excerpt = payload?.excerpt ?? "";
  const disabledReason = !payload
    ? "无效的文档消息"
    : (!(typeof previewSpaceId === "number" && previewSpaceId > 0) ? "缺少空间信息，无法打开文档预览" : "");
  const isDisabled = Boolean(disabledReason);

  const openPreview = () => {
    if (isDisabled) {
      toast.error(disabledReason || "无法打开文档预览");
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <div className="flex w-full max-w-3xl gap-3 p-3">
        <button
          type="button"
          className={`
            group w-full rounded-xl border border-base-300 bg-base-100 text-left
            shadow-sm transition-shadow
            hover:shadow-md
            ${
            isDisabled ? "cursor-not-allowed opacity-70" : ""
          }
          `}
          onClick={openPreview}
          draggable={!isDisabled}
          onDragStart={(event) => {
            if (isDisabled || !payload) {
              return;
            }

            event.stopPropagation();
            const spaceId = typeof payload.spaceId === "number" && payload.spaceId > 0
              ? payload.spaceId
              : (typeof previewSpaceId === "number" && previewSpaceId > 0 ? previewSpaceId : undefined);

            event.dataTransfer.effectAllowed = "copyLink";
            try {
              event.dataTransfer.setData("text/plain", `tc-doc-ref:${previewDocId ?? payload.docId}`);
            }
            catch {
              // ignore drag clipboard errors
            }

            setDocRefDragData(event.dataTransfer, {
              docId: previewDocId ?? payload.docId,
              ...(payload.roomId ? { roomId: payload.roomId } : {}),
              ...(spaceId ? { spaceId } : {}),
              ...(title ? { title } : {}),
              ...(coverFileId ? { imageFileId: coverFileId } : {}),
              ...(originalCoverFileId ? { originalImageFileId: originalCoverFileId } : {}),
              ...(imageMediaType ? { imageMediaType } : {}),
              ...(coverUrl ? { imageUrl: coverUrl } : {}),
              ...(excerpt ? { excerpt } : {}),
            });
          }}
          aria-disabled={isDisabled}
          title={isDisabled ? disabledReason : "点击打开预览；支持拖拽复制到侧边栏或再次发送"}
        >
          <div className="flex gap-3 p-3">
            <div className="
              relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border
              border-base-300 bg-base-200
            ">
              {displayCoverUrl
                ? (
                    <MediaImage src={displayCoverUrl} alt={title} draggable={false} className="
                      h-full w-full object-cover
                    " />
                  )
                : (
                    <div className="
                      flex h-full w-full items-center justify-center
                    ">
                      <FileTextIcon className="size-6 opacity-60" />
                    </div>
                  )}
              <div className="absolute left-1 top-1">
                <span className="badge badge-info badge-xs">文档</span>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="line-clamp-2 font-semibold text-base-content/90">{title}</div>
              {excerpt
                ? (
                    <div className="
                      line-clamp-3 text-sm leading-relaxed text-base-content/70
                    ">{excerpt}</div>
                  )
                : (
                    <div className="
                      line-clamp-2 text-sm leading-relaxed text-base-content/50
                    ">
                      {isDisabled ? (disabledReason || "") : "暂无摘要"}
                    </div>
                  )}
            </div>
          </div>
        </button>
      </div>

      <ToastWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fullScreen={isMobile}
        disableScroll
      >
        <div className={`
          ${documentModalShellClassName}
          ${getDocumentModalFrameClassName(isMobile)}
        `}>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              {isOpen && !isDisabled && (
                <div className="h-full w-full overflow-hidden bg-base-100">
                  <ChatPageDocContent
                    docId={previewDocId}
                    readOnly
                    showToolbar={false}
                    spaceId={previewSpaceId}
                    tcHeaderTitle={title}
                    tcHeaderImageUrl={coverUrl}
                    tcHeaderImageFileId={coverFileId}
                    tcHeaderOriginalImageFileId={originalCoverFileId}
                    tcHeaderImageMediaType={imageMediaType}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ToastWindow>
    </>
  );
}

const DocCardMessage = React.memo(DocCardMessageImpl);

export default DocCardMessage;
