import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

import { FileTextIcon } from "@phosphor-icons/react";
import { useCallback, useMemo } from "react";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { imageMediumUrl, imageMediumUrlFromUrl } from "@/utils/mediaUrl";

export interface TcHeaderProps {
  docId: string;
  readOnly: boolean;
  header: BlocksuiteDocHeader;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
  onHeaderChange: (patch: Partial<BlocksuiteDocHeader>) => void;
}

export function resolveTcHeaderUploadPreset(docId: string) {
  const parsed = parseDescriptionDocId(docId);
  return parsed && ["space", "room", "space_user_doc", "space_doc"].includes(parsed.entityType) ? "avatarThumb" : undefined;
}

/**
 * 统一文档 tcHeader 的标题与封面编辑 UI，供各类文档编辑器直接复用。
 */
export function TcHeader(props: TcHeaderProps) {
  const {
    docId,
    readOnly,
    header,
    fallbackTitle,
    fallbackImageUrl,
    onHeaderChange,
  } = props;

  const displayTitle = header.title || String(fallbackTitle ?? "").trim();
  const rawImageUrl = header.imageUrl || String(fallbackImageUrl ?? "").trim();
  const displayImageUrl = imageMediumUrl(header.imageFileId) || imageMediumUrlFromUrl(rawImageUrl);
  const hasImage = Boolean(displayImageUrl || rawImageUrl);
  const uploaderPreset = useMemo(() => resolveTcHeaderUploadPreset(docId), [docId]);

  const openPreview = useCallback(() => {
    if (!displayImageUrl) {
      return;
    }
    toastWindow(
      onClose => <ResizableImg src={displayImageUrl} onClose={onClose} />,
      {
        fullScreen: true,
        transparent: true,
      },
    );
  }, [displayImageUrl]);

  const avatarNode = (
    <div className={`group relative flex h-18 w-18 shrink-0 overflow-hidden rounded-md border border-base-300 bg-base-200 ${hasImage ? "" : "items-center justify-center"}`}>
      {hasImage
        ? (
            <img
              src={displayImageUrl}
              alt={displayTitle || "文档封面"}
              className="h-full w-full object-cover"
            />
          )
        : (
            <FileTextIcon className="size-7 text-base-content/45" weight="bold" />
          )}
      <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
      {!readOnly && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/45 px-2 py-1 text-center text-[11px] text-white opacity-0 transition group-hover:opacity-100">
          更换
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-start gap-3 border-b border-base-300 px-4 py-4">
      {readOnly
        ? (
            <button
              type="button"
              className="cursor-pointer"
              onClick={hasImage ? openPreview : undefined}
              disabled={!hasImage}
            >
              {avatarNode}
            </button>
          )
        : (
            <ImgUploaderWithCopper
              key={`blocknote-header:${docId}`}
              fileName={`blocknote-header-${docId.replaceAll(":", "-")}`}
              aspect={1}
              copperedCompressionPreset={uploaderPreset}
              setOriginalDownloadUrl={url => onHeaderChange({ originalImageUrl: url })}
              setCopperedDownloadUrl={url => onHeaderChange({ imageUrl: url })}
              mutate={(data) => {
                onHeaderChange({
                  imageFileId: typeof data?.avatarFileId === "number" ? data.avatarFileId : undefined,
                  originalImageFileId: typeof data?.originFileId === "number" ? data.originFileId : undefined,
                  imageMediaType: "image",
                });
              }}
            >
              {avatarNode}
            </ImgUploaderWithCopper>
          )}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <input
            value={displayTitle}
            disabled={readOnly}
            placeholder="标题"
            className="min-w-0 flex-1 border border-transparent bg-transparent px-0 py-1 text-xl font-semibold text-base-content transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-default disabled:text-base-content"
            onChange={event => onHeaderChange({ title: event.target.value })}
            onBlur={event => onHeaderChange({ title: event.target.value.trim() })}
          />
        </div>

        {!readOnly && (
          <input
            value={rawImageUrl}
            placeholder="封面链接"
            className="w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={event => onHeaderChange({ imageUrl: event.target.value })}
            onBlur={event => onHeaderChange({ imageUrl: event.target.value.trim() })}
          />
        )}
      </div>
    </div>
  );
}
