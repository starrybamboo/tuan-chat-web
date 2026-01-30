import type { SpaceContextType } from "@/components/chat/core/spaceContext";
import type { MinimalDocMeta, SidebarLeafNode, SidebarTree } from "@/components/chat/room/sidebarTree";
import {
  useAddRoomMemberMutation,
  useAddSpaceMemberMutation,
  useGetSpaceMembersQuery,
  useGetUserRoomsQuery,
  useGetUserSpacesQuery,
  useSetPlayerMutation,
} from "api/hooks/chatQueryHooks";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";
import { useGetSpaceSidebarTreeQuery, useSetSpaceSidebarTreeMutation } from "api/hooks/spaceSidebarTreeHooks";
import { tuanchat } from "api/instance";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import ChatDiscoverNavPanel from "@/components/chat/discover/chatDiscoverNavPanel";
import DiscoverArchivedSpacesView from "@/components/chat/discover/discoverArchivedSpacesView";
import { buildSpaceDocId, parseSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import ChatRoomListPanel from "@/components/chat/room/chatRoomListPanel";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import RoomWindow from "@/components/chat/room/roomWindow";
import { buildDefaultSidebarTree, extractDocMetasFromSidebarTree, parseSidebarTree } from "@/components/chat/room/sidebarTree";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";
import SpaceDetailPanel from "@/components/chat/space/drawers/spaceDetailPanel";
import SpaceInvitePanel from "@/components/chat/space/spaceInvitePanel";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useEntityHeaderOverrideStore } from "@/components/chat/stores/entityHeaderOverrideStore";
import { getDefaultCreateInCategoryMode } from "@/components/chat/utils/createInCategoryMode";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import CreateSpaceWindow from "@/components/chat/window/createSpaceWindow";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useScreenSize } from "@/components/common/customHooks/useScreenSize";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import FriendsPage from "@/components/privateChat/FriendsPage";
import { usePrivateMessageList } from "@/components/privateChat/hooks/usePrivateMessageList";
import { useUnreadCount } from "@/components/privateChat/hooks/useUnreadCount";
import RightChatView from "@/components/privateChat/RightChatView";
import { SidebarSimpleIcon } from "@/icons";

/**
 * chat板块的主组件
 */
export type ChatPageMainView = "chat" | "spaceDetail" | "roomSetting" | "discover";
export type ChatDiscoverMode = "square" | "my";

export interface ChatPageProps {
  /**
   * 用于特殊入口（如 /chat/discover）指定初始主视图。
   * 注意：主视图仍以组件内部状态为准（不做 URL 全量映射）。
   */
  initialMainView?: ChatPageMainView;
  discoverMode?: ChatDiscoverMode;
}

