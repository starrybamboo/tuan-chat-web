import type { ChatMessageResponse } from "../../../../../api";

import { FileTextIcon, WarningCircleIcon } from "@phosphor-icons/react";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { prewarmRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
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

function getDocCardPreviewErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }
  return "文档信息加载失败，请稍后重试";
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
  const [previewLoadState, setPreviewLoadState] = useState<{
    status: "idle" | "loading" | "ready" | "error";
    errorMessage: string;
  }>({
    status: "idle",
    errorMessage: "",
  });
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const prewarmedDocKeyRef = useRef("");
  const prewarmInFlightDocKeyRef = useRef("");
  const docRemoteKey = useMemo(() => parseDescriptionDocId(docId), [docId]);
  const prewarmDocKey = docRemoteKey ? `${docRemoteKey.entityType}:${docRemoteKey.entityId}:${docRemoteKey.docType}` : "";

  const requestSnapshotPrewarm = useCallback((reason: "mount" | "hover" | "focus") => {
    if (!docRemoteKey || !prewarmDocKey) {
      return;
    }
    if (prewarmedDocKeyRef.current === prewarmDocKey) {
      return;
    }
    if (prewarmInFlightDocKeyRef.current === prewarmDocKey) {
      return;
    }
    prewarmInFlightDocKeyRef.current = prewarmDocKey;
    recordDocCardShareObservation("preview-snapshot-prewarm-start", {
      docId,
      messageId: message.messageId,
      reason,
      entityType: docRemoteKey.entityType,
      entityId: docRemoteKey.entityId,
      docType: docRemoteKey.docType,
    });
    void prewarmRemoteSnapshot(docRemoteKey).then((warmed) => {
      if (prewarmInFlightDocKeyRef.current === prewarmDocKey) {
        prewarmInFlightDocKeyRef.current = "";
      }
      if (!warmed) {
        return;
      }
      prewarmedDocKeyRef.current = prewarmDocKey;
      recordDocCardShareObservation("preview-snapshot-prewarm-success", {
        docId,
        messageId: message.messageId,
        reason,
        entityType: docRemoteKey.entityType,
        entityId: docRemoteKey.entityId,
        docType: docRemoteKey.docType,
      });
    });
  }, [docId, docRemoteKey, message.messageId, prewarmDocKey]);

  useEffect(() => {
    setPreview({
      title: payload?.title ?? "",
      imageUrl: payload?.imageUrl ?? "",
      excerpt: payload?.excerpt ?? "",
    });
    setPreviewLoadState({
      status: "idle",
      errorMessage: "",
    });
  }, [docId, payload?.excerpt, payload?.imageUrl, payload?.title]);

  useEffect(() => {
    if (!prewarmDocKey) {
      prewarmedDocKeyRef.current = "";
      prewarmInFlightDocKeyRef.current = "";
    }
  }, [prewarmDocKey]);

  useEffect(() => {
    if (!prewarmDocKey) {
      return;
    }
    const timeoutId = setTimeout(() => {
      requestSnapshotPrewarm("mount");
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [prewarmDocKey, requestSnapshotPrewarm]);

  useEffect(() => {
    if (!docId || !isSupportedDocId)
      return;
    if (typeof previewSpaceId !== "number" || previewSpaceId <= 0)
      return;

    let cancelled = false;
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
        if (!cancelled) {
          setPreviewLoadState({
            status: "loading",
            errorMessage: "",
          });
        }
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
        if (!cancelled) {
          setPreviewLoadState({
            status: "ready",
            errorMessage: "",
          });
        }
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
        const errorMessage = getDocCardPreviewErrorMessage(error);
        recordDocCardShareObservation("preview-store-load-failed", {
          docId,
          messageId: message.messageId,
          previewSpaceId,
          error: errorMessage,
        });
        if (!cancelled) {
          setPreviewLoadState({
            status: "error",
            errorMessage,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [docId, isSupportedDocId, message.messageId, payload?.imageUrl, payload?.title, previewSpaceId]);

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
    requestSnapshotPrewarm("focus");
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
          onMouseEnter={() => {
            requestSnapshotPrewarm("hover");
          }}
          onFocus={() => {
            requestSnapshotPrewarm("focus");
          }}
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
              {previewLoadState.status === "error" && !isDisabled
                ? (
                    <div className="flex items-center gap-1 text-xs text-warning mt-1">
                      <WarningCircleIcon className="size-3.5 shrink-0" />
                      <span className="line-clamp-1">文档信息同步失败，打开预览后可重试</span>
                    </div>
                  )
                : null}
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
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {previewLoadState.status === "error" && !isDisabled
              ? (
                  <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-base-content">
                    <WarningCircleIcon className="size-4 shrink-0 text-warning" />
                    <span className="truncate">{previewLoadState.errorMessage || "文档信息加载失败"}</span>
                  </div>
                )
              : null}

            <div className="flex-1 min-h-0 overflow-hidden">
              {(!isDisabled && typeof previewSpaceId === "number" && previewSpaceId > 0) && (
                <div className="w-full h-full overflow-hidden bg-base-100">
                  <BlocksuiteDescriptionEditor
                    workspaceId={`space:${previewSpaceId}`}
                    spaceId={previewSpaceId}
                    docId={docId}
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
        </div>
      </ToastWindow>
    </>
  );
}

const DocCardMessage = React.memo(DocCardMessageImpl);
export default DocCardMessage;
