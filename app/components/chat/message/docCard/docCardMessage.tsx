import type { ChatMessageResponse } from "../../../../../api";

import { FileTextIcon } from "@phosphor-icons/react";
import React, { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { readBlocksuiteDocHeader, subscribeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { setDocRefDragData } from "@/components/chat/utils/docRef";
import { PopWindow } from "@/components/common/popWindow";

interface DocCardPayload {
  docId: string;
  spaceId?: number;
  title?: string;
  imageUrl?: string;
  excerpt?: string;
}

function extractDocCardPayload(extra: unknown): DocCardPayload | null {
  const raw = (extra as any)?.docCard ?? null;
  const fallbackRaw = extra as any;

  const obj = (raw && typeof raw === "object") ? raw : fallbackRaw;
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
  const isSameSpace = !payload?.spaceId || (typeof currentSpaceId === "number" && currentSpaceId > 0 && payload.spaceId === currentSpaceId);
  const isSupportedDocId = Boolean(docId && parseDescriptionDocId(docId));

  const [preview, setPreview] = useState<{ title: string; imageUrl: string; excerpt: string }>({
    title: payload?.title ?? "",
    imageUrl: payload?.imageUrl ?? "",
    excerpt: payload?.excerpt ?? "",
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!docId || !isSameSpace || !isSupportedDocId)
      return;
    if (typeof currentSpaceId !== "number" || currentSpaceId <= 0)
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
        const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
        const store = registry.getOrCreateSpaceDoc({ spaceId: currentSpaceId, docId }) as any;

        try {
          (store as any)?.load?.();
        }
        catch {
          // ignore
        }

        const header = readBlocksuiteDocHeader(store);
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
          setPreview(prev => ({
            title: h.title || prev.title || payload?.title || docId,
            imageUrl: h.imageUrl || prev.imageUrl || payload?.imageUrl || "",
            excerpt: prev.excerpt,
          }));
        });
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cleanup();
    };
  }, [currentSpaceId, docId, isSameSpace, isSupportedDocId, payload?.imageUrl, payload?.title]);

  const title = preview.title || payload?.title || (docId ? `文档：${docId}` : "文档");
  const coverUrl = preview.imageUrl || payload?.imageUrl || "";
  const excerpt = preview.excerpt;

  const disabledReason = !payload
    ? "无效的文档消息"
    : (!isSupportedDocId ? "不支持的文档引用" : (!isSameSpace ? "仅支持在同一空间预览" : ""));
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
      <div className="flex gap-3 p-3 w-full max-w-3xl mx-auto">
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
              : (typeof currentSpaceId === "number" && currentSpaceId > 0 ? currentSpaceId : undefined);

            e.dataTransfer.effectAllowed = "copy";
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

      <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="w-[min(1200px,96vw)] h-[min(86vh,900px)] bg-base-100 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 border-b border-base-300 bg-base-100">
            <div className="text-sm opacity-80 truncate px-2">{title}</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsOpen(false)}>关闭</button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-2">
            {(!isDisabled && typeof currentSpaceId === "number" && currentSpaceId > 0) && (
              <div className="w-full h-full overflow-hidden bg-base-100 border border-base-300 rounded-box">
                <BlocksuiteDescriptionEditor
                  workspaceId={`space:${currentSpaceId}`}
                  spaceId={currentSpaceId}
                  docId={docId}
                  variant="full"
                  readOnly
                  tcHeader={{ enabled: true, fallbackTitle: title, fallbackImageUrl: coverUrl }}
                  allowModeSwitch
                  fullscreenEdgeless
                />
              </div>
            )}
          </div>
        </div>
      </PopWindow>
    </>
  );
}

const DocCardMessage = React.memo(DocCardMessageImpl);
export default DocCardMessage;
