import type { UserRole } from "api";
import type { BlocksuiteDescriptionEditorProps } from "./blocksuiteDescriptionEditor.shared";
import type { StoredSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import type { BlockNoteDocBlock } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

import { zh } from "@blocknote/core/locales";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useGetSpaceMembersQuery } from "api/hooks/chatQueryHooks";
import { ROLE_DETAIL_STALE_TIME_MS } from "api/hooks/RoleAndAvatarHooks";
import { useGetSpaceRepositoryRoleQuery } from "api/hooks/spaceRepositoryHooks";
import { tuanchat } from "api/instance";
import { seedUserRoleQueryCache } from "api/roleQueryCache";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { getRemoteSnapshot, prewarmRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { createBlockNoteSnapshot, decodeBlockNoteBlocks, isStoredBlockNoteSnapshot, readBlockNoteHeader } from "@/components/chat/infra/blocksuite/document/blockNoteSnapshot";
import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/blocksuite/document/docSnapshotCache";
import { blocksuiteWsClient } from "@/components/chat/infra/blocksuite/space/runtime/blocksuiteWsClient";
import { uploadMediaFile } from "@/utils/mediaUpload";
import { mediaPreviewUrl } from "@/utils/mediaUrl";
import { BLOCKSUITE_FULL_PANEL_EDITOR_CLASS, getCurrentAppTheme } from "./blocksuiteDescriptionEditor.shared";
import { BlocksuiteFrameSkeleton } from "./BlocksuiteFrameSkeleton";
import { buildBlocksuiteMentionCandidates, filterBlocksuiteMentionCandidates } from "./blocksuiteMention";
import { TcHeader } from "./TcHeader";

import "@blocknote/shadcn/style.css";

const EMPTY_DOCUMENT: BlockNoteDocBlock[] = [
  {
    type: "paragraph",
    content: "",
  },
];

const REMOTE_SNAPSHOT_POLL_INTERVAL_MS = 3000;
const REALTIME_SYNC_NOTICE_KIND = "blocknote-snapshot-sync";

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
    fallbackImageFileId?: number;
    fallbackOriginalImageFileId?: number;
    fallbackImageMediaType?: string;
  },
) {
  const normalized = normalizeBlocksuiteDocHeader(header);
  return normalizeBlocksuiteDocHeader({
    title: normalized.title || String(fallback?.fallbackTitle ?? "").trim(),
    imageUrl: normalized.imageUrl || String(fallback?.fallbackImageUrl ?? "").trim(),
    originalImageUrl: normalized.originalImageUrl,
    imageFileId: normalized.imageFileId ?? fallback?.fallbackImageFileId,
    originalImageFileId: normalized.originalImageFileId ?? fallback?.fallbackOriginalImageFileId,
    imageMediaType: normalized.imageMediaType ?? fallback?.fallbackImageMediaType,
  });
}

function buildFallbackHeader(tcHeader?: BlocksuiteDescriptionEditorProps["tcHeader"]) {
  return {
    fallbackTitle: tcHeader?.fallbackTitle,
    fallbackImageUrl: tcHeader?.fallbackImageUrl,
    fallbackImageFileId: tcHeader?.fallbackImageFileId,
    fallbackOriginalImageFileId: tcHeader?.fallbackOriginalImageFileId,
    fallbackImageMediaType: tcHeader?.fallbackImageMediaType,
  };
}

function createRealtimeSyncClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `blocknote-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function encodeRealtimeSyncNotice(payload: { clientId: string; updatedAt: number }): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    kind: REALTIME_SYNC_NOTICE_KIND,
    clientId: payload.clientId,
    updatedAt: payload.updatedAt,
  }));
}

function decodeRealtimeSyncNotice(update: Uint8Array): { clientId: string; updatedAt: number } | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(update)) as {
      kind?: unknown;
      clientId?: unknown;
      updatedAt?: unknown;
    };
    if (parsed.kind !== REALTIME_SYNC_NOTICE_KIND) {
      return null;
    }
    if (typeof parsed.clientId !== "string" || typeof parsed.updatedAt !== "number" || !Number.isFinite(parsed.updatedAt)) {
      return null;
    }
    return {
      clientId: parsed.clientId,
      updatedAt: parsed.updatedAt,
    };
  }
  catch {
    return null;
  }
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

function BlockNoteDescriptionEditorClient(props: BlocksuiteDescriptionEditorProps) {
  const {
    workspaceId: _workspaceId,
    spaceId,
    docId,
    intentPrewarm = false,
    readOnly = false,
    tcHeader,
    onTcHeaderChange,
    className,
  } = props;

  const queryClient = useQueryClient();
  const normalizedSpaceId = spaceId ?? -1;
  const remoteKey = useMemo(() => parseDescriptionDocId(docId), [docId]);
  const fallbackHeader = useMemo(() => resolveHeader(null, buildFallbackHeader(tcHeader)), [tcHeader]);
  const [header, setHeader] = useState<BlocksuiteDocHeader>(fallbackHeader);
  const [initialBlocks, setInitialBlocks] = useState<BlockNoteDocBlock[]>(EMPTY_DOCUMENT);
  const [editorSeed, setEditorSeed] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [legacySnapshotVersion, setLegacySnapshotVersion] = useState<number | null>(null);
  const theme = useAppTheme();
  const hasExplicitHeight = hasExplicitHeightClass(className);
  const headerRef = useRef(header);
  const loadedSnapshotRef = useRef<StoredSnapshot | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastPersistedDigestRef = useRef("");
  const lastLocalDigestRef = useRef("");
  const lastAppliedDigestRef = useRef("");
  const lastNotifiedHeaderDigestRef = useRef("");
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const realtimeClientId = useMemo(() => createRealtimeSyncClientId(), []);
  const spaceMembersQuery = useGetSpaceMembersQuery(normalizedSpaceId);
  const spaceRepositoryRolesQuery = useGetSpaceRepositoryRoleQuery(normalizedSpaceId);
  const spaceMembers = useMemo(() => spaceMembersQuery.data?.data ?? [], [spaceMembersQuery.data?.data]);
  const spaceRoleIds = useMemo(() => {
    const roleIds = (spaceRepositoryRolesQuery.data?.data ?? [])
      .map(role => role.roleId)
      .filter((roleId): roleId is number => typeof roleId === "number" && roleId > 0);
    return Array.from(new Set(roleIds));
  }, [spaceRepositoryRolesQuery.data?.data]);
  const mentionRoleQueries = useQueries({
    queries: spaceRoleIds.map(roleId => ({
      queryKey: ["blocksuiteMentionRole", roleId] as const,
      queryFn: async () => {
        const res = await tuanchat.roleController.getRole(roleId);
        seedUserRoleQueryCache(queryClient, res.data);
        return res;
      },
      staleTime: ROLE_DETAIL_STALE_TIME_MS,
      enabled: roleId > 0,
    })),
  });
  const mentionRoles = useMemo(() => {
    return mentionRoleQueries.flatMap((query) => {
      const role = query.data?.data;
      if (!role || typeof role.roleId !== "number" || role.roleId <= 0) {
        return [];
      }
      return [role as UserRole];
    });
  }, [mentionRoleQueries]);
  const mentionCandidates = useMemo(() => {
    return buildBlocksuiteMentionCandidates({
      roles: mentionRoles,
      spaceMembers,
    });
  }, [mentionRoles, spaceMembers]);

  useEffect(() => {
    headerRef.current = header;
  }, [header]);

  useEffect(() => {
    const resetDigest = `__doc:${docId}:pending__`;
    loadedSnapshotRef.current = null;
    lastPersistedDigestRef.current = resetDigest;
    lastLocalDigestRef.current = resetDigest;
    lastAppliedDigestRef.current = resetDigest;
    lastNotifiedHeaderDigestRef.current = resetDigest;
    refreshInFlightRef.current = null;
    setLegacySnapshotVersion(null);
    setHeader(fallbackHeader);
    headerRef.current = fallbackHeader;
    setInitialBlocks(EMPTY_DOCUMENT);
  }, [docId, fallbackHeader]);

  useEffect(() => {
    if (!intentPrewarm || !remoteKey) {
      return;
    }
    void prewarmRemoteSnapshot(remoteKey);
  }, [intentPrewarm, remoteKey]);

  const applySnapshotToEditor = useCallback((nextSnapshot: StoredSnapshot | null | undefined, options?: {
    allowOverwriteDirty?: boolean;
    persistAsCurrent?: boolean;
  }) => {
    const nextDigest = nextSnapshot ? buildSnapshotDigest(nextSnapshot) : "";
    const isBlockNoteSnapshot = isStoredBlockNoteSnapshot(nextSnapshot);
    if (!options?.allowOverwriteDirty
      && !readOnly
      && lastLocalDigestRef.current
      && lastLocalDigestRef.current !== lastPersistedDigestRef.current
      && nextDigest !== lastLocalDigestRef.current) {
      return false;
    }

    if (lastAppliedDigestRef.current === nextDigest) {
      if (options?.persistAsCurrent) {
        lastPersistedDigestRef.current = nextDigest;
        lastLocalDigestRef.current = nextDigest;
      }
      if (typeof nextSnapshot !== "undefined") {
        setCachedDocSnapshot(docId, nextSnapshot ?? null);
      }
      return false;
    }

    loadedSnapshotRef.current = nextSnapshot ?? null;
    setLegacySnapshotVersion(nextSnapshot && !isBlockNoteSnapshot ? nextSnapshot.v : null);

    const nextBlocks = isBlockNoteSnapshot ? decodeBlockNoteBlocks(nextSnapshot) : EMPTY_DOCUMENT;
    const normalizedBlocks = nextBlocks.length > 0 ? nextBlocks : EMPTY_DOCUMENT;
    const nextHeader = resolveHeader(
      isBlockNoteSnapshot ? readBlockNoteHeader(nextSnapshot) : null,
      buildFallbackHeader(tcHeader),
    );

    setInitialBlocks(normalizedBlocks);
    headerRef.current = nextHeader;
    setHeader(prev => (isSameHeader(prev, nextHeader) ? prev : nextHeader));
    setEditorSeed(prev => prev + 1);
    lastAppliedDigestRef.current = nextDigest;
    if (options?.persistAsCurrent) {
      lastPersistedDigestRef.current = nextDigest;
      lastLocalDigestRef.current = nextDigest;
    }
    if (typeof nextSnapshot !== "undefined") {
      setCachedDocSnapshot(docId, nextSnapshot ?? null);
    }
    return true;
  }, [docId, readOnly, tcHeader]);

  const refreshRemoteSnapshot = useCallback(async (options?: {
    allowOverwriteDirty?: boolean;
  }) => {
    if (!remoteKey) {
      return;
    }
    const inflight = refreshInFlightRef.current;
    if (inflight) {
      return inflight;
    }

    const task = (async () => {
      const remoteSnapshot = await getRemoteSnapshot(remoteKey);
      applySnapshotToEditor(remoteSnapshot, {
        allowOverwriteDirty: options?.allowOverwriteDirty,
        persistAsCurrent: true,
      });
    })();

    refreshInFlightRef.current = task;
    try {
      await task;
    }
    finally {
      if (refreshInFlightRef.current === task) {
        refreshInFlightRef.current = null;
      }
    }
  }, [applySnapshotToEditor, remoteKey]);

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
      applySnapshotToEditor(nextSnapshot, {
        allowOverwriteDirty: true,
        persistAsCurrent: true,
      });
      setIsReady(true);
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current != null && typeof window !== "undefined") {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    applySnapshotToEditor,
    docId,
    remoteKey,
  ]);

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
  const getMentionItems = useCallback(async (query: string) => {
    return filterBlocksuiteMentionCandidates(mentionCandidates, query).map(candidate => ({
      title: candidate.label,
      subtext: candidate.subtext,
      group: candidate.group,
      badge: candidate.badge,
      aliases: candidate.keywords,
      onItemClick: () => {
        editor.insertInlineContent(`@${candidate.insertText} `);
      },
    }));
  }, [editor, mentionCandidates]);

  const queueSnapshotPersist = useCallback((blocks: BlockNoteDocBlock[], headerOverride?: BlocksuiteDocHeader) => {
    const loadedSnapshot = loadedSnapshotRef.current;
    if (loadedSnapshot && !isStoredBlockNoteSnapshot(loadedSnapshot)) {
      return;
    }

    const snapshot = createBlockNoteSnapshot({
      blocks,
      header: headerOverride ?? headerRef.current,
    });

    setCachedDocSnapshot(docId, snapshot);
    const nextDigest = buildSnapshotDigest(snapshot);
    lastLocalDigestRef.current = nextDigest;
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
        lastLocalDigestRef.current = nextDigest;
        lastAppliedDigestRef.current = nextDigest;
        blocksuiteWsClient.pushUpdate(
          {
            entityType: remoteKey.entityType,
            entityId: remoteKey.entityId,
            docType: remoteKey.docType,
          },
          encodeRealtimeSyncNotice({
            clientId: realtimeClientId,
            updatedAt: snapshot.updatedAt,
          }),
          realtimeClientId,
        );
      }).catch(() => {
        // keep cache optimistic; next change or reopen will retry
      });
    }, 500);
  }, [docId, readOnly, remoteKey, realtimeClientId]);

  const handleEditorChange = useCallback(() => {
    queueSnapshotPersist(editor.document as BlockNoteDocBlock[]);
  }, [editor, queueSnapshotPersist]);

  useEffect(() => {
    if (!remoteKey || typeof window === "undefined") {
      return;
    }

    blocksuiteWsClient.joinDoc({
      entityType: remoteKey.entityType,
      entityId: remoteKey.entityId,
      docType: remoteKey.docType,
    });

    const unsubscribe = blocksuiteWsClient.onUpdate({
      entityType: remoteKey.entityType,
      entityId: remoteKey.entityId,
      docType: remoteKey.docType,
    }, ({ update }) => {
      const notice = decodeRealtimeSyncNotice(update);
      if (notice?.clientId === realtimeClientId) {
        return;
      }
      void refreshRemoteSnapshot();
    });

    return () => {
      unsubscribe();
      blocksuiteWsClient.leaveDoc({
        entityType: remoteKey.entityType,
        entityId: remoteKey.entityId,
        docType: remoteKey.docType,
      });
    };
  }, [realtimeClientId, refreshRemoteSnapshot, remoteKey]);

  useEffect(() => {
    if (!remoteKey || typeof window === "undefined") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshRemoteSnapshot();
    }, REMOTE_SNAPSHOT_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshRemoteSnapshot, remoteKey]);

  useEffect(() => {
    if (!onTcHeaderChange || !remoteKey) {
      return;
    }

    const nextDigest = `${docId}:${buildHeaderDigest(header)}`;
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
    "h-full",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapperClassName}>
      <BlocksuiteFrameSkeleton
        visible={!isReady}
        hasExplicitHeightClass={hasExplicitHeight}
      />

      <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-base-300 bg-base-100 ${!isReady ? "invisible" : ""}`}>
        {legacySnapshotVersion != null && (
          <div className="border-b border-warning/20 bg-warning/10 px-4 py-3 text-sm text-base-content/80">
            当前文档仍是旧版 Blocksuite 快照（v
            {legacySnapshotVersion}
            ），BlockNote 暂不支持直接读取；已停止自动覆盖远端内容。
          </div>
        )}
        {tcHeader?.enabled && (
          <TcHeader
            docId={docId}
            readOnly={readOnly}
            header={header}
            fallbackTitle={tcHeader.fallbackTitle}
            fallbackImageUrl={tcHeader.fallbackImageUrl}
            onHeaderChange={(patch) => {
              const nextHeader = resolveHeader({
                ...headerRef.current,
                ...patch,
              }, buildFallbackHeader(tcHeader));
              headerRef.current = nextHeader;
              setHeader(prev => (isSameHeader(prev, nextHeader) ? prev : nextHeader));
              if (isReady) {
                queueSnapshotPersist(editor.document as BlockNoteDocBlock[], nextHeader);
              }
            }}
          />
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
            <BlockNoteView
              editor={editor}
              theme={theme}
              editable={!readOnly && legacySnapshotVersion == null}
              formattingToolbar={!readOnly && legacySnapshotVersion == null}
              linkToolbar={!readOnly && legacySnapshotVersion == null}
              slashMenu={!readOnly && legacySnapshotVersion == null}
              sideMenu={!readOnly && legacySnapshotVersion == null}
              filePanel={!readOnly && legacySnapshotVersion == null}
              tableHandles={!readOnly && legacySnapshotVersion == null}
              emojiPicker={!readOnly && legacySnapshotVersion == null}
              comments={false}
              onChange={handleEditorChange}
              className="h-full min-h-0 overflow-y-auto px-4 py-4 [&_.bn-container]:h-full [&_.bn-editor]:min-h-full [&_.bn-editor]:rounded-md [&_.bn-editor]:bg-transparent [&_.bn-editor]:px-2 [&_.bn-editor]:py-2"
            >
              {!readOnly && legacySnapshotVersion == null && (
                <SuggestionMenuController
                  triggerCharacter="@"
                  getItems={getMentionItems}
                />
              )}
            </BlockNoteView>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlocksuiteDescriptionEditor(props: BlocksuiteDescriptionEditorProps) {
  if (typeof window === "undefined") {
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
