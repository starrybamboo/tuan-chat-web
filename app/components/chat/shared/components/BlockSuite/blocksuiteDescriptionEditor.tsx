import type { BlocksuiteDescriptionEditorProps, DocMode } from "./blocksuiteDescriptionEditor.shared";
import type { BlockNoteDocBlock } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

import { zh } from "@blocknote/core/locales";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { FileTextIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { getRemoteSnapshot, prewarmRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { createBlockNoteSnapshot, decodeBlockNoteBlocks, readBlockNoteHeader } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/blocksuite/document/docSnapshotCache";
import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { uploadMediaFile } from "@/utils/mediaUpload";
import { imageMediumUrl, imageMediumUrlFromUrl, mediaPreviewUrl } from "@/utils/mediaUrl";
import { BLOCKSUITE_FULL_PANEL_EDITOR_CLASS, getCurrentAppTheme } from "./blocksuiteDescriptionEditor.shared";
import { BlocksuiteFrameSkeleton } from "./BlocksuiteFrameSkeleton";

import "@blocknote/shadcn/style.css";

const EMPTY_DOCUMENT: BlockNoteDocBlock[] = [
  {
    type: "paragraph",
    content: "",
  },
];

function isSameHeader(a: BlocksuiteDocHeader, b: BlocksuiteDocHeader) {
  return a.title === b.title
    && a.imageUrl === b.imageUrl
    && a.originalImageUrl === b.originalImageUrl
    && a.imageFileId === b.imageFileId
    && a.originalImageFileId === b.originalImageFileId
    && a.imageMediaType === b.imageMediaType;
}

function buildHeaderDigest(header: BlocksuiteDocHeader) {
  return JSON.stringify(header);
}

function buildSnapshotDigest(snapshot: { updateB64: string; header?: Partial<BlocksuiteDocHeader>; excerpt?: string }) {
  return JSON.stringify({
    updateB64: snapshot.updateB64,
    header: snapshot.header ?? null,
    excerpt: snapshot.excerpt ?? "",
  });
}

function hasExplicitHeightClass(className?: string) {
  return /(?:^|\s)(?:h-|min-h-|max-h-)/.test(className ?? "");
}

function resolveHeader(
  header: Partial<BlocksuiteDocHeader> | null | undefined,
  fallback?: {
    fallbackTitle?: string;
    fallbackImageUrl?: string;
  },
) {
  const normalized = normalizeBlocksuiteDocHeader(header);
  return normalizeBlocksuiteDocHeader({
    title: normalized.title || String(fallback?.fallbackTitle ?? "").trim(),
    imageUrl: normalized.imageUrl || String(fallback?.fallbackImageUrl ?? "").trim(),
    originalImageUrl: normalized.originalImageUrl,
    imageFileId: normalized.imageFileId,
    originalImageFileId: normalized.originalImageFileId,
    imageMediaType: normalized.imageMediaType,
  });
}

function useAppTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => getCurrentAppTheme());

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const update = () => {
      const nextTheme = getCurrentAppTheme();
      setTheme(prev => (prev === nextTheme ? prev : nextTheme));
    };

    update();
    const observer = new MutationObserver(() => {
      update();
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return theme;
}

function BlockNoteDocHeaderPanel(props: {
  docId: string;
  readOnly: boolean;
  header: BlocksuiteDocHeader;
  fallbackTitle?: string;
  fallbackImageUrl?: string;
  allowModeSwitch: boolean;
  currentMode: DocMode;
  onHeaderChange: (patch: Partial<BlocksuiteDocHeader>) => void;
  onToggleMode: () => void;
}) {
  const {
    docId,
    readOnly,
    header,
    fallbackTitle,
    fallbackImageUrl,
    allowModeSwitch,
    currentMode,
    onHeaderChange,
    onToggleMode,
  } = props;

  const displayTitle = header.title || String(fallbackTitle ?? "").trim();
  const rawImageUrl = header.imageUrl || String(fallbackImageUrl ?? "").trim();
  const displayImageUrl = imageMediumUrl(header.imageFileId) || imageMediumUrlFromUrl(rawImageUrl);
  const hasImage = Boolean(displayImageUrl || rawImageUrl);
  const uploaderPreset = useMemo(() => {
    const parsed = parseDescriptionDocId(docId);
    return parsed && ["space", "room", "space_user_doc", "space_doc"].includes(parsed.entityType) ? "avatarThumb" : undefined;
  }, [docId]);

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
          {allowModeSwitch && (
            <button
              type="button"
              className="shrink-0 rounded-md border border-base-300 bg-base-100 px-3 py-1.5 text-sm text-base-content transition hover:border-base-content/30 hover:bg-base-200"
              onClick={onToggleMode}
            >
              {currentMode === "page" ? "切换画布" : "退出画布"}
            </button>
          )}
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

function BlockNoteDescriptionEditorClient(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId: _workspaceId,
    docId,
    intentPrewarm = false,
    mode: forcedMode = "page",
    readOnly = false,
    allowModeSwitch = false,
    fullscreenEdgeless = false,
    tcHeader,
    onTcHeaderChange,
    className,
    onModeChange,
  } = props;

  const remoteKey = useMemo(() => parseDescriptionDocId(docId), [docId]);
  const fallbackHeader = useMemo(() => resolveHeader(null, {
    fallbackTitle: tcHeader?.fallbackTitle,
    fallbackImageUrl: tcHeader?.fallbackImageUrl,
  }), [tcHeader?.fallbackImageUrl, tcHeader?.fallbackTitle]);
  const [currentMode, setCurrentMode] = useState<DocMode>(forcedMode);
  const [header, setHeader] = useState<BlocksuiteDocHeader>(fallbackHeader);
  const [initialBlocks, setInitialBlocks] = useState<BlockNoteDocBlock[]>(EMPTY_DOCUMENT);
  const [editorSeed, setEditorSeed] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const theme = useAppTheme();
  const hasExplicitHeight = hasExplicitHeightClass(className);
  const headerRef = useRef(header);
  const saveTimerRef = useRef<number | null>(null);
  const lastPersistedDigestRef = useRef("");
  const lastNotifiedHeaderDigestRef = useRef("");

  useEffect(() => {
    headerRef.current = header;
  }, [header]);

  useEffect(() => {
    setCurrentMode(forcedMode);
  }, [docId, forcedMode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const isFullscreen = allowModeSwitch && fullscreenEdgeless && currentMode === "edgeless";
    if (!isFullscreen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [allowModeSwitch, currentMode, fullscreenEdgeless]);

  useEffect(() => {
    if (!intentPrewarm || !remoteKey) {
      return;
    }
    void prewarmRemoteSnapshot(remoteKey);
  }, [intentPrewarm, remoteKey]);

  useEffect(() => {
    let cancelled = false;
    setIsReady(false);

    void (async () => {
      let nextSnapshot = getCachedDocSnapshot(docId);
      if (remoteKey) {
        try {
          const remoteSnapshot = await getRemoteSnapshot(remoteKey);
          if (!nextSnapshot || (remoteSnapshot?.updatedAt ?? 0) >= (nextSnapshot?.updatedAt ?? 0)) {
            nextSnapshot = remoteSnapshot;
          }
        }
        catch {
          // ignore remote bootstrap failure and fall back to local cache / empty doc
        }
      }

      if (cancelled) {
        return;
      }

      const nextBlocks = decodeBlockNoteBlocks(nextSnapshot);
      const normalizedBlocks = nextBlocks.length > 0 ? nextBlocks : EMPTY_DOCUMENT;
      const nextHeader = resolveHeader(readBlockNoteHeader(nextSnapshot), {
        fallbackTitle: tcHeader?.fallbackTitle,
        fallbackImageUrl: tcHeader?.fallbackImageUrl,
      });

      setInitialBlocks(normalizedBlocks);
      setHeader(prev => (isSameHeader(prev, nextHeader) ? prev : nextHeader));
      lastPersistedDigestRef.current = nextSnapshot ? buildSnapshotDigest(nextSnapshot) : "";
      setEditorSeed(prev => prev + 1);
      setIsReady(true);

      if (nextSnapshot) {
        setCachedDocSnapshot(docId, nextSnapshot);
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current != null && typeof window !== "undefined") {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [docId, remoteKey, tcHeader?.fallbackImageUrl, tcHeader?.fallbackTitle]);

  const uploadFile = useCallback(async (file: File) => {
    const uploaded = await uploadMediaFile(file);
    return mediaPreviewUrl(uploaded.fileId, uploaded.mediaType);
  }, []);

  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    dictionary: zh,
    uploadFile,
    defaultStyles: true,
  }, [docId, editorSeed]);

  const queueSnapshotPersist = useCallback((blocks: BlockNoteDocBlock[]) => {
    const snapshot = createBlockNoteSnapshot({
      blocks,
      header: headerRef.current,
    });

    setCachedDocSnapshot(docId, snapshot);
    const nextDigest = buildSnapshotDigest(snapshot);
    if (lastPersistedDigestRef.current === nextDigest) {
      return;
    }

    if (saveTimerRef.current != null && typeof window !== "undefined") {
      window.clearTimeout(saveTimerRef.current);
    }

    if (!remoteKey || readOnly || typeof window === "undefined") {
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void setRemoteSnapshot({
        entityType: remoteKey.entityType,
        entityId: remoteKey.entityId,
        docType: remoteKey.docType,
        snapshot,
      }).then(() => {
        lastPersistedDigestRef.current = nextDigest;
      }).catch(() => {
        // keep cache optimistic; next change or reopen will retry
      });
    }, 500);
  }, [docId, readOnly, remoteKey]);

  const handleEditorChange = useCallback(() => {
    queueSnapshotPersist(editor.document as BlockNoteDocBlock[]);
  }, [editor, queueSnapshotPersist]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    queueSnapshotPersist(editor.document as BlockNoteDocBlock[]);
  }, [editor, header, isReady, queueSnapshotPersist]);

  useEffect(() => {
    if (!onTcHeaderChange || !remoteKey) {
      return;
    }

    const nextDigest = buildHeaderDigest(header);
    if (lastNotifiedHeaderDigestRef.current === nextDigest) {
      return;
    }
    lastNotifiedHeaderDigestRef.current = nextDigest;
    onTcHeaderChange({
      docId,
      entityType: remoteKey.entityType,
      entityId: remoteKey.entityId,
      header,
    });
  }, [docId, header, onTcHeaderChange, remoteKey]);

  const wrapperClassName = [
    "relative w-full min-h-0",
    className ?? "",
    allowModeSwitch && fullscreenEdgeless && currentMode === "edgeless"
      ? "fixed inset-0 z-50 bg-base-200 p-4"
      : "h-full",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapperClassName}>
      <BlocksuiteFrameSkeleton
        visible={!isReady}
        hasExplicitHeightClass={hasExplicitHeight}
      />

      <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-base-300 bg-base-100 ${!isReady ? "invisible" : ""}`}>
        {tcHeader?.enabled && (
          <BlockNoteDocHeaderPanel
            docId={docId}
            readOnly={readOnly}
            header={header}
            fallbackTitle={tcHeader.fallbackTitle}
            fallbackImageUrl={tcHeader.fallbackImageUrl}
            allowModeSwitch={allowModeSwitch}
            currentMode={currentMode}
            onHeaderChange={(patch) => {
              const nextHeader = resolveHeader({
                ...headerRef.current,
                ...patch,
              }, {
                fallbackTitle: tcHeader.fallbackTitle,
                fallbackImageUrl: tcHeader.fallbackImageUrl,
              });
              setHeader(prev => (isSameHeader(prev, nextHeader) ? prev : nextHeader));
            }}
            onToggleMode={() => {
              if (!allowModeSwitch) {
                return;
              }
              setCurrentMode((prev) => {
                const nextMode: DocMode = prev === "page" ? "edgeless" : "page";
                onModeChange?.(nextMode);
                return nextMode;
              });
            }}
          />
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className={`mx-auto flex h-full min-h-0 w-full flex-col ${currentMode === "page" ? "max-w-4xl" : "max-w-none"}`}>
            <BlockNoteView
              editor={editor}
              theme={theme}
              editable={!readOnly}
              formattingToolbar={!readOnly}
              linkToolbar={!readOnly}
              slashMenu={!readOnly}
              sideMenu={!readOnly}
              filePanel={!readOnly}
              tableHandles={!readOnly}
              emojiPicker={!readOnly}
              comments={false}
              onChange={handleEditorChange}
              className="h-full min-h-0 overflow-y-auto px-4 py-4 [&_.bn-container]:h-full [&_.bn-editor]:min-h-full [&_.bn-editor]:rounded-md [&_.bn-editor]:bg-transparent [&_.bn-editor]:px-2 [&_.bn-editor]:py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlocksuiteDescriptionEditor(props: BlocksuiteDescriptionEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className={props.className ?? BLOCKSUITE_FULL_PANEL_EDITOR_CLASS}>
        <BlocksuiteFrameSkeleton
          visible
          hasExplicitHeightClass={hasExplicitHeightClass(props.className)}
        />
      </div>
    );
  }

  return <BlockNoteDescriptionEditorClient {...props} />;
}
