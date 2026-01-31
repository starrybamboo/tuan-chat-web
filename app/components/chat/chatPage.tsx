import type {
  ChatDiscoverMode,
  ChatPageMainView,
  DocTcHeaderPayload,
  RoomSettingState,
  RoomSettingTab,
  SpaceDetailTab,
} from "@/components/chat/chatPage.types";
import type { SpaceContextType } from "@/components/chat/core/spaceContext";
import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "@/components/chat/room/sidebarTree";
import {
  useAddRoomMemberMutation,
  useAddSpaceMemberMutation,
  useGetSpaceInfoQuery,
  useGetSpaceMembersQuery,
  useGetUserActiveSpacesQuery,
  useGetUserRoomsQuery,
  useSetPlayerMutation,
} from "api/hooks/chatQueryHooks";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";
import { tuanchat } from "api/instance";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router";
import ChatPageLayout from "@/components/chat/chatPageLayout";
import ChatPageMainContent from "@/components/chat/chatPageMainContent";
import ChatPageModals from "@/components/chat/chatPageModals";
import ChatPageSidePanelContent from "@/components/chat/chatPageSidePanelContent";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import useChatPageLeftDrawer from "@/components/chat/hooks/useChatPageLeftDrawer";
import useChatPageRoute from "@/components/chat/hooks/useChatPageRoute";
import { buildSpaceDocId, parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import { buildDefaultSidebarTree, extractDocMetasFromSidebarTree, parseSidebarTree } from "@/components/chat/room/sidebarTree";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { getDefaultCreateInCategoryMode } from "@/components/chat/utils/createInCategoryMode";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useGlobalContext } from "@/components/globalContextProvider";
import { usePrivateMessageList } from "@/components/privateChat/hooks/usePrivateMessageList";
import { useUnreadCount } from "@/components/privateChat/hooks/useUnreadCount";

/**
 * Chat 页面
 */
interface ChatPageProps {
  /** 初始主视图 */
  initialMainView?: ChatPageMainView;
  /** 发现页模式 */
  discoverMode?: ChatDiscoverMode;
}

