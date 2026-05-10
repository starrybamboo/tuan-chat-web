import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { useEffect, useMemo, useRef } from "react";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

interface MessageEditorProps {
  className?: string;
  coverUrl?: string;
  docId?: string;
  excerpt?: string;
  intentPrewarm?: boolean;
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  readOnly?: boolean;
  spaceId?: number;
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
    fallbackImageFileId?: number;
    fallbackOriginalImageFileId?: number;
    fallbackImageMediaType?: string;
  };
  title?: string;
  workspaceId?: string;
}

/**
 * 统一的消息编辑器占位视图。
 */
export default function MessageEditor({
  className,
  coverUrl,
  docId,
  excerpt,
  intentPrewarm: _intentPrewarm = false,
  onTcHeaderChange,
  readOnly = false,
  spaceId: _spaceId,
  tcHeader,
  title,
  workspaceId: _workspaceId,
}: MessageEditorProps) {
  const frameClassName = className ?? "h-full min-h-0 rounded-md";
  const resolvedTitle = title?.trim() || tcHeader?.fallbackTitle?.trim() || "消息";
  const resolvedCoverUrl = coverUrl || tcHeader?.fallbackImageUrl || "";
  const resolvedDocId = docId?.trim() || undefined;
  const resolvedExcerpt = excerpt?.trim() || resolvedTitle;
  const header = useMemo(() => {
    return normalizeBlocksuiteDocHeader({
      title: resolvedTitle,
      imageUrl: resolvedCoverUrl,
      imageFileId: tcHeader?.fallbackImageFileId,
      originalImageFileId: tcHeader?.fallbackOriginalImageFileId,
      imageMediaType: tcHeader?.fallbackImageMediaType,
    });
  }, [
    resolvedCoverUrl,
    resolvedTitle,
    tcHeader?.fallbackImageFileId,
    tcHeader?.fallbackImageMediaType,
    tcHeader?.fallbackOriginalImageFileId,
  ]);
  const lastNotifyDigestRef = useRef("");

  useEffect(() => {
    if (!resolvedDocId || !onTcHeaderChange) {
      return;
    }
    const parsed = parseDescriptionDocId(resolvedDocId);
    const digest = JSON.stringify({
      docId: resolvedDocId,
      header,
      entityType: parsed?.entityType,
      entityId: parsed?.entityId,
    });
    if (lastNotifyDigestRef.current === digest) {
      return;
    }
    lastNotifyDigestRef.current = digest;
    onTcHeaderChange({
      docId: resolvedDocId,
      entityType: parsed?.entityType as DescriptionEntityType | undefined,
      entityId: parsed?.entityId,
      header,
    });
  }, [header, onTcHeaderChange, resolvedDocId]);

  return (
    <div className={`${frameClassName} overflow-hidden border border-base-300 bg-base-100`}>
      <div className="flex h-full min-h-0 flex-col">
        {resolvedCoverUrl
          ? (
              <div className="h-40 w-full shrink-0 overflow-hidden border-b border-base-300 bg-base-200">
                <img className="h-full w-full object-cover" src={resolvedCoverUrl} alt={resolvedTitle} />
              </div>
            )
          : null}

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-base-content">
                {resolvedTitle}
              </div>
              {resolvedDocId
                ? (
                    <div className="truncate font-mono text-xs text-base-content/45">
                      {resolvedDocId}
                    </div>
                  )
                : null}
            </div>
            <div className="shrink-0 rounded-md border border-base-300 px-2 py-1 text-xs text-base-content/55">
              {readOnly ? "只读" : "占位"}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-dashed border-base-300 bg-base-200/40">
            <div className="flex w-full items-center justify-center p-6 text-center text-sm leading-6 text-base-content/50">
              {resolvedExcerpt || resolvedDocId || "消息"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
