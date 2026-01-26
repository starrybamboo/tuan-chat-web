import type * as Y from "yjs";
import type { ChatMessageResponse } from "../../../../../api";

import { FileTextIcon } from "@phosphor-icons/react";
import React, { use, useEffect, useMemo, useRef, useState } from "react";
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

  return {
    docId,
    ...(spaceId ? { spaceId } : {}),
    ...(title ? { title } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

function extractExcerptFromStore(store: any): string {
  try {
    const models = (store as any)?.getModelsByFlavour?.("affine:paragraph") as any[] | undefined;
    const parts: string[] = [];
    for (const m of models ?? []) {
      const t = m?.props?.text;
      const s = typeof t?.toString === "function" ? t.toString() : String(t ?? "");
      const trimmed = String(s ?? "").replace(/\s+/g, " ").trim();
      if (!trimmed)
        continue;
      parts.push(trimmed);
      if (parts.join(" ").length >= 220)
        break;
    }
    const joined = parts.join(" ").trim();
    return joined.length > 220 ? `${joined.slice(0, 220)}…` : joined;
  }
  catch {
    return "";
  }
}

function getYDocFromStore(store: any): Y.Doc | null {
  const doc = store?.spaceDoc;
  return doc && typeof doc.on === "function" && typeof doc.off === "function" ? (doc as Y.Doc) : null;
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
    excerpt: "",
  });
  const [isOpen, setIsOpen] = useState(false);

  const storeRef = useRef<any>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!docId || !isSameSpace || !isSupportedDocId)
      return;
    if (typeof currentSpaceId !== "number" || currentSpaceId <= 0)
      return;

    let unsubHeader: (() => void) | null = null;
    let excerptTimer: number | null = null;
    let ydoc: Y.Doc | null = null;

    const scheduleExcerpt = (store: any) => {
      if (excerptTimer != null)
        window.clearTimeout(excerptTimer);
      excerptTimer = window.setTimeout(() => {
        if (disposedRef.current)
          return;
        const excerpt = extractExcerptFromStore(store);
        if (!excerpt)
          return;
        setPreview(prev => (prev.excerpt === excerpt ? prev : { ...prev, excerpt }));
      }, 120);
    };

    const onYUpdate = () => {
      const store = storeRef.current;
      if (!store)
        return;
      scheduleExcerpt(store);
    };

    const cleanup = () => {
      try {
        unsubHeader?.();
      }
      catch {
        // ignore
      }
      unsubHeader = null;

      if (ydoc) {
        try {
          (ydoc as any).off("update", onYUpdate);
        }
        catch {
          // ignore
        }
      }
      ydoc = null;

      if (excerptTimer != null) {
        window.clearTimeout(excerptTimer);
        excerptTimer = null;
      }
    };

    (async () => {
      try {
        const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
        const store = registry.getOrCreateSpaceDoc({ spaceId: currentSpaceId, docId }) as any;
        storeRef.current = store;

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

        scheduleExcerpt(store);

        ydoc = getYDocFromStore(store);
        if (ydoc) {
          try {
            (ydoc as any).on("update", onYUpdate);
          }
          catch {
            // ignore
          }
        }
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
            });
          }}
          aria-disabled={isDisabled}
          title={isDisabled ? disabledReason : "点击打开只读预览；支持拖拽复制到侧边栏/再次发送"}
        >
          <div className="flex gap-3 p-3">
            <div className="relative w-24 h-20 rounded-lg overflow-hidden border border-base-300 bg-base-200 flex-shrink-0">
              {coverUrl
                ? (
                    <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
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
                      {isDisabled ? (disabledReason || "") : "加载预览中…"}
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
