import type { ClueMessage } from "../../../../api/models/ClueMessage";
import type { MinimalDocMeta } from "@/components/chat/room/sidebarTree";

import { BookOpenText, CheckerboardIcon, SwordIcon } from "@phosphor-icons/react";
import { useGetRoomInfoQuery, useGetSpaceInfoQuery, useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import React from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import ClueListForPL from "@/components/chat/room/drawers/clueListForPL";
import InitiativeList from "@/components/chat/room/drawers/initiativeList";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import DNDMap from "@/components/chat/shared/map/DNDMap";
import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { Detective, WebgalIcon, XMarkICon } from "@/icons";

export interface SubRoomWindowProps {
  onClueSend: (clue: ClueMessage) => void;
}

type SubPane = "map" | "clue" | "initiative" | "webgal" | "doc";

function SubRoomWindowImpl({ onClueSend }: SubRoomWindowProps) {
  const roomContext = React.use(RoomContext);
  const spaceContext = React.use(SpaceContext);
  const roomId = roomContext?.roomId ?? -1;
  const spaceId = spaceContext?.spaceId ?? -1;
  const isSpaceOwner = Boolean(spaceContext?.isSpaceOwner);

  const sideDrawerState = useSideDrawerStore(state => state.state);
  const subDrawerState = useSideDrawerStore(state => state.subState);
  const setSubDrawerState = useSideDrawerStore(state => state.setSubState);

  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const exportDrawerWidth = useDrawerPreferenceStore(state => state.exportDrawerWidth);
  const roomSidebarWidth = useDrawerPreferenceStore(state => state.userDrawerWidth);

  const [isOpen, setIsOpen] = React.useState(false);
  const [activePane, setActivePane] = React.useState<SubPane>("map");

  const [docTarget, setDocTarget] = React.useState<"space" | "room" | "doc">("room");
  const [docMetas, setDocMetas] = React.useState<MinimalDocMeta[]>([]);
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = React.useState<number | null>(null);

  const webgalPreviewUrl = useRealtimeRenderStore(state => state.previewUrl);
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);

  const spaceInfo = useGetSpaceInfoQuery(spaceId ?? -1).data?.data;
  const userRoomsQuery = useGetUserRoomsQuery(spaceId ?? -1);
  const roomsInSpace = React.useMemo(() => userRoomsQuery.data?.data?.rooms ?? [], [userRoomsQuery.data?.data?.rooms]);
  const activeRoomId = selectedRoomId ?? roomId ?? -1;
  const roomInfo = useGetRoomInfoQuery(activeRoomId ?? -1).data?.data;

  React.useEffect(() => {
    if (subDrawerState === "map") {
      setIsOpen(true);
      setActivePane("map");
    }
    if (subDrawerState === "webgal") {
      setIsOpen(true);
      setActivePane("webgal");
    }
    if (subDrawerState === "doc") {
      setIsOpen(true);
      setActivePane("doc");
    }
  }, [subDrawerState]);

  React.useEffect(() => {
    if (docTarget !== "room") {
      return;
    }
    if (!spaceId || spaceId <= 0) {
      setDocTarget("space");
    }
  }, [docTarget, spaceId]);

  React.useEffect(() => {
    if (docTarget !== "room") {
      return;
    }
    if (roomsInSpace.length === 0) {
      setSelectedRoomId(null);
      return;
    }
    const resolvedRoomId = roomsInSpace.some(r => r.roomId === selectedRoomId)
      ? selectedRoomId
      : roomsInSpace.some(r => r.roomId === roomId)
        ? roomId
        : (roomsInSpace[0]?.roomId ?? null);
    if (resolvedRoomId !== selectedRoomId) {
      setSelectedRoomId(resolvedRoomId);
    }
  }, [docTarget, roomId, roomsInSpace, selectedRoomId]);

  const loadSpaceDocMetas = React.useCallback(async (): Promise<MinimalDocMeta[]> => {
    if (typeof window === "undefined") {
      return [];
    }
    if (!spaceId || spaceId <= 0) {
      return [];
    }
    try {
      const registry = await import("@/components/chat/infra/blocksuite/spaceWorkspaceRegistry");
      const ws = registry.getOrCreateSpaceWorkspace(spaceId) as any;
      const metas = (ws?.meta?.docMetas ?? []) as any[];
      return metas
        .filter(m => typeof m?.id === "string" && m.id.length > 0)
        .map((m) => {
          return { id: String(m.id), title: typeof m?.title === "string" ? m.title : undefined } satisfies MinimalDocMeta;
        });
    }
    catch {
      return [];
    }
  }, [spaceId]);

  React.useEffect(() => {
    if (!isSpaceOwner) {
      setDocMetas([]);
      return;
    }
    if (!spaceId || spaceId <= 0) {
      setDocMetas([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const list = await loadSpaceDocMetas();
      if (!cancelled) {
        setDocMetas(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSpaceOwner, loadSpaceDocMetas, spaceId]);

  React.useEffect(() => {
    if (docTarget !== "doc") {
      return;
    }
    const resolvedDocId = docMetas.some(m => m.id === selectedDocId) ? selectedDocId : (docMetas[0]?.id ?? null);
    if (resolvedDocId !== selectedDocId) {
      setSelectedDocId(resolvedDocId);
    }
  }, [docMetas, docTarget, selectedDocId]);

  const resolvedRoomId = React.useMemo(() => {
    if (docTarget !== "room") {
      return null;
    }
    if (roomsInSpace.length === 0) {
      return null;
    }
    if (selectedRoomId && roomsInSpace.some(r => r.roomId === selectedRoomId)) {
      return selectedRoomId;
    }
    if (roomId && roomsInSpace.some(r => r.roomId === roomId)) {
      return roomId;
    }
    return roomsInSpace[0]?.roomId ?? null;
  }, [docTarget, roomId, roomsInSpace, selectedRoomId]);

  const resolvedDocId = React.useMemo(() => {
    if (docTarget !== "doc") {
      return null;
    }
    if (selectedDocId && docMetas.some(m => m.id === selectedDocId)) {
      return selectedDocId;
    }
    return docMetas[0]?.id ?? null;
  }, [docMetas, docTarget, selectedDocId]);

  const activeDocId = React.useMemo(() => {
    if (!spaceId || spaceId <= 0) {
      return null;
    }
    if (docTarget === "space") {
      return buildSpaceDocId({ kind: "space_description", spaceId });
    }
    if (docTarget === "room") {
      const targetRoomId = resolvedRoomId ?? roomId ?? -1;
      if (!targetRoomId || targetRoomId <= 0) {
        return null;
      }
      return buildSpaceDocId({ kind: "room_description", roomId: targetRoomId });
    }
    return resolvedDocId;
  }, [docTarget, resolvedDocId, resolvedRoomId, roomId, spaceId]);

  const handleDocHeaderChange = React.useCallback(({ docId, header }: { docId: string; header: { title: string } }) => {
    if (!docId) {
      return;
    }
    const title = String(header?.title ?? "").trim();
    setDocMetas((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return prev;
      }
      const idx = prev.findIndex(m => m?.id === docId);
      if (idx < 0) {
        return prev;
      }
      const currentTitle = typeof prev[idx]?.title === "string" ? prev[idx]!.title!.trim() : "";
      if (currentTitle === title) {
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], title };
      return next;
    });
  }, []);

  // 预留左侧聊天区的“最小可用宽度”。当左侧已经无法继续缩小时，SubRoomWindow 也不允许继续拖宽，避免整体溢出。
  // 这里额外考虑了 RoomSideDrawers（user/role/export）可能占据的固定宽度。
  const minRemainingWidth = React.useMemo(() => {
    const baseMinChatWidth = 520;
    const lightDrawerWidth = sideDrawerState === "export"
      ? exportDrawerWidth
      : (sideDrawerState === "user" || sideDrawerState === "role" || sideDrawerState === "clue" || sideDrawerState === "initiative")
          ? roomSidebarWidth
          : 0;
    return baseMinChatWidth + lightDrawerWidth;
  }, [exportDrawerWidth, roomSidebarWidth, sideDrawerState]);

  const { minWidth, maxWidth } = React.useMemo(() => {
    const w = typeof window === "undefined" ? 1200 : window.innerWidth;

    switch (activePane) {
      case "initiative": {
        const min = 380;
        const max = 640;
        return { minWidth: min, maxWidth: max };
      }
      case "clue": {
        const min = 320;
        const max = 480;
        return { minWidth: min, maxWidth: max };
      }
      case "doc": {
        const min = 520;
        const max = typeof window === "undefined" ? 1100 : Math.max(min, w - minRemainingWidth);
        return { minWidth: min, maxWidth: max };
      }
      case "webgal":
      default: {
        const min = 560;
        const max = typeof window === "undefined" ? 1100 : Math.max(min, w - minRemainingWidth);
        return { minWidth: min, maxWidth: max };
      }
    }
  }, [activePane, minRemainingWidth]);

  const title = activePane === "map"
    ? "地图"
    : activePane === "initiative"
      ? "先攻表"
      : activePane === "doc"
        ? "文档"
        : activePane === "webgal"
          ? "WebGAL 预览"
          : "线索";

  const close = React.useCallback(() => {
    setIsOpen(false);
    if (subDrawerState === "map" || subDrawerState === "webgal" || subDrawerState === "doc") {
      setSubDrawerState("none");
    }
  }, [setSubDrawerState, subDrawerState]);

  return (
    <OpenAbleDrawer
      isOpen={isOpen}
      className="h-full shrink-0"
      initialWidth={subRoomWindowWidth}
      minWidth={minWidth}
      maxWidth={maxWidth}
      minRemainingWidth={minRemainingWidth}
      onWidthChange={setSubRoomWindowWidth}
      handlePosition="left"
    >
      <div className="h-full flex flex-col min-h-0 bg-base-200 dark:bg-slate-950/25 backdrop-blur-xl border-l border-base-300 shadow-none">
        <div className="border-gray-300 dark:border-gray-700 border-t border-b flex justify-between items-center overflow-visible relative z-50">
          <div className="flex justify-between items-center w-full px-2 h-10">
            <div className="flex items-center gap-2 min-w-0">
              {activePane === "map" && <CheckerboardIcon className="size-5 opacity-80" />}
              {activePane === "initiative" && <SwordIcon className="size-5 opacity-80" />}
              {activePane === "clue" && <Detective className="size-5 opacity-80" />}
              {activePane === "doc" && <BookOpenText className="size-5 opacity-80" />}
              {activePane === "webgal" && <WebgalIcon className="size-5 opacity-80" />}
              <span className="text-center font-semibold line-clamp-1 truncate min-w-0 text-sm sm:text-base">
                {title}
              </span>
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-2 mr-1">
                <div
                  className={`tooltip tooltip-bottom ${activePane === "map" ? "text-primary" : "hover:text-info"}`}
                  data-tip="地图"
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label="地图"
                    onClick={() => setActivePane("map")}
                  >
                    <CheckerboardIcon className="size-5" />
                  </button>
                </div>
                <div
                  className={`tooltip tooltip-bottom ${activePane === "initiative" ? "text-primary" : "hover:text-info"}`}
                  data-tip="先攻"
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label="先攻表"
                    onClick={() => setActivePane("initiative")}
                  >
                    <SwordIcon className="size-5" />
                  </button>
                </div>
                <div
                  className={`tooltip tooltip-bottom ${activePane === "clue" ? "text-primary" : "hover:text-info"}`}
                  data-tip="线索"
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label="线索"
                    onClick={() => setActivePane("clue")}
                  >
                    <Detective className="size-5" />
                  </button>
                </div>
                <div
                  className={`tooltip tooltip-bottom ${activePane === "doc" ? "text-primary" : "hover:text-info"}`}
                  data-tip="文档"
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label="文档"
                    onClick={() => setActivePane("doc")}
                  >
                    <BookOpenText className="size-5" />
                  </button>
                </div>
                <div
                  className={`tooltip tooltip-bottom ${activePane === "webgal" ? "text-primary" : "hover:text-info"}`}
                  data-tip="WebGAL"
                >
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label="WebGAL 预览"
                    onClick={() => setActivePane("webgal")}
                  >
                    <WebgalIcon className="size-5" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-square btn-sm"
                aria-label="关闭"
                title="关闭"
                onClick={close}
              >
                <XMarkICon className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {activePane === "map" && (
            <div className="overflow-auto h-full">
              <DNDMap />
            </div>
          )}
          {activePane === "initiative" && (
            <div className="overflow-auto h-full">
              <InitiativeList />
            </div>
          )}
          {activePane === "clue" && (
            <div className="overflow-auto h-full">
              <ClueListForPL onSend={onClueSend} />
            </div>
          )}
          {activePane === "webgal" && (
            <WebGALPreview
              previewUrl={webgalPreviewUrl}
              isActive={isRealtimeRenderActive}
              onClose={close}
              className="h-full"
            />
          )}
          {activePane === "doc" && (
            <div className="h-full min-h-0 flex flex-col">
              <div className="flex items-center gap-2 px-2 py-2 border-b border-base-300 bg-base-100/80">
                <div className="join">
                  <button
                    type="button"
                    className={`join-item btn btn-xs ${docTarget === "space" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setDocTarget("space")}
                  >
                    空间资料
                  </button>
                  <button
                    type="button"
                    className={`join-item btn btn-xs ${docTarget === "room" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setDocTarget("room")}
                    disabled={roomsInSpace.length === 0}
                  >
                    房间资料
                  </button>
                  <button
                    type="button"
                    className={`join-item btn btn-xs ${docTarget === "doc" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setDocTarget("doc")}
                  >
                    文档
                  </button>
                </div>
                {docTarget === "room" && (
                  <select
                    className="select select-bordered select-xs max-w-full"
                    value={resolvedRoomId ?? ""}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setSelectedRoomId(Number.isFinite(next) && next > 0 ? next : null);
                    }}
                    disabled={roomsInSpace.length === 0}
                  >
                    {roomsInSpace.length === 0 && <option value="">暂无房间</option>}
                    {roomsInSpace.map(room => (
                      <option key={room.roomId} value={room.roomId}>
                        {String(room.name ?? `房间 ${room.roomId}`)}
                      </option>
                    ))}
                  </select>
                )}
                {docTarget === "doc" && (
                  <select
                    className="select select-bordered select-xs max-w-full"
                    value={resolvedDocId ?? ""}
                    onChange={e => setSelectedDocId(e.target.value || null)}
                    disabled={!isSpaceOwner || docMetas.length === 0}
                  >
                    {docMetas.length === 0 && <option value="">暂无文档</option>}
                    {docMetas.map(meta => (
                      <option key={meta.id} value={meta.id}>
                        {String(meta.title ?? meta.id)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {!spaceId || spaceId <= 0
                  ? (
                      <div className="flex items-center justify-center h-full text-sm opacity-70">未选择空间</div>
                    )
                  : docTarget === "room" && (!resolvedRoomId || resolvedRoomId <= 0)
                    ? (
                        <div className="flex items-center justify-center h-full text-sm opacity-70">未选择房间</div>
                      )
                    : docTarget === "doc" && !isSpaceOwner
                      ? (
                          <div className="flex items-center justify-center h-full text-sm opacity-70">仅KP可查看文档</div>
                        )
                      : docTarget === "doc" && !activeDocId
                        ? (
                            <div className="flex items-center justify-center h-full text-sm opacity-70">暂无文档</div>
                          )
                        : activeDocId
                          ? (
                              <BlocksuiteDescriptionEditor
                                workspaceId={`space:${spaceId}`}
                                spaceId={spaceId}
                                docId={activeDocId}
                                variant="full"
                                mode="page"
                                allowModeSwitch={false}
                                fullscreenEdgeless={false}
                                readOnly={!isSpaceOwner}
                                tcHeader={{
                                  enabled: true,
                                  fallbackTitle: docTarget === "space"
                                    ? (spaceInfo?.name ?? "空间资料")
                                    : docTarget === "room"
                                      ? (roomInfo?.name ?? "房间资料")
                                      : (docMetas.find(m => m.id === activeDocId)?.title ?? "文档"),
                                  fallbackImageUrl: docTarget === "space"
                                    ? (spaceInfo?.avatar ?? "")
                                    : docTarget === "room"
                                      ? (roomInfo?.avatar ?? "")
                                      : "",
                                }}
                                onTcHeaderChange={({ docId, header }) => {
                                  if (docTarget === "doc") {
                                    handleDocHeaderChange({ docId, header });
                                  }
                                }}
                                className="h-full"
                              />
                            )
                          : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </OpenAbleDrawer>
  );
}

const SubRoomWindow = React.memo(SubRoomWindowImpl);
export default SubRoomWindow;