export default function ChatPage({ initialMainView, discoverMode }: ChatPageProps) {
  const {
    urlSpaceId,
    urlRoomId,
    activeSpaceId,
    isPrivateChatMode,
    activeDocId,
    activeRoomId,
    targetMessageId,
    isRoomSettingRoute,
    spaceDetailRouteTab,
    isSpaceDetailRoute,
    navigate,
  } = useChatPageRoute();
  const [searchParam, _] = useSearchParams();
  const screenSize = useScreenSize();
  const {
    isOpenLeftDrawer,
    setIsOpenLeftDrawer,
    toggleLeftDrawer,
    closeLeftDrawer,
  } = useChatPageLeftDrawer({
    screenSize,
    isPrivateChatMode,
    urlSpaceId,
    urlRoomId,
  });

  useEffect(() => {
    useEntityHeaderOverrideStore.getState().hydrateFromLocalStorage();
    useDocHeaderOverrideStore.getState().hydrateFromLocalStorage();
  }, []);

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  const rooms = useMemo(() => userRoomQuery.data?.data?.rooms ?? [], [userRoomQuery.data?.data?.rooms]);
  const userSpacesQuery = useGetUserActiveSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  const activeSpaceInfoQuery = useGetSpaceInfoQuery(activeSpaceId ?? -1);
  const activeSpaceInfo = useMemo(() => activeSpaceInfoQuery.data?.data, [activeSpaceInfoQuery.data?.data]);

  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

  const [spaceOrderByUser, setSpaceOrderByUser] = useLocalStorage<Record<string, number[]>>("spaceOrderByUser", {});
  // key: userId -> spaceId -> roomIds
  const [roomOrderByUserAndSpace, setRoomOrderByUserAndSpace] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "roomOrderByUserAndSpace",
    {},
  );
  const [spaceRoomIdsByUser, setSpaceRoomIdsByUser] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "spaceRoomIdsByUser",
    {},
  );
  const activeSpace = activeSpaceInfo ?? spaces.find(space => space.spaceId === activeSpaceId);
  const activeSpaceIsArchived = activeSpace?.status === 2;
  const activeSpaceHeaderOverride = useEntityHeaderOverrideStore(state => (activeSpaceId ? state.headers[`space:${activeSpaceId}`] : undefined));
  const activeSpaceNameForUi = activeSpaceHeaderOverride?.title ?? activeSpace?.name;
  const activeSpaceAvatar = activeSpace?.avatar;
  const activeDocHeaderOverride = useDocHeaderOverrideStore(state => (activeDocId ? state.headers[activeDocId] : undefined));

  useEffect(() => {
    if (typeof window === "undefined")
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    let cancelled = false;
    void (async () => {
      try {
        const [{ ensureSpaceDocMeta, getOrCreateSpaceWorkspace }, { deleteSpaceDoc }] = await Promise.all([
          import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry"),
          import("@/components/chat/infra/blocksuite/deleteSpaceDoc"),
        ]);

        if (cancelled)
          return;

        if (activeSpace?.name) {
          ensureSpaceDocMeta({
            spaceId: activeSpaceId,
            docId: buildSpaceDocId({ kind: "space_description", spaceId: activeSpaceId }),
            title: activeSpace.name,
          });
        }
        for (const room of rooms) {
          const roomId = room?.roomId;
          if (typeof roomId !== "number" || !Number.isFinite(roomId) || roomId <= 0)
            continue;
          const title = String(room?.name ?? "").trim();
          if (!title)
            continue;
          ensureSpaceDocMeta({
            spaceId: activeSpaceId,
            docId: buildSpaceDocId({ kind: "room_description", roomId }),
            title,
          });
        }

        // 2) Best-effort cleanup: if local workspace still has docs for rooms that no longer exist, purge them.
        const ws = getOrCreateSpaceWorkspace(activeSpaceId) as any;
        const metas = (ws?.meta?.docMetas ?? []) as any[];
        if (!Array.isArray(metas) || metas.length === 0)
          return;

        const validRoomIds = new Set<number>();
        for (const room of rooms) {
          const roomId = room?.roomId;
          if (typeof roomId === "number" && Number.isFinite(roomId) && roomId > 0) {
            validRoomIds.add(roomId);
          }
        }

        const staleDocIds: string[] = [];
        for (const m of metas) {
          const id = String((m as any)?.id ?? "");
          if (!id)
            continue;
          const match = /^room:(\d+):description$/.exec(id);
          if (!match)
            continue;
          const roomId = Number(match[1]);
          if (!Number.isFinite(roomId) || roomId <= 0)
            continue;
          if (!validRoomIds.has(roomId)) {
            staleDocIds.push(id);
          }
        }

        if (staleDocIds.length > 0) {
          await Promise.allSettled(staleDocIds.map(docId => deleteSpaceDoc({ spaceId: activeSpaceId, docId })));
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSpace?.name, activeSpaceId, rooms]);

  const spaceSidebarTreeQuery = useGetSpaceSidebarTreeQuery(activeSpaceId ?? -1);
  const setSpaceSidebarTreeMutation = useSetSpaceSidebarTreeMutation();
  const sidebarTreeVersion = spaceSidebarTreeQuery.data?.data?.version ?? 0;
  const sidebarTree = useMemo(() => {
    return parseSidebarTree(spaceSidebarTreeQuery.data?.data?.treeJson);
  }, [spaceSidebarTreeQuery.data?.data?.treeJson]);

  const handleSaveSidebarTree = useCallback((tree: SidebarTree) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(tree),
    });
  }, [activeSpaceId, setSpaceSidebarTreeMutation, sidebarTreeVersion]);

  const setActiveSpaceId = useCallback((spaceId: number | null) => {
    setStoredChatIds({ spaceId, roomId: null });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    navigate(`/chat/${spaceId ?? "private"}/${""}?${newSearchParams.toString()}`);
  }, [isOpenLeftDrawer, navigate, searchParam, setStoredChatIds, screenSize]);
  const setActiveRoomId = useCallback((roomId: number | null, options?: { replace?: boolean }) => {
    setStoredChatIds({ spaceId: activeSpaceId, roomId });
    const newSearchParams = new URLSearchParams(searchParam);
    screenSize === "sm" && newSearchParams.set("leftDrawer", `${isOpenLeftDrawer}`);
    const nextRoomId = roomId ?? "";
    navigate(`/chat/${activeSpaceId ?? "private"}/${nextRoomId}?${newSearchParams.toString()}`, { replace: options?.replace });
  }, [activeSpaceId, isOpenLeftDrawer, navigate, screenSize, searchParam, setStoredChatIds]);

  const handleOpenPrivate = useCallback(() => {
    setActiveSpaceId(null);
    setActiveRoomId(null);
    navigate("/chat/private");
  }, [navigate, setActiveRoomId, setActiveSpaceId]);

  const [mainView, setMainView] = useState<ChatPageMainView>(() => initialMainView ?? "chat");
  const discoverModeForUi = discoverMode ?? "square";
  const [spaceDetailTab, setSpaceDetailTab] = useState<SpaceDetailTab>("members");
  const [roomSettingState, setRoomSettingState] = useState<RoomSettingState>(null);

  const handleSelectRoom = useCallback((roomId: number) => {
    setMainView("chat");
    setActiveRoomId(roomId);
  }, [setActiveRoomId, setMainView]);

  const handleSelectDoc = useCallback((docId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setMainView("chat");
    const parsed = parseSpaceDocId(docId);
    if (parsed?.kind === "independent") {
      navigate(`/chat/${activeSpaceId}/doc/${parsed.docId}`);
      return;
    }
    navigate(`/chat/${activeSpaceId}/doc/${encodeURIComponent(docId)}`);
  }, [activeSpaceId, navigate, setMainView]);

  const isKPInSpace = useMemo(() => {
    return Boolean(spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1));
  }, [globalContext.userId, spaceMembersQuery.data?.data]);

  const docMetasFromSidebarTree = useMemo(() => {
    return extractDocMetasFromSidebarTree(sidebarTree).filter((m) => {
      const parsed = parseSpaceDocId(m.id);
      return parsed?.kind === "independent";
    });
  }, [sidebarTree]);

  const mergeDocMetas = useCallback((...sources: Array<MinimalDocMeta[] | null | undefined>): MinimalDocMeta[] => {
    const map = new Map<string, MinimalDocMeta>();

    for (const list of sources) {
      for (const meta of list ?? []) {
        const id = typeof meta?.id === "string" ? meta.id : "";
        if (!id)
          continue;
        const title = typeof meta?.title === "string" && meta.title.trim().length > 0 ? meta.title : undefined;
        const imageUrl = typeof meta?.imageUrl === "string" && meta.imageUrl.trim().length > 0 ? meta.imageUrl : undefined;

        const existing = map.get(id);
        if (!existing) {
          map.set(id, { id, title, imageUrl });
          continue;
        }
        if (!existing.title && title) {
          existing.title = title;
        }
        if (!existing.imageUrl && imageUrl) {
          existing.imageUrl = imageUrl;
        }
      }
    }

    return [...map.values()];
  }, []);

  const [spaceDocMetas, setSpaceDocMetas] = useState<MinimalDocMeta[] | null>(null);

  const spaceDocTitleSyncTimerRef = useRef<number | null>(null);
  const spaceDocTitleSyncPendingRef = useRef<{ docId: number; title: string } | null>(null);
  const spaceDocTitleSyncLastRef = useRef<{ docId: number; title: string } | null>(null);
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && spaceDocTitleSyncTimerRef.current != null) {
        window.clearTimeout(spaceDocTitleSyncTimerRef.current);
      }
    };
  }, []);

  const activeDocTitleForTcHeader = useMemo(() => {
    if (!activeDocId)
      return "";

    const overrideTitle = typeof activeDocHeaderOverride?.title === "string" ? activeDocHeaderOverride.title.trim() : "";
    if (overrideTitle)
      return overrideTitle;

    const fromState = (spaceDocMetas ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromState === "string" && fromState.trim().length > 0)
      return fromState.trim();

    const fromTree = (docMetasFromSidebarTree ?? []).find(m => m.id === activeDocId)?.title;
    if (typeof fromTree === "string" && fromTree.trim().length > 0)
      return fromTree.trim();

    return "文档";
  }, [activeDocHeaderOverride?.title, activeDocId, docMetasFromSidebarTree, spaceDocMetas]);

  const handleDocTcHeaderChange = useCallback((payload: DocTcHeaderPayload) => {
    const docId = typeof payload?.docId === "string" ? payload.docId : "";
    if (!docId)
      return;

    const title = String(payload?.header?.title ?? "").trim();
    const imageUrl = String(payload?.header?.imageUrl ?? "").trim();
    useDocHeaderOverrideStore.getState().setHeader({ docId, header: { title, imageUrl } });

    if (!title)
      return;

    setSpaceDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0)
        return prev;

      const idx = prev.findIndex(m => m?.id === docId);
      if (idx < 0)
        return prev;

      const currentTitle = typeof prev[idx]?.title === "string" ? prev[idx]!.title!.trim() : "";
      if (currentTitle === title)
        return prev;

      const next = [...prev];
      next[idx] = { ...next[idx], title };
      return next;
    });

    if (typeof window !== "undefined") {
      try {
        void (async () => {
          const { parseDescriptionDocId } = await import("@/components/chat/infra/blocksuite/descriptionDocId");
          const key = parseDescriptionDocId(docId);
          if (!key || key.entityType !== "space_doc")
            return;

          spaceDocTitleSyncPendingRef.current = { docId: key.entityId, title };
          if (spaceDocTitleSyncTimerRef.current != null) {
            window.clearTimeout(spaceDocTitleSyncTimerRef.current);
          }
          spaceDocTitleSyncTimerRef.current = window.setTimeout(() => {
            const pending = spaceDocTitleSyncPendingRef.current;
            if (!pending)
              return;
            const last = spaceDocTitleSyncLastRef.current;
            if (last && last.docId === pending.docId && last.title === pending.title)
              return;

            void tuanchat.request.request<any>({
              method: "PUT",
              url: "/space/doc/title",
              body: { docId: pending.docId, title: pending.title },
              mediaType: "application/json",
            }).then(() => {
              spaceDocTitleSyncLastRef.current = pending;
            }).catch(() => {
              // ignore
            });
          }, 800);
        })();
      }
      catch {
        // ignore
      }
    }
  }, []);

  const loadSpaceDocMetas = useCallback(async (): Promise<MinimalDocMeta[]> => {
    if (typeof window === "undefined")
      return [];
    if (!activeSpaceId || activeSpaceId <= 0)
      return [];

    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      const ws = registry.getOrCreateSpaceWorkspace(activeSpaceId) as any;
      const metas = (ws?.meta?.docMetas ?? []) as any[];
      const headerOverrides = useDocHeaderOverrideStore.getState().headers;
      const list = metas
        .filter(m => typeof m?.id === "string" && m.id.length > 0)
        .map((m) => {
          const id = String(m.id);
          const title = typeof m?.title === "string" ? m.title : undefined;
          const imageUrl = typeof headerOverrides?.[id]?.imageUrl === "string" ? headerOverrides[id]!.imageUrl : undefined;
          return { id, title, imageUrl } satisfies MinimalDocMeta;
        });
      return list;
    }
    catch {
      return [];
    }
  }, [activeSpaceId]);

  useEffect(() => {
    if (!activeSpaceId || activeSpaceId <= 0) {
      setSpaceDocMetas(null);
      return;
    }
    if (!isKPInSpace) {
      setSpaceDocMetas([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const fromWorkspace = await loadSpaceDocMetas();
      const merged = mergeDocMetas(fromWorkspace, docMetasFromSidebarTree);
      if (cancelled)
        return;
      setSpaceDocMetas(merged);

      try {
        const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
        for (const m of docMetasFromSidebarTree) {
          if (typeof m?.id !== "string" || !m.id)
            continue;
          registry.ensureSpaceDocMeta({ spaceId: activeSpaceId, docId: m.id, title: m.title });
        }
      }
      catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeSpaceId, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas]);

  const buildTreeBaseForWrite = useCallback((docMetas: MinimalDocMeta[]): SidebarTree => {
    return sidebarTree ?? buildDefaultSidebarTree({
      roomsInSpace: rooms.filter(r => r.spaceId === activeSpaceId),
      docMetas,
      includeDocs: true,
    });
  }, [activeSpaceId, rooms, sidebarTree]);

  const resetSidebarTreeToDefault = useCallback(async () => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    const docMetas = isKPInSpace
      ? mergeDocMetas(
          spaceDocMetas ?? [],
          docMetasFromSidebarTree,
          await loadSpaceDocMetas(),
        )
      : [];

    if (isKPInSpace) {
      setSpaceDocMetas(docMetas);
    }

    const defaultTree = buildDefaultSidebarTree({
      roomsInSpace: rooms.filter(r => r.spaceId === activeSpaceId),
      docMetas,
      includeDocs: isKPInSpace,
    });

    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(defaultTree),
    });
  }, [activeSpaceId, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas, rooms, setSpaceDocMetas, setSpaceSidebarTreeMutation, sidebarTreeVersion, spaceDocMetas]);

  const appendNodeToCategory = useCallback((params: {
    tree: SidebarTree;
    categoryId: string;
    node: SidebarLeafNode;
  }): SidebarTree => {
    const next = JSON.parse(JSON.stringify(params.tree)) as SidebarTree;
    const categories = Array.isArray(next.categories) ? next.categories : [];
    const target = categories.find(c => c?.categoryId === params.categoryId) ?? categories[0];
    if (!target)
      return next;
    target.items = Array.isArray(target.items) ? target.items : [];
    if (target.items.some(i => i?.nodeId === params.node.nodeId))
      return next;
    target.items.push(params.node);
    return next;
  }, []);

  const requestCreateDocInCategory = useCallback(async (categoryId: string, titleOverride?: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    if (!isKPInSpace)
      return;
    const title = (titleOverride ?? "未命名文档").trim() || "未命名文档";
    let createdDocId: number | null = null;
    try {
      const resp = await tuanchat.request.request<any>({
        method: "POST",
        url: "/space/doc",
        body: { spaceId: activeSpaceId, title },
        mediaType: "application/json",
      });
      const id = Number((resp as any)?.data?.docId);
      if (Number.isFinite(id) && id > 0) {
        createdDocId = id;
      }
    }
    catch (err) {
      console.error("[SpaceDoc] create failed", err);
    }

    if (!createdDocId) {
      toast.error("创建文档失败，请重试");
      return;
    }

    const docId = buildSpaceDocId({ kind: "independent", docId: createdDocId });

    const baseDocMetas = mergeDocMetas(
      spaceDocMetas ?? [],
      docMetasFromSidebarTree,
      await loadSpaceDocMetas(),
    );
    const nextDocMetas = baseDocMetas.some(m => m.id === docId)
      ? baseDocMetas
      : [...baseDocMetas, { id: docId, title }];

    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      registry.ensureSpaceDocMeta({ spaceId: activeSpaceId, docId, title });
      setSpaceDocMetas(nextDocMetas);
    }
    catch {
      // ignore
    }

    const base = buildTreeBaseForWrite(nextDocMetas);
    const next = appendNodeToCategory({
      tree: base,
      categoryId,
      node: { nodeId: `doc:${docId}`, type: "doc", targetId: docId, fallbackTitle: title },
    });
    setSpaceSidebarTreeMutation.mutate({
      spaceId: activeSpaceId,
      expectedVersion: sidebarTreeVersion,
      treeJson: JSON.stringify(next),
    });

    setMainView("chat");
    navigate(`/chat/${activeSpaceId}/doc/${createdDocId}`);
  }, [activeSpaceId, appendNodeToCategory, buildTreeBaseForWrite, docMetasFromSidebarTree, isKPInSpace, loadSpaceDocMetas, mergeDocMetas, navigate, setMainView, setSpaceDocMetas, setSpaceSidebarTreeMutation, sidebarTreeVersion, spaceDocMetas]);

  const openRoomSettingPage = useCallback((roomId: number | null, tab?: RoomSettingTab) => {
    if (roomId == null)
      return;

    if (activeSpaceId == null)
      return;

    const nextTab: RoomSettingTab = tab ?? "setting";
    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${roomId}/setting${qs ? `?${qs}` : ""}`);

    setRoomSettingState({ roomId, tab: nextTab });
    setMainView("roomSetting");
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [activeSpaceId, navigate, searchParam]);

  const closeRoomSettingPage = useCallback(() => {
    setRoomSettingState(null);
    setMainView("chat");

    if (activeSpaceId == null || activeRoomId == null)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${activeRoomId}${qs ? `?${qs}` : ""}`);
  }, [activeRoomId, activeSpaceId, navigate, searchParam]);

  const urlDrivenRoomSettingRef = useRef(false);
  useEffect(() => {
    if (isPrivateChatMode)
      return;

    if (isRoomSettingRoute) {
      urlDrivenRoomSettingRef.current = true;
      if (activeSpaceId == null || activeRoomId == null)
        return;

      const urlTab = searchParam.get("tab");
      const nextTab: RoomSettingTab = urlTab === "role" || urlTab === "setting" ? urlTab : "setting";
      setRoomSettingState({ roomId: activeRoomId, tab: nextTab });
      setMainView("roomSetting");
      return;
    }

    if (urlDrivenRoomSettingRef.current) {
      urlDrivenRoomSettingRef.current = false;
      setRoomSettingState(null);
      setMainView("chat");
    }
  }, [activeRoomId, activeSpaceId, isPrivateChatMode, isRoomSettingRoute, searchParam]);

  const urlDrivenSpaceDetailRef = useRef(false);
  useEffect(() => {
    if (isPrivateChatMode)
      return;

    if (isSpaceDetailRoute) {
      urlDrivenSpaceDetailRef.current = true;
      setRoomSettingState(null);

      setSpaceDetailTab(spaceDetailRouteTab ?? "setting");
      setMainView("spaceDetail");
      return;
    }

    if (urlDrivenSpaceDetailRef.current) {
      urlDrivenSpaceDetailRef.current = false;
      if (isRoomSettingRoute)
        return;
      setMainView("chat");
    }
  }, [isPrivateChatMode, isRoomSettingRoute, isSpaceDetailRoute, spaceDetailRouteTab]);

  const hasInitPrivateChatRef = useRef(false);
  useEffect(() => {
    if (hasInitPrivateChatRef.current)
      return;
    if (!isPrivateChatMode)
      return;
    hasInitPrivateChatRef.current = true;

    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

  useEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;
    const roomIds = (rooms ?? [])
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    const userKey = String(userId);
    const spaceKey = String(activeSpaceId);
    setSpaceRoomIdsByUser((prev) => {
      const prevUserMap = prev[userKey] ?? {};
      const prevRoomIds = prevUserMap[spaceKey] ?? [];
      if (prevRoomIds.length === roomIds.length && prevRoomIds.every((v, i) => v === roomIds[i])) {
        return prev;
      }
      return {
        ...prev,
        [userKey]: {
          ...prevUserMap,
          [spaceKey]: roomIds,
        },
      };
    });
  }, [activeSpaceId, isPrivateChatMode, rooms, setSpaceRoomIdsByUser, userId]);

  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  const [isCreateInCategoryOpen, setIsCreateInCategoryOpen] = useSearchParamsState<boolean>("createInCategoryPop", false);

  const [pendingCreateInCategoryId, setPendingCreateInCategoryId] = useState<string | null>(null);
  const [createInCategoryMode, setCreateInCategoryMode] = useState<"room" | "doc">("room");
  const [createDocTitle, setCreateDocTitle] = useState("未命名文档");
  const openCreateInCategory = useCallback((categoryId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setPendingCreateInCategoryId(categoryId);
    setCreateInCategoryMode(getDefaultCreateInCategoryMode({ categoryId, isKPInSpace }));
    setCreateDocTitle("未命名文档");
    setIsCreateInCategoryOpen(true);
  }, [activeSpaceId, isKPInSpace, setIsCreateInCategoryOpen]);

  const closeCreateInCategory = useCallback(() => {
    setIsCreateInCategoryOpen(false);
    setPendingCreateInCategoryId(null);
  }, [setIsCreateInCategoryOpen]);

  const createDocInSelectedCategory = useCallback(async () => {
    const categoryId = pendingCreateInCategoryId;
    if (!categoryId)
      return;
    if (!isKPInSpace)
      return;
    await requestCreateDocInCategory(categoryId, createDocTitle);
    closeCreateInCategory();
  }, [closeCreateInCategory, createDocTitle, isKPInSpace, pendingCreateInCategoryId, requestCreateDocInCategory]);

  const handleRoomCreated = useCallback((roomId?: number) => {
    const categoryId = pendingCreateInCategoryId;
    setPendingCreateInCategoryId(null);

    if (roomId) {
      setMainView("chat");
      setActiveRoomId(roomId);
    }

    if (roomId && categoryId && activeSpaceId && activeSpaceId > 0) {
      const base = buildTreeBaseForWrite(spaceDocMetas ?? []);
      const next = appendNodeToCategory({
        tree: base,
        categoryId,
        node: { nodeId: `room:${roomId}`, type: "room", targetId: roomId },
      });
      setSpaceSidebarTreeMutation.mutate({
        spaceId: activeSpaceId,
        expectedVersion: sidebarTreeVersion,
        treeJson: JSON.stringify(next),
      });
    }

    setIsCreateInCategoryOpen(false);
  }, [activeSpaceId, appendNodeToCategory, buildTreeBaseForWrite, pendingCreateInCategoryId, setActiveRoomId, setIsCreateInCategoryOpen, setMainView, setSpaceSidebarTreeMutation, sidebarTreeVersion, spaceDocMetas]);

  const openSpaceDetailPanel = useCallback((tab: SpaceDetailTab) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();
    navigate(`/chat/${activeSpaceId}/${tab}${qs ? `?${qs}` : ""}`);

    setSpaceDetailTab(tab);
    setRoomSettingState(null);
    setMainView("spaceDetail");
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [activeSpaceId, isPrivateChatMode, navigate, searchParam]);

  const closeSpaceDetailPanel = useCallback(() => {
    setMainView("chat");

    if (activeSpaceId == null || isPrivateChatMode)
      return;

    const nextSearchParams = new URLSearchParams(searchParam);
    nextSearchParams.delete("tab");
    const qs = nextSearchParams.toString();

    const fallbackRoomId = storedIds.spaceId === activeSpaceId ? storedIds.roomId : null;
    const nextRoomId = (typeof fallbackRoomId === "number" && Number.isFinite(fallbackRoomId)) ? fallbackRoomId : "";
    navigate(`/chat/${activeSpaceId}/${nextRoomId}${qs ? `?${qs}` : ""}`);
  }, [activeSpaceId, isPrivateChatMode, navigate, searchParam, storedIds.roomId, storedIds.spaceId]);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  const [inviteRoomId, setInviteRoomId] = useState<number | null>(null);
  const [_sideDrawerState, _setSideDrawerState] = useSearchParamsState<"none" | "user" | "role" | "search" | "initiative" | "map">("rightSideDrawer", "none");

  const spaceOrder = useMemo(() => {
    return spaceOrderByUser[String(userId)] ?? [];
  }, [spaceOrderByUser, userId]);

  const orderedSpaces = useMemo(() => {
    if (!Array.isArray(spaces) || spaces.length <= 1) {
      return spaces;
    }

    const orderIndex = new Map<number, number>();
    for (let i = 0; i < spaceOrder.length; i++) {
      orderIndex.set(spaceOrder[i]!, i);
    }

    return [...spaces]
      .map((space, originalIndex) => {
        const sid = space.spaceId ?? -1;
        const order = orderIndex.get(sid);
        return { space, originalIndex, order };
      })
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo)
          return ao - bo;
        return a.originalIndex - b.originalIndex;
      })
      .map(x => x.space);
  }, [spaces, spaceOrder]);

  const orderedSpaceIds = useMemo(() => {
    return orderedSpaces
      .map(s => s.spaceId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [orderedSpaces]);

  const setUserSpaceOrder = useCallback((nextOrder: number[]) => {
    setSpaceOrderByUser(prev => ({
      ...prev,
      [String(userId)]: nextOrder,
    }));
  }, [setSpaceOrderByUser, userId]);

  const roomOrder = useMemo(() => {
    if (activeSpaceId == null || isPrivateChatMode)
      return [];
    return roomOrderByUserAndSpace[String(userId)]?.[String(activeSpaceId)] ?? [];
  }, [activeSpaceId, isPrivateChatMode, roomOrderByUserAndSpace, userId]);

  const orderedRooms = useMemo(() => {
    if (!Array.isArray(rooms) || rooms.length <= 1) {
      return rooms;
    }

    const orderIndex = new Map<number, number>();
    for (let i = 0; i < roomOrder.length; i++) {
      orderIndex.set(roomOrder[i]!, i);
    }

    return [...rooms]
      .map((room, originalIndex) => {
        const rid = room.roomId ?? -1;
        const order = orderIndex.get(rid);
        return { room, originalIndex, order };
      })
      .sort((a, b) => {
        const ao = a.order ?? Number.POSITIVE_INFINITY;
        const bo = b.order ?? Number.POSITIVE_INFINITY;
        if (ao !== bo)
          return ao - bo;
        return a.originalIndex - b.originalIndex;
      })
      .map(x => x.room);
  }, [rooms, roomOrder]);

  useLayoutEffect(() => {
    if (isPrivateChatMode)
      return;
    if (activeSpaceId == null)
      return;

    const isRoomIdMissingInUrl = !urlRoomId || urlRoomId === "null";
    if (!isRoomIdMissingInUrl)
      return;

    const firstRoomId = orderedRooms[0]?.roomId;
    if (typeof firstRoomId !== "number" || !Number.isFinite(firstRoomId))
      return;

    setActiveRoomId(firstRoomId, { replace: true });
  }, [activeSpaceId, isPrivateChatMode, orderedRooms, setActiveRoomId, urlRoomId]);

  const orderedRoomIds = useMemo(() => {
    return orderedRooms
      .map(r => r.roomId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
  }, [orderedRooms]);

  const setUserRoomOrder = useCallback((nextOrder: number[]) => {
    if (activeSpaceId == null || isPrivateChatMode)
      return;
    const userKey = String(userId);
    const spaceKey = String(activeSpaceId);
    setRoomOrderByUserAndSpace(prev => ({
      ...prev,
      [userKey]: {
        ...(prev[userKey] ?? {}),
        [spaceKey]: nextOrder,
      },
    }));
  }, [activeSpaceId, isPrivateChatMode, setRoomOrderByUserAndSpace, userId]);

  const privateMessageList = usePrivateMessageList({ globalContext, userId });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingFriendRequestCount = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list ?? [];
    if (!Array.isArray(list))
      return 0;
    return list.filter((r: any) => r?.type === "received" && r?.status === 1).length;
  }, [friendRequestPageQuery.data?.data?.list]);

  const privateEntryBadgeCount = useMemo(() => {
    return privateTotalUnreadMessages + pendingFriendRequestCount;
  }, [pendingFriendRequestCount, privateTotalUnreadMessages]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: number } | null>(null);
  const [spaceContextMenu, setSpaceContextMenu] = useState<{ x: number; y: number; spaceId: number } | null>(null);

  function closeContextMenu() {
    setContextMenu(null);
  }

  function closeSpaceContextMenu() {
    setSpaceContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }

  function handleSpaceContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const spaceElement = target.closest("[data-space-id]");
    const rawSpaceId = spaceElement?.getAttribute("data-space-id");
    if (!rawSpaceId)
      return;
    setSpaceContextMenu({ x: e.clientX, y: e.clientY, spaceId: Number(rawSpaceId) });
  }

  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (spaceContextMenu) {
      window.addEventListener("click", closeSpaceContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeSpaceContextMenu);
    };
  }, [spaceContextMenu]);

  const websocketUtils = useGlobalContext().websocketUtils;
  const unreadMessagesNumber = websocketUtils.unreadMessagesNumber;
  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadMessagesNumber).reduce((sum, count) => sum + count, 0);
  }, [unreadMessagesNumber]);
  const unreadDebugEnabled = typeof window !== "undefined" && localStorage.getItem("tc:unread:debug") === "1";
  const unreadDebugSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    if (!unreadDebugEnabled) {
      unreadDebugSnapshotRef.current = null;
      return;
    }

    const path = `${window.location.pathname}${window.location.search}`;
    const groupDetails = Object.entries(unreadMessagesNumber)
      .map(([roomId, unread]) => ({
        roomId: Number(roomId),
        unread: unread ?? 0,
      }))
      .sort((a, b) => a.roomId - b.roomId);
    const privateDetails = privateMessageList.realTimeContacts
      .map(contactId => ({
        contactId,
        unread: privateUnreadMessageNumbers[contactId] ?? 0,
        isActive: isPrivateChatMode && activeRoomId === contactId,
      }))
      .sort((a, b) => a.contactId - b.contactId);

    const snapshot = {
      path,
      isPrivateChatMode,
      activeRoomId,
      totalUnreadMessages,
      privateTotalUnreadMessages,
      pendingFriendRequestCount,
      privateEntryBadgeCount,
      groupUnreadTotal: totalUnreadMessages,
      groupDetails,
      privateDetails,
    };
    const nextSnapshot = JSON.stringify(snapshot);
    if (unreadDebugSnapshotRef.current === nextSnapshot) {
      return;
    }
    unreadDebugSnapshotRef.current = nextSnapshot;
    console.warn(`[tc:unread] ${path}`, snapshot);
  }, [
    activeRoomId,
    isPrivateChatMode,
    pendingFriendRequestCount,
    privateEntryBadgeCount,
    privateMessageList.realTimeContacts,
    privateTotalUnreadMessages,
    privateUnreadMessageNumbers,
    totalUnreadMessages,
    unreadDebugEnabled,
    unreadMessagesNumber,
  ]);
  useEffect(() => {
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, "");
    if (totalUnreadMessages > 0) {
      document.title = `(${totalUnreadMessages}) ${originalTitle}`;
      return () => {
        document.title = originalTitle;
      };
    }
    document.title = originalTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [totalUnreadMessages]);

  // spaceContext
  const spaceContext: SpaceContextType = useMemo((): SpaceContextType => {
    return {
      spaceId: activeSpaceId ?? -1,
      isSpaceOwner: !!spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1),
      setActiveSpaceId,
      setActiveRoomId,
      toggleLeftDrawer,
      ruleId: spaces.find(space => space.spaceId === activeSpaceId)?.ruleId,
      spaceMembers: spaceMembersQuery.data?.data ?? [],
    };
  }, [activeSpaceId, globalContext.userId, setActiveRoomId, setActiveSpaceId, spaceMembersQuery.data?.data, spaces, toggleLeftDrawer]);

  const isSpaceOwner = Boolean(spaceContext.isSpaceOwner);

  const getSpaceUnreadMessagesNumber = (spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      if (activeRoomId !== roomId)
        result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  };

  const addRoomMemberMutation = useAddRoomMemberMutation();
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  const handleInvitePlayer = (roomId: number) => {
    setInviteRoomId(roomId);
  };

  const handleAddRoomMember = (userId: number) => {
    if (inviteRoomId) {
      addRoomMemberMutation.mutate({
        roomId: inviteRoomId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setInviteRoomId(null);
        },
      });
    }
  };

  const handleAddSpaceMember = (userId: number) => {
    if (activeSpaceId) {
      addSpaceMemberMutation.mutate({
        spaceId: activeSpaceId,
        userIdList: [userId],
      }, {
        onSuccess: () => {
          setIsMemberHandleOpen(false);
        },
      });
    }
  };

  const handleAddSpacePlayer = (userId: number) => {
    if (!activeSpaceId)
      return;

    const isAlreadyMember = (spaceMembersQuery.data?.data ?? []).some(m => m.userId === userId);

    const grantPlayer = () => {
      setPlayerMutation.mutate({
        spaceId: activeSpaceId,
        uidList: [userId],
      }, {
        onSettled: () => {
          setIsMemberHandleOpen(false);
        },
      });
    };

    if (isAlreadyMember) {
      grantPlayer();
      return;
    }

    addSpaceMemberMutation.mutate({
      spaceId: activeSpaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        grantPlayer();
      },
      onError: () => {
        grantPlayer();
      },
    });
  };

  const mainContent = (
    <ChatPageMainContent
      isPrivateChatMode={isPrivateChatMode}
      activeRoomId={activeRoomId}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      mainView={mainView}
      discoverMode={discoverModeForUi}
      activeSpaceId={activeSpaceId}
      spaceDetailTab={spaceDetailTab}
      onCloseSpaceDetail={closeSpaceDetailPanel}
      roomSettingState={roomSettingState}
      onCloseRoomSetting={closeRoomSettingPage}
      activeDocId={activeDocId}
      isKPInSpace={isKPInSpace}
      activeDocTitleForTcHeader={activeDocTitleForTcHeader}
      onDocTcHeaderChange={handleDocTcHeaderChange}
      targetMessageId={targetMessageId}
    />
  );
  const sidePanelContent = (
    <ChatPageSidePanelContent
      isPrivateChatMode={isPrivateChatMode}
      mainView={mainView}
      discoverMode={discoverModeForUi}
      onCloseLeftDrawer={closeLeftDrawer}
      onToggleLeftDrawer={toggleLeftDrawer}
      isLeftDrawerOpen={isOpenLeftDrawer}
      currentUserId={userId}
      activeSpaceId={activeSpaceId}
      activeSpaceName={activeSpaceNameForUi}
      activeSpaceIsArchived={activeSpaceIsArchived}
      isSpaceOwner={isSpaceOwner}
      isKPInSpace={isKPInSpace}
      rooms={orderedRooms}
      roomOrderIds={orderedRoomIds}
      onReorderRoomIds={setUserRoomOrder}
      sidebarTree={sidebarTree}
      onSaveSidebarTree={handleSaveSidebarTree}
      onResetSidebarTreeToDefault={resetSidebarTreeToDefault}
      docMetas={spaceDocMetas ?? []}
      onSelectDoc={handleSelectDoc}
      activeRoomId={activeRoomId}
      activeDocId={activeDocId}
      unreadMessagesNumber={unreadMessagesNumber}
      onContextMenu={handleContextMenu}
      onInviteMember={() => setIsMemberHandleOpen(true)}
      onOpenSpaceDetailPanel={openSpaceDetailPanel}
      onSelectRoom={handleSelectRoom}
      onOpenRoomSetting={openRoomSettingPage}
      setIsOpenLeftDrawer={setIsOpenLeftDrawer}
      onOpenCreateInCategory={openCreateInCategory}
    />
  );
  const spaceSidebar = (
    <ChatSpaceSidebar
      isPrivateChatMode={isPrivateChatMode}
      spaces={orderedSpaces}
      spaceOrderIds={orderedSpaceIds}
      onReorderSpaceIds={setUserSpaceOrder}
      activeSpaceId={activeSpaceId}
      getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
      privateUnreadMessagesNumber={privateEntryBadgeCount}
      onOpenPrivate={handleOpenPrivate}
      onToggleLeftDrawer={toggleLeftDrawer}
      isLeftDrawerOpen={isOpenLeftDrawer}
      onSelectSpace={setActiveSpaceId}
      onCreateSpace={() => {
        setIsSpaceHandleOpen(true);
      }}
      onSpaceContextMenu={handleSpaceContextMenu}
    />
  );
  const leftDrawerToggleLabel = isOpenLeftDrawer ? "收起侧边栏" : "展开侧边栏";
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer;

  return (
    <SpaceContext value={spaceContext}>
      <ChatPageLayout
        screenSize={screenSize}
        isOpenLeftDrawer={isOpenLeftDrawer}
        shouldShowLeftDrawerToggle={shouldShowLeftDrawerToggle}
        leftDrawerToggleLabel={leftDrawerToggleLabel}
        toggleLeftDrawer={toggleLeftDrawer}
        chatLeftPanelWidth={chatLeftPanelWidth}
        setChatLeftPanelWidth={setChatLeftPanelWidth}
        spaceSidebar={spaceSidebar}
        sidePanelContent={sidePanelContent}
        mainContent={mainContent}
      />
      <ChatPageModals
        isSpaceHandleOpen={isSpaceHandleOpen}
        setIsSpaceHandleOpen={setIsSpaceHandleOpen}
        isCreateInCategoryOpen={isCreateInCategoryOpen}
        closeCreateInCategory={closeCreateInCategory}
        createInCategoryMode={createInCategoryMode}
        setCreateInCategoryMode={setCreateInCategoryMode}
        isKPInSpace={isKPInSpace}
        createDocTitle={createDocTitle}
        setCreateDocTitle={setCreateDocTitle}
        pendingCreateInCategoryId={pendingCreateInCategoryId}
        createDocInSelectedCategory={createDocInSelectedCategory}
        activeSpaceId={activeSpaceId}
        activeSpaceAvatar={activeSpaceAvatar}
        onRoomCreated={handleRoomCreated}
        inviteRoomId={inviteRoomId}
        setInviteRoomId={setInviteRoomId}
        onAddRoomMember={handleAddRoomMember}
        isMemberHandleOpen={isMemberHandleOpen}
        setIsMemberHandleOpen={setIsMemberHandleOpen}
        onAddSpaceMember={handleAddSpaceMember}
        onAddSpacePlayer={handleAddSpacePlayer}
      />
      <ChatPageContextMenu
        contextMenu={contextMenu}
        unreadMessagesNumber={unreadMessagesNumber}
        activeRoomId={activeRoomId}
        onClose={closeContextMenu}
        onInvitePlayer={handleInvitePlayer}
        onOpenRoomSetting={openRoomSettingPage}
      />

      <SpaceContextMenu
        contextMenu={spaceContextMenu}
        isSpaceOwner={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.userId === globalContext.userId
            : false
        }
        isArchived={
          spaceContextMenu
            ? spaces.find(space => space.spaceId === spaceContextMenu.spaceId)?.status === 2
            : false
        }
        onClose={closeSpaceContextMenu}
      />
    </SpaceContext>
  );
}
