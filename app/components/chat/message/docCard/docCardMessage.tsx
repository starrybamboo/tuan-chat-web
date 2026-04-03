import type { ChatMessageResponse } from "../../../../../api";

import { FileTextIcon } from "@phosphor-icons/react";
import React, { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { readBlocksuiteDocHeader, subscribeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { recordDocCardShareObservation } from "@/components/chat/infra/blocksuite/shared/docCardShareObservability";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor";
import { documentModalShellClassName, getDocumentModalFrameClassName } from "@/components/chat/shared/components/documentModalShell";
import { setDocRefDragData } from "@/components/chat/utils/docRef";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getDocCardExtra } from "@/types/messageExtra";
import { useIsMobile } from "@/utils/getScreenSize";

interface DocCardPayload {
  docId: string;
  spaceId?: number;
  title?: string;
  imageUrl?: string;
  excerpt?: string;
}

function extractDocCardPayload(extra: unknown): DocCardPayload | null {
  const obj = getDocCardExtra(extra);
  const docId = typeof obj?.docId === "string" ? obj.docId.trim() : "";
  if (!docId)
    return null;

  const spaceIdRaw = obj?.spaceId;
  const spaceId = (typeof spaceIdRaw === "number" && Number.isFinite(spaceIdRaw) && spaceIdRaw > 0)
    ? spaceIdRaw
    : undefined;

  const title = typeof obj?.title === "string" ? obj.title.trim() : "";
  const imageUrl = typeof obj?.imageUrl === "string" ? obj.imageUrl.trim() : "";
  const excerpt = typeof obj?.excerpt === "string" ? obj.excerpt.trim() : "";

  return {
    docId,
    ...(spaceId ? { spaceId } : {}),
    ...(title ? { title } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(excerpt ? { excerpt: excerpt.slice(0, 512) } : {}),
  };
}

function DocCardMessageImpl({ messageResponse }: { messageResponse: ChatMessageResponse }) {
  const roomContext = use(RoomContext);
  const { message } = messageResponse;

  const payload = useMemo(() => extractDocCardPayload(message.extra), [message.extra]);
  const docId = payload?.docId ?? "";

  const currentSpaceId = roomContext.spaceId;
  const previewSpaceId = typeof payload?.spaceId === "number" && payload.spaceId > 0
    ? payload.spaceId
    : currentSpaceId;
  const isSupportedDocId = Boolean(docId && parseDescriptionDocId(docId));

  const [preview, setPreview] = useState<{ title: string; imageUrl: string; excerpt: string }>({
    title: payload?.title ?? "",
    imageUrl: payload?.imageUrl ?? "",
    excerpt: payload?.excerpt ?? "",
  });
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!docId || !isSupportedDocId)
      return;
    if (typeof previewSpaceId !== "number" || previewSpaceId <= 0)
      return;

    let unsubHeader: (() => void) | null = null;

    const cleanup = () => {
      try {
        unsubHeader?.();
      }
      catch {
        // ignore
      }
      unsubHeader = null;
    };

    (async () => {
      try {
        const registry = await import("@/components/chat/infra/blocksuite/space/spaceWorkspaceRegistry");
        recordDocCardShareObservation("preview-store-load-start", {
          docId,
          messageId: message.messageId,
          previewSpaceId,
        });
        const store = registry.getOrCreateSpaceDoc({ spaceId: previewSpaceId, docId }) as any;

        try {
          (store as any)?.load?.();
        }
        catch {
          // ignore
        }

        const header = readBlocksuiteDocHeader(store);
        recordDocCardShareObservation("preview-store-load-success", {
          docId,
          messageId: message.messageId,
          previewSpaceId,
          hasHeaderTitle: Boolean(header?.title),
          hasHeaderImageUrl: Boolean(header?.imageUrl),
        });
        if (header && (header.title || header.imageUrl)) {
          setPreview(prev => ({
            title: header.title || prev.title || payload?.title || docId,
            imageUrl: header.imageUrl || prev.imageUrl || payload?.imageUrl || "",
            excerpt: prev.excerpt,
          }));
        }

        unsubHeader = subscribeBlocksuiteDocHeader(store, (h) => {
          if (!h)
            return;
          recordDocCardShareObservation("preview-header-sync", {
            docId,
            messageId: message.messageId,
            previewSpaceId,
            hasTitle: Boolean(h.title),
            hasImageUrl: Boolean(h.imageUrl),
          });
          setPreview(prev => ({
            title: h.title || prev.title || payload?.title || docId,
            imageUrl: h.imageUrl || prev.imageUrl || payload?.imageUrl || "",
            excerpt: prev.excerpt,
          }));
        });
      }
      catch (error) {
        recordDocCardShareObservation("preview-store-load-failed", {
          docId,
          messageId: message.messageId,
          previewSpaceId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return () => {
      cleanup();
    };
  }, [docId, isSupportedDocId, payload?.imageUrl, payload?.title, previewSpaceId]);

  const title = preview.title || payload?.title || (docId ? `文档：${docId}` : "文档");
  const coverUrl = preview.imageUrl || payload?.imageUrl || "";
  const excerpt = preview.excerpt;

  const disabledReason = !payload
    ? "无效的文档消息"
    : (!isSupportedDocId ? "不支持的文档引用" : (!(typeof previewSpaceId === "number" && previewSpaceId > 0) ? "缺少空间信息，无法打开文档预览" : ""));
  const isDisabled = Boolean(disabledReason);

  const openPreview = () => {
    if (isDisabled) {
      recordDocCardShareObservation("preview-disabled-click", {
        docId,
        messageId: message.messageId,
        currentSpaceId,
        previewSpaceId,
        reason: disabledReason,
      });
      toast.error(disabledReason || "无法打开文档预览");
      return;
    }
    recordDocCardShareObservation("preview-click", {
      docId,
      messageId: message.messageId,
      currentSpaceId,
      previewSpaceId,
    });
    setIsOpen(true);
  };

  return (
    <>
      <div className="flex gap-3 p-3 w-full max-w-3xl">
        <button
          type="button"
          className={`group w-full text-left rounded-xl border border-base-300 bg-base-100 shadow-sm hover:shadow-md transition-shadow ${
            isDisabled ? "opacity-70 cursor-not-allowed" : ""
          }`}
          onClick={openPreview}
          draggable={!isDisabled}
          onDragStart={(e) => {
            if (isDisabled || !payload)
              return;

            // 防止被聊天消息“拖拽移动”逻辑接管（会把 effectAllowed 改成 move，导致侧边栏无法以 copy 接收）。
            e.stopPropagation();

            const spaceId = typeof payload.spaceId === "number" && payload.spaceId > 0
              ? payload.spaceId
              : (typeof previewSpaceId === "number" && previewSpaceId > 0 ? previewSpaceId : undefined);

            e.dataTransfer.effectAllowed = "copyLink";
            try {
              e.dataTransfer.setData("text/plain", `tc-doc-ref:${payload.docId}`);
            }
            catch {
              // ignore
            }

            setDocRefDragData(e.dataTransfer, {
              docId: payload.docId,
              ...(spaceId ? { spaceId } : {}),
              ...(title ? { title } : {}),
              ...(coverUrl ? { imageUrl: coverUrl } : {}),
              ...(excerpt ? { excerpt } : {}),
            });
          }}
          aria-disabled={isDisabled}
          title={isDisabled ? disabledReason : "点击打开只读预览；支持拖拽复制到侧边栏/再次发送"}
        >
          <div className="flex gap-3 p-3">
            <div className="relative w-24 h-20 rounded-lg overflow-hidden border border-base-300 bg-base-200 flex-shrink-0">
              {coverUrl
                ? (
                    <img src={coverUrl} alt={title} draggable={false} className="w-full h-full object-cover" />
                  )
                : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileTextIcon className="size-6 opacity-60" />
                    </div>
                  )}
              <div className="absolute left-1 top-1">
                <span className="badge badge-xs badge-info">文档</span>
              </div>
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <div className="font-semibold text-base-content/90 line-clamp-2">{title}</div>
              {excerpt
                ? (
                    <div className="text-sm text-base-content/70 leading-relaxed line-clamp-3">{excerpt}</div>
                  )
                : (
                    <div className="text-sm text-base-content/50 leading-relaxed line-clamp-2">
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
        <div
          className={`${documentModalShellClassName} ${getDocumentModalFrameClassName(isMobile)}`}
        >
          <div className="flex-1 min-h-0 overflow-hidden">
            {(!isDisabled && typeof previewSpaceId === "number" && previewSpaceId > 0) && (
              <div className="w-full h-full overflow-hidden bg-base-100">
                <BlocksuiteDescriptionEditor
                  workspaceId={`space:${previewSpaceId}`}
                  spaceId={previewSpaceId}
                  docId={docId}
                  variant="full"
                  readOnly
                  tcHeader={{ enabled: true, fallbackTitle: title, fallbackImageUrl: coverUrl }}
                  allowModeSwitch
                  fullscreenEdgeless
                  className="h-full min-h-0"
                />
              </div>
            )}
          </div>
        </div>
      </ToastWindow>
    </>
  );
}

const DocCardMessage = React.memo(DocCardMessageImpl);
export default DocCardMessage;