export default function ChatPage({ initialMainView, discoverMode }: ChatPageProps) {
  const { spaceId: urlSpaceId, roomId: urlRoomId, messageId: urlMessageId } = useParams();
  const activeSpaceId = Number(urlSpaceId) || null;
  const [searchParam, _] = useSearchParams();
  const navigate = useNavigate();

  const isPrivateChatMode = urlSpaceId === "private";

  const isDocRoute = !isPrivateChatMode && urlRoomId === "doc" && typeof urlMessageId === "string" && urlMessageId.length > 0;
  const activeDocId = (() => {
    if (!isDocRoute)
      return null;

    const decoded = decodeURIComponent(urlMessageId as string);

    // URL 传纯数字 docId：内部映射为 blocksuite docId（sdoc:<id>:description）。
    if (/^\d+$/.test(decoded)) {
      const id = Number(decoded);
      if (Number.isFinite(id) && id > 0) {
        return buildSpaceDocId({ kind: "independent", docId: id });
      }
    }

    // 不兼容旧的 sdoc:<id>:description（应使用纯数字 URL）
    const parsed = parseSpaceDocId(decoded);
    if (parsed?.kind === "independent") {
      return null;
    }

    // 其它 docId（如 udoc:<id>:description）仍允许通过 URL 直达
    return decoded;
  })();

  useEffect(() => {
    if (!isDocRoute)
      return;
    if (!activeSpaceId || activeSpaceId <= 0)
      return;

    try {
      const decoded = decodeURIComponent(urlMessageId as string);
      const parsed = parseSpaceDocId(decoded);
      if (parsed?.kind === "independent") {
        toast.error("旧文档链接已失效，请使用纯数字链接");
        navigate(`/chat/${activeSpaceId}`);
      }
    }
    catch {
      // ignore
    }
  }, [activeSpaceId, isDocRoute, navigate, urlMessageId]);

  const activeRoomId = isDocRoute ? null : (Number(urlRoomId) || null);
  const targetMessageId = isDocRoute ? null : (Number(urlMessageId) || null);

  const isRoomSettingRoute = !isDocRoute && urlMessageId === "setting";
  const spaceDetailRouteTab: SpaceDetailTab | null = (!isPrivateChatMode && !urlMessageId && (urlRoomId === "members" || urlRoomId === "workflow" || urlRoomId === "setting" || urlRoomId === "trpg"))
    ? urlRoomId
    : null;
  const isSpaceDetailRoute = spaceDetailRouteTab != null;

  const screenSize = useScreenSize();

  useEffect(() => {
    useEntityHeaderOverrideStore.getState().hydrateFromLocalStorage();
    useDocHeaderOverrideStore.getState().hydrateFromLocalStorage();
  }, []);

  const [isOpenLeftDrawer, setIsOpenLeftDrawer] = useState(() => {
    if (screenSize !== "sm") {
      return true;
    }
    return !(urlSpaceId && urlRoomId) || (!urlRoomId && isPrivateChatMode) || !isPrivateChatMode;
  });

  const toggleLeftDrawer = useCallback(() => {
    setIsOpenLeftDrawer(prev => !prev);
  }, []);
  const closeLeftDrawer = useCallback(() => {
    if (screenSize === "sm") {
      setIsOpenLeftDrawer(false);
    }
  }, [screenSize]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const className = "chat-lock-scroll";
    const body = document.body;
    if (screenSize === "sm") {
      body.classList.add(className);
    }
    else {
      body.classList.remove(className);
    }
    return () => {
      body.classList.remove(className);
    };
  }, [screenSize]);

  const chatLeftPanelWidth = useDrawerPreferenceStore(state => state.chatLeftPanelWidth);
  const setChatLeftPanelWidth = useDrawerPreferenceStore(state => state.setChatLeftPanelWidth);

  const [storedIds, setStoredChatIds] = useLocalStorage<{ spaceId?: number | null; roomId?: number | null }>("storedChatIds", {});
  const userRoomQuery = useGetUserRoomsQuery(activeSpaceId ?? -1);
  const spaceMembersQuery = useGetSpaceMembersQuery(activeSpaceId ?? -1);
  // 当前激活的space对应的rooms。
  const rooms = useMemo(() => userRoomQuery.data?.data?.rooms ?? [], [userRoomQuery.data?.data?.rooms]);
  // 获取用户空间列表
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  // 获取当前用户信息（需要在后续 effect / memo 中使用）
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;

  // space 自定义排序（纯本地）
  // 用一个固定 key 保存所有用户的排序，避免 useLocalStorage 不支持动态 key 的问题。
  const [spaceOrderByUser, setSpaceOrderByUser] = useLocalStorage<Record<string, number[]>>("spaceOrderByUser", {});
  // room 自定义排序（纯本地）
  // key: userId -> spaceId -> roomIds
  const [roomOrderByUserAndSpace, setRoomOrderByUserAndSpace] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "roomOrderByUserAndSpace",
    {},
  );
  // 用于减少 /room/list 重复请求：缓存 space -> roomIds（按 user 分组）
  const [spaceRoomIdsByUser, setSpaceRoomIdsByUser] = useLocalStorage<Record<string, Record<string, number[]>>>(
    "spaceRoomIdsByUser",
    {},
  );
  const activeSpace = spaces.find(space => space.spaceId === activeSpaceId);
  const activeSpaceIsArchived = activeSpace?.status === 2;
  const activeSpaceHeaderOverride = useEntityHeaderOverrideStore(state => (activeSpaceId ? state.headers[`space:${activeSpaceId}`] : undefined));
  const activeSpaceNameForUi = activeSpaceHeaderOverride?.title ?? activeSpace?.name;
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

        // 1) Ensure business doc metas have business titles so `@`（Linked Doc）菜单默认就能显示房间/空间标题。
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

  // 主区域视图：不再用 URL 管理（避免 URL 变得过长/冲突）
  type RoomSettingTab = "role" | "setting";
  type SpaceDetailTab = "members" | "workflow" | "trpg" | "setting";
  const [mainView, setMainView] = useState<ChatPageMainView>(() => initialMainView ?? "chat");
  const discoverModeForUi = discoverMode ?? "square";
  const [spaceDetailTab, setSpaceDetailTab] = useState<SpaceDetailTab>("members");
  const [roomSettingState, setRoomSettingState] = useState<{ roomId: number; tab: RoomSettingTab } | null>(null);

  const isKPInSpace = useMemo(() => {
    return Boolean(spaceMembersQuery.data?.data?.some(member => member.userId === globalContext.userId && member.memberType === 1));
  }, [globalContext.userId, spaceMembersQuery.data?.data]);

  const docMetasFromSidebarTree = useMemo(() => {
    // 不做历史兼容：仅保留能解析的“空间内独立文档”（sdoc:<docId>:description）。
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

  // Space 共享文档（space_doc）：tcHeader 改名时做一次轻量节流同步，避免每次输入都打后端。
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

  const handleDocTcHeaderChange = useCallback((payload: {
    docId: string;
    entityType?: unknown;
    entityId?: number;
    header: { title: string; imageUrl: string };
  }) => {
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

    // space_doc：把标题同步到后端（节流）。
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

      // workspace meta 可能在刷新后为空：用 sidebarTree 中的 doc 节点回补，确保可见/可打开。
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

    const title = (titleOverride ?? "新文档").trim() || "新文档";

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
      toast.error("创建文档失败");
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
      // 从 spaceDetail 路由跳到 room setting 路由时，避免覆盖 roomSetting 的 mainView。
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

    // 恢复上次的激活空间和房间,否则恢复第一个房间
    const targetRoomId = storedIds.roomId ?? rooms[0]?.roomId;
    if (targetRoomId) {
      setActiveRoomId(targetRoomId);
    }
    const targetSpaceId = storedIds.spaceId;
    if (targetSpaceId) {
      setActiveSpaceId(targetSpaceId);
    }
  }, [isPrivateChatMode, rooms, setActiveRoomId, setActiveSpaceId, storedIds.roomId, storedIds.spaceId]);

  // 当前 space 的 rooms 拉取后，更新本地 space->roomIds 映射，避免为了 space 未读数等需求进行批量请求。
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

  // 创建空间弹窗是否打开
  const [isSpaceHandleOpen, setIsSpaceHandleOpen] = useSearchParamsState<boolean>("addSpacePop", false);
  const [isCreateInCategoryOpen, setIsCreateInCategoryOpen] = useSearchParamsState<boolean>("createInCategoryPop", false);

  const [pendingCreateInCategoryId, setPendingCreateInCategoryId] = useState<string | null>(null);
  const [createInCategoryMode, setCreateInCategoryMode] = useState<"room" | "doc">("room");
  const [createDocTitle, setCreateDocTitle] = useState("新文档");

  const openCreateInCategory = useCallback((categoryId: string) => {
    if (!activeSpaceId || activeSpaceId <= 0)
      return;
    setPendingCreateInCategoryId(categoryId);
    setCreateInCategoryMode(getDefaultCreateInCategoryMode({ categoryId, isKPInSpace }));
    setCreateDocTitle("新文档");
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
  // 空间成员邀请窗口状态
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  // 房间邀请窗口状态
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

    // 在空间模式下，URL roomId 缺失时，房间列表加载完成后默认选中自定义排序的第一个房间
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

  // 私聊未读消息：复用私聊列表现有计算逻辑（用于左侧“私信入口”角标）
  const privateMessageList = usePrivateMessageList({ globalContext, userId });
  const { unreadMessageNumbers: privateUnreadMessageNumbers } = useUnreadCount({
    realTimeContacts: privateMessageList.realTimeContacts,
    sortedRealTimeMessages: privateMessageList.sortedRealTimeMessages,
    userId,
    urlRoomId: isPrivateChatMode ? urlRoomId : undefined,
  });
  const privateTotalUnreadMessages = useMemo(() => {
    return privateMessageList.realTimeContacts.reduce((sum, contactId) => {
      // 当前正在看的私聊不再显示未读（与 ChatItem 逻辑一致）
      if (isPrivateChatMode && activeRoomId === contactId) {
        return sum;
      }
      return sum + (privateUnreadMessageNumbers[contactId] ?? 0);
    }, 0);
  }, [activeRoomId, isPrivateChatMode, privateMessageList.realTimeContacts, privateUnreadMessageNumbers]);

  // 待处理好友申请数：合并到私信入口角标
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

  // 右键菜单
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: number } | null>(null);
  // 空间右键菜单
  const [spaceContextMenu, setSpaceContextMenu] = useState<{ x: number; y: number; spaceId: number } | null>(null);

  // 关闭右键菜单
  function closeContextMenu() {
    setContextMenu(null);
  }

  // 关闭空间右键菜单
  function closeSpaceContextMenu() {
    setSpaceContextMenu(null);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 向上查找包含data-room-id属性的父元素
    const messageElement = target.closest("[data-room-id]");
    setContextMenu({ x: e.clientX, y: e.clientY, roomId: Number(messageElement?.getAttribute("data-room-id")) });
  }

  function handleSpaceContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    const target = e.target as HTMLElement;
    // 向上查找包含data-space-id属性的父元素
    const spaceElement = target.closest("[data-space-id]");
    const rawSpaceId = spaceElement?.getAttribute("data-space-id");
    if (!rawSpaceId)
      return;
    setSpaceContextMenu({ x: e.clientX, y: e.clientY, spaceId: Number(rawSpaceId) });
  }

  // 处理点击外部关闭房间右键菜单的逻辑
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener("click", closeContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeContextMenu);
    };
  }, [contextMenu]); // 依赖于contextMenu状态

  // 处理点击外部关闭空间右键菜单的逻辑
  useEffect(() => {
    if (spaceContextMenu) {
      window.addEventListener("click", closeSpaceContextMenu);
    }
    return () => {
      window.removeEventListener("click", closeSpaceContextMenu);
    };
  }, [spaceContextMenu]);

  // websocket封装, 用于发送接受消息
  const websocketUtils = useGlobalContext().websocketUtils;
  // 消息提醒相关
  const unreadMessagesNumber = websocketUtils.unreadMessagesNumber;
  const totalUnreadMessages = useMemo(() => {
    return Object.values(unreadMessagesNumber).reduce((sum, count) => sum + count, 0);
  }, [unreadMessagesNumber]);
  // 在标签页中显示未读消息
  useEffect(() => {
    const originalTitle = document.title.replace(/^\d+条新消息-/, ""); // 清除已有前缀
    if (totalUnreadMessages > 0) {
      document.title = `${totalUnreadMessages}条新消息-${originalTitle}`;
    }
    else {
      document.title = originalTitle;
    }
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

  const getSpaceUnreadMessagesNumber = (spaceId: number) => {
    const roomIds = spaceRoomIdsByUser[String(userId)]?.[String(spaceId)] ?? [];
    let result = 0;
    for (const roomId of roomIds) {
      if (activeRoomId !== roomId)
        result += unreadMessagesNumber[roomId] ?? 0;
    }
    return result;
  };

  // 添加房间成员的mutation
  const addRoomMemberMutation = useAddRoomMemberMutation();
  // 添加空间成员的mutation
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  // 处理邀请玩家
  const handleInvitePlayer = (roomId: number) => {
    setInviteRoomId(roomId);
  };

  // 处理添加房间成员
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

  // 处理添加空间成员
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

  const mainContent = isPrivateChatMode
    ? (
        activeRoomId
          ? (
              <RightChatView
                setIsOpenLeftDrawer={setIsOpenLeftDrawer}
              />
            )
          : (
              <FriendsPage
                setIsOpenLeftDrawer={setIsOpenLeftDrawer}
              />
            )
      )
    : (
        <>
          {mainView === "discover"
            ? (
                <DiscoverArchivedSpacesView mode={discoverModeForUi} />
              )
            : (
                activeSpaceId
                  ? (
                      mainView === "spaceDetail"
                        ? (
                            <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                              <div className="w-full h-full overflow-auto flex justify-center">
                                <SpaceDetailPanel activeTab={spaceDetailTab} onClose={closeSpaceDetailPanel} />
                              </div>
                            </div>
                          )
                        : (mainView === "roomSetting" && roomSettingState)
                            ? (
                                <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                                  <div className="w-full h-full overflow-auto flex justify-center ">
                                    <RoomSettingWindow
                                      roomId={roomSettingState.roomId}
                                      onClose={closeRoomSettingPage}
                                      defaultTab={roomSettingState.tab}
                                    />
                                  </div>
                                </div>
                              )
                            : activeDocId
                              ? (
                                  <div className="flex w-full h-full justify-center min-h-0 min-w-0">
                                    <div className="w-full h-full overflow-hidden flex justify-center">
                                      {isKPInSpace
                                        ? (
                                            <div className="w-full h-full overflow-hidden bg-base-100 border border-base-300 rounded-box">
                                              <BlocksuiteDescriptionEditor
                                                workspaceId={`space:${activeSpaceId ?? -1}`}
                                                spaceId={activeSpaceId ?? -1}
                                                docId={activeDocId}
                                                variant="full"
                                                tcHeader={{ enabled: true, fallbackTitle: activeDocTitleForTcHeader }}
                                                onTcHeaderChange={handleDocTcHeaderChange}
                                                allowModeSwitch
                                                fullscreenEdgeless
                                              />
                                            </div>
                                          )
                                        : (
                                            <div className="flex items-center justify-center w-full h-full font-bold">
                                              <span className="text-center">仅KP可查看文档</span>
                                            </div>
                                          )}
                                    </div>
                                  </div>
                                )
                              : (
                                  <RoomWindow
                                    roomId={activeRoomId ?? -1}
                                    spaceId={activeSpaceId ?? -1}
                                    targetMessageId={targetMessageId}
                                  />
                                )
                    )
                  : (
                      <div className="flex items-center justify-center w-full h-full font-bold">
                        <span className="text-center lg:hidden">请从右侧选择房间</span>
                      </div>
                    )
              )}
        </>
      );

  const leftDrawerToggleLabel = isOpenLeftDrawer ? "收起侧边栏" : "展开侧边栏";
  const shouldShowLeftDrawerToggle = screenSize === "sm" && !isOpenLeftDrawer;

  return (
    <SpaceContext value={spaceContext}>
      <div className={`flex flex-row flex-1 h-full min-h-0 min-w-0 relative overflow-x-hidden overflow-y-hidden ${screenSize === "sm" ? "bg-base-100" : "bg-base-200"}`}>
        {shouldShowLeftDrawerToggle && (
          <div className="tooltip tooltip-right absolute left-2 top-2 z-50" data-tip={leftDrawerToggleLabel}>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square bg-base-100/80"
              onClick={toggleLeftDrawer}
              aria-label={leftDrawerToggleLabel}
              aria-pressed={Boolean(isOpenLeftDrawer)}
            >
              <SidebarSimpleIcon />
            </button>
          </div>
        )}
        {screenSize === "sm"
          ? (
              <>
                {/* 只有小屏才允许收起侧边栏 */}
                <OpenAbleDrawer
                  isOpen={isOpenLeftDrawer}
                  className="h-full z-10 w-full bg-base-200"
                  initialWidth={chatLeftPanelWidth}
                  minWidth={200}
                  maxWidth={700}
                  onWidthChange={setChatLeftPanelWidth}
                  handlePosition="right"
                >
                  <div className="h-full flex flex-col w-full min-w-0 relative">
                    <div className="flex flex-row w-full min-w-0 flex-1 min-h-0">
                      {/* 空间列表 */}
                      <ChatSpaceSidebar
                        isPrivateChatMode={isPrivateChatMode}
                        spaces={orderedSpaces}
                        spaceOrderIds={orderedSpaceIds}
                        onReorderSpaceIds={setUserSpaceOrder}
                        activeSpaceId={activeSpaceId}
                        getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
                        privateUnreadMessagesNumber={privateEntryBadgeCount}
                        onOpenPrivate={() => {
                          setActiveSpaceId(null);
                          setActiveRoomId(null);
                          navigate("/chat/private");
                        }}
                        onToggleLeftDrawer={toggleLeftDrawer}
                        isLeftDrawerOpen={isOpenLeftDrawer}
                        onSelectSpace={(spaceId) => {
                          setActiveSpaceId(spaceId);
                        }}
                        onCreateSpace={() => {
                          setIsSpaceHandleOpen(true);
                        }}
                        onSpaceContextMenu={handleSpaceContextMenu}
                      />
                      {/* <div className="w-px bg-base-300"></div> */}
                      {/* 房间列表 */}
                      {mainView === "discover"
                        ? (
                            <ChatDiscoverNavPanel
                              onCloseLeftDrawer={closeLeftDrawer}
                              onToggleLeftDrawer={toggleLeftDrawer}
                              isLeftDrawerOpen={isOpenLeftDrawer}
                              activeMode={discoverModeForUi}
                            />
                          )
                        : (
                            <ChatRoomListPanel
                              isPrivateChatMode={isPrivateChatMode}
                              currentUserId={userId}
                              activeSpaceId={activeSpaceId}
                              activeSpaceName={activeSpaceNameForUi}
                              activeSpaceIsArchived={activeSpaceIsArchived}
                              isSpaceOwner={!!spaceContext.isSpaceOwner}
                              isKPInSpace={isKPInSpace}
                              rooms={orderedRooms}
                              roomOrderIds={orderedRoomIds}
                              onReorderRoomIds={setUserRoomOrder}
                              sidebarTree={sidebarTree}
                              onSaveSidebarTree={handleSaveSidebarTree}
                              onResetSidebarTreeToDefault={resetSidebarTreeToDefault}
                              docMetas={spaceDocMetas ?? []}
                              onSelectDoc={(docId) => {
                                if (!activeSpaceId || activeSpaceId <= 0)
                                  return;
                                setMainView("chat");
                                const parsed = parseSpaceDocId(docId);
                                if (parsed?.kind === "independent") {
                                  navigate(`/chat/${activeSpaceId}/doc/${parsed.docId}`);
                                  return;
                                }
                                navigate(`/chat/${activeSpaceId}/doc/${encodeURIComponent(docId)}`);
                              }}
                              activeRoomId={activeRoomId}
                              activeDocId={activeDocId}
                              unreadMessagesNumber={unreadMessagesNumber}
                              onContextMenu={handleContextMenu}
                              onInviteMember={() => setIsMemberHandleOpen(true)}
                              onOpenSpaceDetailPanel={openSpaceDetailPanel}
                              onSelectRoom={(roomId) => {
                                setMainView("chat");
                                setActiveRoomId(roomId);
                              }}
                              onCloseLeftDrawer={closeLeftDrawer}
                              onToggleLeftDrawer={toggleLeftDrawer}
                              isLeftDrawerOpen={isOpenLeftDrawer}
                              onOpenRoomSetting={(roomId, tab) => {
                                openRoomSettingPage(roomId, tab);
                              }}
                              setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                              onOpenCreateInCategory={openCreateInCategory}
                            />
                          )}
                    </div>
                    <div
                      id="chat-sidebar-user-card"
                      className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                    />
                  </div>
                </OpenAbleDrawer>
                {/* 聊天记录窗口，输入窗口，侧边栏 */}
                <div
                  className={`flex-1 min-h-0 min-w-0 transition-opacity ${isOpenLeftDrawer ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                  aria-hidden={isOpenLeftDrawer}
                >
                  {mainContent}
                </div>
              </>
            )
          : (
              <>
                {/* 桌面端：房间列表 + 右侧视图放在同一容器，并做左上圆角 */}
                <div className="flex flex-row flex-1 h-full min-w-0 overflow-visible bg-base-200 rounded-tl-xl">
                  <div className="flex flex-col bg-base-200 h-full relative">
                    <div className="flex flex-row flex-1 min-h-0">
                      {/* 桌面端：空间列表不在圆角容器内 */}
                      <div className="bg-base-200 h-full">
                        <ChatSpaceSidebar
                          isPrivateChatMode={isPrivateChatMode}
                          spaces={orderedSpaces}
                          spaceOrderIds={orderedSpaceIds}
                          onReorderSpaceIds={setUserSpaceOrder}
                          activeSpaceId={activeSpaceId}
                          getSpaceUnreadMessagesNumber={getSpaceUnreadMessagesNumber}
                          privateUnreadMessagesNumber={privateEntryBadgeCount}
                          onOpenPrivate={() => {
                            setActiveSpaceId(null);
                            setActiveRoomId(null);
                            navigate("/chat/private");
                          }}
                          onToggleLeftDrawer={toggleLeftDrawer}
                          isLeftDrawerOpen={isOpenLeftDrawer}
                          onSelectSpace={(spaceId) => {
                            setActiveSpaceId(spaceId);
                          }}
                          onCreateSpace={() => {
                            setIsSpaceHandleOpen(true);
                          }}
                          onSpaceContextMenu={handleSpaceContextMenu}
                        />
                      </div>

                      <OpenAbleDrawer
                        isOpen={isOpenLeftDrawer}
                        className="h-full z-10 w-full bg-base-200"
                        initialWidth={chatLeftPanelWidth}
                        minWidth={200}
                        maxWidth={700}
                        onWidthChange={setChatLeftPanelWidth}
                        handlePosition="right"
                      >
                        <div className="h-full flex flex-row w-full min-w-0 rounded-tl-xl">
                          {/* 房间列表 */}
                          {mainView === "discover"
                            ? (
                                <ChatDiscoverNavPanel
                                  onCloseLeftDrawer={closeLeftDrawer}
                                  onToggleLeftDrawer={toggleLeftDrawer}
                                  isLeftDrawerOpen={isOpenLeftDrawer}
                                  activeMode={discoverModeForUi}
                                />
                              )
                            : (
                                <ChatRoomListPanel
                                  isPrivateChatMode={isPrivateChatMode}
                                  currentUserId={userId}
                                  activeSpaceId={activeSpaceId}
                                  activeSpaceName={activeSpaceNameForUi}
                                  activeSpaceIsArchived={activeSpaceIsArchived}
                                  isSpaceOwner={!!spaceContext.isSpaceOwner}
                                  isKPInSpace={isKPInSpace}
                                  rooms={orderedRooms}
                                  roomOrderIds={orderedRoomIds}
                                  onReorderRoomIds={setUserRoomOrder}
                                  sidebarTree={sidebarTree}
                                  onSaveSidebarTree={handleSaveSidebarTree}
                                  onResetSidebarTreeToDefault={resetSidebarTreeToDefault}
                                  docMetas={spaceDocMetas ?? []}
                                  onSelectDoc={(docId) => {
                                    if (!activeSpaceId || activeSpaceId <= 0)
                                      return;
                                    setMainView("chat");
                                    const parsed = parseSpaceDocId(docId);
                                    if (parsed?.kind === "independent") {
                                      navigate(`/chat/${activeSpaceId}/doc/${parsed.docId}`);
                                      return;
                                    }
                                    navigate(`/chat/${activeSpaceId}/doc/${encodeURIComponent(docId)}`);
                                  }}
                                  activeRoomId={activeRoomId}
                                  activeDocId={activeDocId}
                                  unreadMessagesNumber={unreadMessagesNumber}
                                  onContextMenu={handleContextMenu}
                                  onInviteMember={() => setIsMemberHandleOpen(true)}
                                  onOpenSpaceDetailPanel={openSpaceDetailPanel}
                                  onSelectRoom={(roomId) => {
                                    setMainView("chat");
                                    setActiveRoomId(roomId);
                                  }}
                                  onCloseLeftDrawer={closeLeftDrawer}
                                  onToggleLeftDrawer={toggleLeftDrawer}
                                  isLeftDrawerOpen={isOpenLeftDrawer}
                                  onOpenRoomSetting={(roomId, tab) => {
                                    openRoomSettingPage(roomId, tab);
                                  }}
                                  setIsOpenLeftDrawer={setIsOpenLeftDrawer}
                                  onOpenCreateInCategory={openCreateInCategory}
                                />
                              )}
                        </div>
                      </OpenAbleDrawer>
                    </div>
                    <div
                      id="chat-sidebar-user-card"
                      className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                    />
                  </div>
                  {mainContent}
                </div>
              </>
            )}

        {/* 创建空间弹出窗口 */}
        <PopWindow isOpen={isSpaceHandleOpen} onClose={() => setIsSpaceHandleOpen(false)}>
          <CreateSpaceWindow
            onSuccess={() => setIsSpaceHandleOpen(false)}
          />
        </PopWindow>
        {/* 创建房间弹出窗口 */}
        <PopWindow
          isOpen={isCreateInCategoryOpen}
          onClose={closeCreateInCategory}
        >
          <div className="w-[min(720px,92vw)] p-6">
            <div className="mb-3">
              <div className="text-sm font-medium opacity-80 mb-2">创建类型</div>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 cursor-pointer ${createInCategoryMode === "room" ? "bg-base-200" : "bg-base-100"}`}
                >
                  <input
                    type="radio"
                    name="create_in_category_mode"
                    className="radio radio-sm mt-1"
                    checked={createInCategoryMode === "room"}
                    onChange={() => setCreateInCategoryMode("room")}
                    aria-label="创建房间"
                  />
                  <div className="min-w-0">
                    <div className="font-medium">创建房间</div>
                    <div className="text-xs opacity-70">创建后会自动加入当前分类</div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 ${isKPInSpace ? "cursor-pointer" : "cursor-not-allowed opacity-50"} ${createInCategoryMode === "doc" ? "bg-base-200" : "bg-base-100"}`}
                >
                  <input
                    type="radio"
                    name="create_in_category_mode"
                    className="radio radio-sm mt-1"
                    checked={createInCategoryMode === "doc"}
                    disabled={!isKPInSpace}
                    onChange={() => setCreateInCategoryMode("doc")}
                    aria-label="创建文档"
                  />
                  <div className="min-w-0">
                    <div className="font-medium">创建文档</div>
                    <div className="text-xs opacity-70">仅 KP 可创建/编辑文档</div>
                  </div>
                </label>
              </div>
            </div>

            {createInCategoryMode === "doc"
              ? (
                  <div className="bg-base-200 p-4 rounded-lg">
                    <div className="text-sm font-medium opacity-80 mb-2">文档标题</div>
                    <input
                      className="input input-bordered w-full mb-3"
                      value={createDocTitle}
                      onChange={(e) => {
                        setCreateDocTitle(e.target.value);
                      }}
                      placeholder="新文档"
                    />
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      disabled={!isKPInSpace || !pendingCreateInCategoryId}
                      onClick={() => {
                        void createDocInSelectedCategory();
                      }}
                    >
                      创建文档
                    </button>
                  </div>
                )
              : (
                  <CreateRoomWindow
                    spaceId={activeSpaceId || -1}
                    spaceAvatar={spaces.find(space => (space.spaceId === activeSpaceId))?.avatar}
                    onSuccess={handleRoomCreated}
                  />
                )}
          </div>
        </PopWindow>
        {/* 房间邀请玩家窗口 */}
        <PopWindow
          isOpen={inviteRoomId !== null}
          onClose={() => setInviteRoomId(null)}
        >
          <AddMemberWindow
            handleAddMember={handleAddRoomMember}
            showSpace={true}
          />
        </PopWindow>
        {/* 空间成员邀请窗口 */}
        <PopWindow
          isOpen={isMemberHandleOpen}
          onClose={() => {
            setIsMemberHandleOpen(false);
          }}
        >
          <SpaceInvitePanel
            onAddSpectator={handleAddSpaceMember}
            onAddPlayer={handleAddSpacePlayer}
          />
        </PopWindow>
      </div>

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
