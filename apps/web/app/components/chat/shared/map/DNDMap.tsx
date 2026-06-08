import { TrashIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import React, { use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

import type { StateRuntimeContextValue } from "@/components/chat/state/stateRuntimeContext";
import type { StateEventAtom } from "@/types/stateEvent";

import { RoomContext } from "@/components/chat/core/roomContext";
import { useOptionalStateRuntimeContext } from "@/components/chat/state/stateRuntimeContext";
import { MediaImage } from "@/components/common/mediaImage";
import { useResolvedRoleAvatarUrl } from "@/components/common/roleAccess.shared";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  buildCommandStateEventExtra,
  buildMapStateEventsFromSnapshot,
  formatStateNumericValue,
  toApiMessageExtraWithStateEvent,
} from "@/types/stateEvent";
import { useIsMobile } from "@/utils/getScreenSize";
import { uploadMediaFile } from "@/utils/mediaUpload";

import type { UserRole } from "../../../../../api";
import type { RoomDndMapToken } from "./roomDndMapApi";

import { useGetRoomNpcRoleQuery, useGetRoomRoleQuery } from "../../../../../api/hooks/chatQueryHooks";
import { MessageType } from "../../../../../api/wsModels";
import {
  fetchRoomDndMap,
  getRoomDndMapImageUrl,
  roomDndMapQueryKey,
} from "./roomDndMapApi";
import {
  buildGridOverlayStyle,
  buildTokenPositionStyle,
  clampGridDimension,
  MAX_GRID_DIMENSION,
  resolveGridCellAtPoint,
  shouldCommitGridCellMove,
} from "./roomDndMapGeometry";

const GRID_COLOR_OPTIONS = [
  { value: "#64748b", label: "slate", className: "bg-slate-500 border-slate-500" },
  { value: "#3b82f6", label: "blue", className: "bg-blue-500 border-blue-500" },
  { value: "#22c55e", label: "green", className: "bg-green-500 border-green-500" },
  { value: "#f59e0b", label: "amber", className: "bg-amber-500 border-amber-500" },
  { value: "#ef4444", label: "red", className: "bg-red-500 border-red-500" },
  { value: "#ec4899", label: "pink", className: "bg-pink-500 border-pink-500" },
] as const;

const DEFAULT_GRID_ROWS = 10;
const DEFAULT_GRID_COLS = 10;
const DEFAULT_GRID_COLOR = "#808080";
const CHATROOM_UPLOAD_SCENE = 1;
const MAP_TOKEN_DRAG_THRESHOLD_PX = 4;

type DNDMapProps = {
  roomId?: number;
  variant?: "embedded" | "frame";
}

type RoleTokenStatus = {
  activeStates: string[];
  hp: number | null;
  initiative: number | null;
  maxHp: number | null;
}

type EffectiveMapConfig = {
  mapFileId?: number;
  imageUrl?: string;
  gridRows: number;
  gridCols: number;
  gridColor: string;
}

type DraggingMapTokenState = {
  source: "map" | "pool";
  pointerId: number;
  roleId: number;
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  isDragging: boolean;
}

const RoleToken = React.memo(({
  role,
  size = 42,
  isSelected = false,
  status,
  onClick,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  role: UserRole;
  size?: number;
  isSelected?: boolean;
  status?: RoleTokenStatus | null;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) => {
  const roleAvatarUrl = useResolvedRoleAvatarUrl(role);
  const sizeStyle = { width: `${size}px`, height: `${size}px` };
  return (
    <div
      className={`
        group relative rounded-full border border-base-300 bg-base-100 shadow-sm
        ${
        isSelected ? "ring-2 ring-primary" : ""
      }
        cursor-pointer select-none touch-none
      `}
      style={sizeStyle}
      draggable={false}
      onClick={onClick}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={role.roleName}
    >
      <div className="h-full w-full overflow-hidden rounded-full">
        <MediaImage
          src={roleAvatarUrl}
          alt={role.roleName}
          draggable={false}
          className="w-full h-full object-cover"
          onDragStart={event => event.preventDefault()}
        />
      </div>
      {status && (
        <div className="
          pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden
          min-w-36 max-w-56 -translate-x-1/2 rounded-md border border-base-300
          bg-base-100 px-2 py-1.5 text-left text-[11px] text-base-content
          shadow-lg
          group-hover:block
        ">
          <div className="truncate font-semibold">{role.roleName}</div>
          <div className="
            mt-1 flex flex-wrap gap-x-2 gap-y-1 text-base-content/70
          ">
            {status.initiative != null && (
              <span>
                先攻
                {" "}
                {formatStateNumericValue(status.initiative)}
              </span>
            )}
            {status.hp != null && (
              <span>
                HP:
                {formatStateNumericValue(status.hp)}
                {status.maxHp != null ? `/${formatStateNumericValue(status.maxHp)}` : ""}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {status.activeStates.length > 0
              ? status.activeStates.map((state, index) => (
                  <span
                    key={`${state}:${index}`}
                    className="
                      rounded-full bg-primary/10 px-1.5 py-0.5 text-primary
                    "
                  >
                    {state}
                  </span>
                ))
              : <span className="text-base-content/45">暂无状态</span>}
          </div>
        </div>
      )}
    </div>
  );
});

function useContainedImageRect(mapImgUrl: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  const updateRect = useCallback(() => {
    // Align grid overlay to the rendered image area (object-contain letterboxing).
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image || !image.complete) {
      return;
    }
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) {
      return;
    }

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const containerRatio = containerWidth / containerHeight;
    const imageRatio = naturalWidth / naturalHeight;
    let width = 0;
    let height = 0;
    let left = 0;
    let top = 0;

    if (imageRatio > containerRatio) {
      width = containerWidth;
      height = width / imageRatio;
      top = (containerHeight - height) / 2;
      left = 0;
    }
    else {
      height = containerHeight;
      width = height * imageRatio;
      left = (containerWidth - width) / 2;
      top = 0;
    }
    setRect({ left, top, width, height });
  }, []);

  useLayoutEffect(() => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleLoad = () => updateRect();
    image?.addEventListener("load", handleLoad);
    const observer = new ResizeObserver(() => updateRect());
    observer.observe(container);
    queueMicrotask(() => updateRect());

    return () => {
      image?.removeEventListener("load", handleLoad);
      observer.disconnect();
    };
  }, [mapImgUrl, updateRect]);

  return { containerRef, imageRef, rect };
}

function buildCellKey(rowIndex: number, colIndex: number) {
  return `${rowIndex}-${colIndex}`;
}

function readRoleRuntimeNumber(runtime: StateRuntimeContextValue, roleId: number, keys: string[]): number | null {
  const sources: Array<Record<string, unknown>> = [
    runtime.derivedDisplayValues.rolesByRoleId[roleId] ?? {},
    runtime.baseDisplayValues.rolesByRoleId[roleId] ?? {},
    runtime.roleVarsByRoleId[roleId] ?? {},
  ];
  for (const source of sources) {
    for (const key of keys) {
      const raw = source[key];
      if (typeof raw === "number" && Number.isFinite(raw)) {
        return raw;
      }
    }
  }
  return null;
}

function formatStatusTurnText(remainingTurns: number | undefined): string {
  return typeof remainingTurns === "number" ? ` ${remainingTurns}T` : "";
}

function buildRoleTokenStatus(runtime: StateRuntimeContextValue | null, roleId: number): RoleTokenStatus | null {
  if (!runtime || roleId <= 0) {
    return null;
  }
  const activeStates = runtime.activeStates.filter(state => state.scope.kind === "role" && state.scope.roleId === roleId);
  const hp = readRoleRuntimeNumber(runtime, roleId, ["hp"]);
  const maxHp = readRoleRuntimeNumber(runtime, roleId, ["maxHp", "maxhp", "hpMax", "hpmax"]);

  return {
    activeStates: activeStates.map(state => `${state.statusName}${formatStatusTurnText(state.remainingTurns)}`),
    hp,
    initiative: readRoleRuntimeNumber(runtime, roleId, ["initiative"]),
    maxHp,
  };
}

function MapStateStrip({
  roomRoles,
  runtime,
}: {
  roomRoles: UserRole[];
  runtime: StateRuntimeContextValue | null;
}) {
  const roleById = useMemo(() => {
    return new Map(roomRoles.map(role => [role.roleId, role]));
  }, [roomRoles]);

  const rows = useMemo(() => {
    if (!runtime) {
      return [];
    }
    const roleIds = new Set<number>();
    Object.keys(runtime.roleVarsByRoleId).forEach((value) => {
      const roleId = Number(value);
      if (roleId > 0) {
        roleIds.add(roleId);
      }
    });
    runtime.activeStates.forEach((state) => {
      if (state.scope.kind === "role" && state.scope.roleId > 0) {
        roleIds.add(state.scope.roleId);
      }
    });

    const stateOnlyRows = [...roleIds].map((roleId) => {
      const role = roleById.get(roleId);
      return {
        activeStates: runtime.activeStates.filter(state => state.scope.kind === "role" && state.scope.roleId === roleId),
        hp: readRoleRuntimeNumber(runtime, roleId, ["hp"]),
        id: `role:${roleId}`,
        initiative: readRoleRuntimeNumber(runtime, roleId, ["initiative"]),
        maxHp: readRoleRuntimeNumber(runtime, roleId, ["maxHp", "maxhp", "hpMax", "hpmax"]),
        name: role?.roleName?.trim() || `角色 #${roleId}`,
      };
    });

    return stateOnlyRows;
  }, [roleById, runtime]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="
      flex min-w-0 flex-wrap gap-2 overflow-x-hidden rounded-md border
      border-base-300 bg-base-100 p-2
    ">
      {rows.map(({ activeStates, hp, id, initiative, maxHp, name }) => (
        <div
          key={id}
          className="
            flex min-w-0 flex-[1_1_12rem] flex-col gap-1 rounded-md border
            border-base-300/70 bg-base-200/60 px-2 py-1.5
          "
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="
              min-w-0 truncate text-xs font-semibold text-base-content
            ">{name}</span>
            <div className="
              flex min-w-0 shrink items-center gap-1 text-[11px]
              text-base-content/65
            ">
              {initiative != null && (
                <span className="shrink-0">
                  先攻
                  {" "}
                  {formatStateNumericValue(initiative)}
                </span>
              )}
              {hp != null && (
                <span className="shrink-0">
                  HP:
                  {formatStateNumericValue(hp)}
                  {maxHp != null ? `/${formatStateNumericValue(maxHp)}` : ""}
                </span>
              )}
            </div>
          </div>
          {activeStates.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[11px]">
              {activeStates.map(state => (
                <span
                  key={state.instanceId}
                  className="
                    rounded-full bg-primary/10 px-1.5 py-0.5 text-primary
                  "
                >
                  {state.statusName}
                  {formatStatusTurnText(state.remainingTurns)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function ClearMapConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) {
    return null;
  }
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="modal modal-open z-[9999]" role="dialog" aria-modal="true" aria-labelledby="clear-map-title">
      <div className="
        modal-box max-w-md rounded-lg border border-base-300 bg-base-100 p-0
        shadow-2xl
      ">
        <div className="
          flex items-start gap-3 border-b border-base-300 px-5 py-4
        ">
          <div className="
            grid size-10 shrink-0 place-items-center rounded-md bg-error/12
            text-error
          ">
            <WarningCircleIcon className="size-6" weight="fill" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="clear-map-title" className="
              text-base font-semibold text-base-content
            ">
              清空地图
            </h3>
            <p className="mt-1 text-sm leading-6 text-base-content/68">
              当前地图图片、网格设置和所有角色位置都会被清空。这个操作会写入房间记录，所有成员都会看到变化。
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs"
            aria-label="取消清空地图"
            onClick={onCancel}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="
          bg-base-200/35 px-5 py-3 text-xs leading-5 text-base-content/60
        ">
          如果只是想移动某个角色，可以选中角色后放回角色池，不需要清空整张地图。
        </div>

        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-error btn-sm"
            onClick={onConfirm}
          >
            <TrashIcon className="size-4" weight="regular" />
            清空地图
          </button>
        </div>
      </div>
      <button
        type="button"
        className="modal-backdrop"
        aria-label="关闭清空地图确认"
        onClick={onCancel}
      >
        关闭
      </button>
    </div>,
    document.body,
  );
}

export default function DNDMap({ roomId: roomIdProp, variant = "embedded" }: DNDMapProps) {
  const roomContext = use(RoomContext);
  const roomId = roomIdProp ?? roomContext.roomId ?? -1;
  const isMobile = useIsMobile();
  const stateRuntime = useOptionalStateRuntimeContext();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [draggingToken, setDraggingToken] = useState<DraggingMapTokenState | null>(null);
  const [isClearMapConfirmOpen, setIsClearMapConfirmOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const draggingTokenRef = useRef<DraggingMapTokenState | null>(null);
  const migratedLegacyMapKeysRef = useRef(new Set<string>());
  const migratingLegacyMapKeyRef = useRef<string | null>(null);
  const suppressNextTokenClickRef = useRef(false);

  const { data: roomRolesData } = useGetRoomRoleQuery(roomId);
  const { data: roomNpcRolesData } = useGetRoomNpcRoleQuery(roomId);
  const roomRoles = useMemo(() => {
    const roles = roomRolesData?.data ?? [];
    const npcRoles = roomNpcRolesData?.data ?? [];
    return [...roles, ...npcRoles];
  }, [roomRolesData, roomNpcRolesData]);

  const mapQuery = useQuery({
    queryKey: roomDndMapQueryKey(roomId),
    queryFn: () => fetchRoomDndMap(roomId),
    enabled: roomId > 0,
  });

  const map = mapQuery.data ?? null;
  const effectiveMapConfig = useMemo<EffectiveMapConfig | null>(() => {
    if (stateRuntime?.mapConfig) {
      return stateRuntime.mapConfig;
    }
    if (stateRuntime?.hasMapConfigState) {
      return null;
    }
    return map;
  }, [map, stateRuntime?.hasMapConfigState, stateRuntime?.mapConfig]);
  const gridRows = effectiveMapConfig?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = effectiveMapConfig?.gridCols ?? DEFAULT_GRID_COLS;
  const gridColor = effectiveMapConfig?.gridColor ?? DEFAULT_GRID_COLOR;
  const mapImageUrl = effectiveMapConfig?.imageUrl || getRoomDndMapImageUrl(effectiveMapConfig);

  const sharedMapTokens = useMemo(() => {
    if (!stateRuntime?.hasMapState) {
      return null;
    }
    return stateRuntime.mapTokens;
  }, [stateRuntime]);
  const tokens = useMemo(() => sharedMapTokens ?? map?.tokens ?? [], [map?.tokens, sharedMapTokens]);
  const tokenByRoleId = useMemo(() => {
    const map = new Map<number, RoomDndMapToken>();
    tokens.forEach(token => map.set(token.roleId, token));
    return map;
  }, [tokens]);

  const roleByCellKey = useMemo(() => {
    const map = new Map<string, RoomDndMapToken>();
    tokens.forEach((token) => {
      map.set(buildCellKey(token.rowIndex, token.colIndex), token);
    });
    return map;
  }, [tokens]);

  const rolesById = useMemo(() => {
    return roomRoles.reduce((acc, role) => {
      acc[role.roleId] = role;
      return acc;
    }, {} as Record<number, UserRole>);
  }, [roomRoles]);

  const roleStatusById = useMemo(() => {
    return roomRoles.reduce((acc, role) => {
      acc[role.roleId] = buildRoleTokenStatus(stateRuntime, role.roleId);
      return acc;
    }, {} as Record<number, RoleTokenStatus | null>);
  }, [roomRoles, stateRuntime]);

  const unplacedRoles = useMemo(() => {
    return roomRoles.filter(role => !tokenByRoleId.has(role.roleId));
  }, [roomRoles, tokenByRoleId]);
  const rolePoolTokenSize = isMobile ? 32 : 40;

  const { containerRef, imageRef, rect } = useContainedImageRect(mapImageUrl);
  const gridOverlayStyle = useMemo(() => {
    return buildGridOverlayStyle(gridRows, gridCols, gridColor);
  }, [gridColor, gridCols, gridRows]);

  const tokenSize = useMemo(() => {
    if (rect.width <= 0 || rect.height <= 0) {
      return isMobile ? 28 : 40;
    }
    const cellWidth = rect.width / gridCols;
    const cellHeight = rect.height / gridRows;
    const size = Math.min(cellWidth, cellHeight) * 0.78;
    // Dense tactical maps need smaller tokens; keeping a large fixed minimum makes high grids unusable.
    const minVisibleSize = isMobile ? 12 : 16;
    const maxVisibleSize = isMobile ? 32 : 42;
    return Math.max(minVisibleSize, Math.min(maxVisibleSize, Math.floor(size)));
  }, [gridCols, gridRows, rect.height, rect.width, isMobile]);

  const sendMapStateEvents = useCallback(async (events: StateEventAtom[], content: string) => {
    if (!roomContext.sendMessageWithInsert || !roomId || roomId <= 0) {
      toast.error("当前房间暂不能写入地图事件");
      return false;
    }
    try {
      const createdMessage = await roomContext.sendMessageWithInsert({
        roomId,
        roleId: roomContext.curRoleId ?? -1,
        avatarId: roomContext.curAvatarId ?? -1,
        content,
        messageType: MessageType.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", events)),
      });
      if (!createdMessage) {
        toast.error("写入地图事件失败");
        return false;
      }
      return true;
    }
    catch (error) {
      console.error("写入地图事件失败", error);
      toast.error("写入地图事件失败");
      return false;
    }
  }, [roomContext, roomId]);

  useEffect(() => {
    if (!mapQuery.isSuccess || !map || !stateRuntime || stateRuntime.hasMapConfigState) {
      return;
    }
    const migrationEvents = buildMapStateEventsFromSnapshot(map, {
      imageUrl: getRoomDndMapImageUrl(map),
      includeTokens: !stateRuntime.hasMapState,
    });
    if (migrationEvents.length === 0) {
      return;
    }

    const migrationKey = [
      roomId,
      map.mapFileId ?? "no-map",
      map.updatedAt ?? "no-updated-at",
      stateRuntime.hasMapState ? "config-only" : "with-tokens",
    ].join(":");
    if (migratedLegacyMapKeysRef.current.has(migrationKey) || migratingLegacyMapKeyRef.current === migrationKey) {
      return;
    }

    migratingLegacyMapKeyRef.current = migrationKey;
    void sendMapStateEvents(migrationEvents, ".combat map-migrate").then((ok) => {
      if (ok) {
        migratedLegacyMapKeysRef.current.add(migrationKey);
      }
      if (migratingLegacyMapKeyRef.current === migrationKey) {
        migratingLegacyMapKeyRef.current = null;
      }
    });
  }, [
    map,
    mapQuery.isSuccess,
    roomId,
    sendMapStateEvents,
    stateRuntime,
  ]);

  const buildMapConfigUpsertEvent = useCallback((patch: {
    mapFileId?: number;
    imageUrl?: string;
    gridRows?: number;
    gridCols?: number;
    gridColor?: string;
    clearTokens?: boolean;
  }): StateEventAtom | null => {
    const mapFileId = patch.mapFileId ?? effectiveMapConfig?.mapFileId;
    if (!mapFileId) {
      toast.error("请先上传地图");
      return null;
    }
    const imageUrl = patch.imageUrl || effectiveMapConfig?.imageUrl || getRoomDndMapImageUrl({ mapFileId });
    return {
      type: "mapConfigUpsert",
      mapFileId,
      imageUrl,
      gridRows: patch.gridRows ?? gridRows,
      gridCols: patch.gridCols ?? gridCols,
      gridColor: patch.gridColor ?? gridColor,
      ...(patch.clearTokens ? { clearTokens: true } : {}),
    };
  }, [effectiveMapConfig?.imageUrl, effectiveMapConfig?.mapFileId, gridColor, gridCols, gridRows]);

  const handleUploadMap = async (file: File) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    try {
      const uploadedImage = await uploadMediaFile(file, { scene: CHATROOM_UPLOAD_SCENE });
      if (!uploadedImage.fileId) {
        toast.error("上传失败，请重试");
        return;
      }
      const event = buildMapConfigUpsertEvent({
        mapFileId: uploadedImage.fileId,
        imageUrl: getRoomDndMapImageUrl({ mapFileId: uploadedImage.fileId }),
        gridRows,
        gridCols,
        gridColor,
        clearTokens: true,
      });
      if (event) {
        void sendMapStateEvents([event], ".combat map-config");
      }
    }
    catch (err) {
      console.error(err);
      toast.error("上传失败，请重试");
    }
  };

  const handleReset = useCallback(() => {
    setIsClearMapConfirmOpen(true);
  }, []);

  const handleConfirmReset = useCallback(() => {
    setIsClearMapConfirmOpen(false);
    void sendMapStateEvents([{ type: "mapConfigClear" }], ".combat map-clear");
    setSelectedRoleId(null);
  }, [sendMapStateEvents]);

  const handleGridChange = useCallback((nextRows: number, nextCols: number) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    const event = buildMapConfigUpsertEvent({
      gridRows: nextRows,
      gridCols: nextCols,
      gridColor,
    });
    if (event) {
      void sendMapStateEvents([event], ".combat map-grid");
    }
  }, [buildMapConfigUpsertEvent, gridColor, roomId, sendMapStateEvents]);

  const handleGridColorChange = useCallback((nextColor: string) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    const event = buildMapConfigUpsertEvent({
      gridRows,
      gridCols,
      gridColor: nextColor,
    });
    if (event) {
      void sendMapStateEvents([event], ".combat map-grid");
    }
  }, [buildMapConfigUpsertEvent, gridCols, gridRows, roomId, sendMapStateEvents]);

  const handleRemoveRole = useCallback((roleId: number) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    const events: StateEventAtom[] = [{
      type: "mapTokenRemove",
      roleId,
    }];
    void sendMapStateEvents(events, ".combat map-remove");
    if (selectedRoleId === roleId) {
      setSelectedRoleId(null);
    }
  }, [roomId, selectedRoleId, sendMapStateEvents]);

  const handlePlaceRole = useCallback((roleId: number, rowIndex: number, colIndex: number) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    if (!shouldCommitGridCellMove(tokenByRoleId.get(roleId), { rowIndex, colIndex })) {
      return;
    }
    const occupant = roleByCellKey.get(buildCellKey(rowIndex, colIndex));
    const events: StateEventAtom[] = [];
    if (occupant && occupant.roleId !== roleId) {
      events.push({
        type: "mapTokenRemove",
        roleId: occupant.roleId,
      });
    }
    events.push({
      type: "mapTokenUpsert",
      roleId,
      rowIndex,
      colIndex,
    });
    void sendMapStateEvents(events, ".combat map-move");
  }, [roleByCellKey, roomId, sendMapStateEvents, tokenByRoleId]);

  const resolveOverlayCell = useCallback((clientX: number, clientY: number) => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return null;
    }
    return resolveGridCellAtPoint({
      clientX,
      clientY,
      rect: overlay.getBoundingClientRect(),
      gridRows,
      gridCols,
    });
  }, [gridCols, gridRows]);

  const setDraggingTokenState = useCallback((next: DraggingMapTokenState | null) => {
    draggingTokenRef.current = next;
    setDraggingToken(next);
  }, []);

  const handleTokenPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, token: RoomDndMapToken) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingTokenState({
      source: "map",
      pointerId: event.pointerId,
      roleId: token.roleId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      isDragging: false,
    });
  }, [setDraggingTokenState]);

  const handleRolePoolTokenPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>, roleId: number) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingTokenState({
      source: "pool",
      pointerId: event.pointerId,
      roleId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      isDragging: false,
    });
  }, [setDraggingTokenState]);

  const updateDraggingTokenPoint = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const drag = draggingTokenRef.current;
    if (!drag || drag.pointerId !== pointerId) {
      return;
    }
    const distance = Math.hypot(clientX - drag.startClientX, clientY - drag.startClientY);
    setDraggingTokenState({
      ...drag,
      currentClientX: clientX,
      currentClientY: clientY,
      isDragging: drag.isDragging || distance >= MAP_TOKEN_DRAG_THRESHOLD_PX,
    });
  }, [setDraggingTokenState]);

  const finishDraggingTokenPoint = useCallback((pointerId: number, clientX: number, clientY: number) => {
    const drag = draggingTokenRef.current;
    if (!drag || drag.pointerId !== pointerId) {
      return;
    }
    setDraggingTokenState(null);

    const distance = Math.hypot(clientX - drag.startClientX, clientY - drag.startClientY);
    const didDrag = drag.isDragging || distance >= MAP_TOKEN_DRAG_THRESHOLD_PX;
    if (!didDrag) {
      return;
    }

    suppressNextTokenClickRef.current = true;
    window.setTimeout(() => {
      suppressNextTokenClickRef.current = false;
    }, 0);

    const cell = resolveOverlayCell(clientX, clientY);
    if (!cell) {
      return;
    }
    handlePlaceRole(drag.roleId, cell.rowIndex, cell.colIndex);
    setSelectedRoleId(null);
  }, [handlePlaceRole, resolveOverlayCell, setDraggingTokenState]);

  const handleTokenPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    updateDraggingTokenPoint(event.pointerId, event.clientX, event.clientY);
  }, [updateDraggingTokenPoint]);

  const handleTokenPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDraggingTokenPoint(event.pointerId, event.clientX, event.clientY);
  }, [finishDraggingTokenPoint]);

  useEffect(() => {
    if (!draggingToken) {
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateDraggingTokenPoint(event.pointerId, event.clientX, event.clientY);
    };
    const handleWindowPointerEnd = (event: PointerEvent) => {
      event.preventDefault();
      finishDraggingTokenPoint(event.pointerId, event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWindowPointerEnd, { passive: false });
    window.addEventListener("pointercancel", handleWindowPointerEnd, { passive: false });
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerEnd);
      window.removeEventListener("pointercancel", handleWindowPointerEnd);
    };
  }, [draggingToken, finishDraggingTokenPoint, updateDraggingTokenPoint]);

  const handleMapOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedRoleId) {
      return;
    }
    const cell = resolveOverlayCell(event.clientX, event.clientY);
    if (!cell) {
      return;
    }
    handlePlaceRole(selectedRoleId, cell.rowIndex, cell.colIndex);
    setSelectedRoleId(null);
  }, [handlePlaceRole, resolveOverlayCell, selectedRoleId]);

  const handleRolePoolClick = useCallback(() => {
    if (!selectedRoleId) {
      return;
    }
    if (tokenByRoleId.has(selectedRoleId)) {
      handleRemoveRole(selectedRoleId);
      return;
    }
    setSelectedRoleId(null);
  }, [handleRemoveRole, selectedRoleId, tokenByRoleId]);

  const draggingPoolRole = draggingToken?.source === "pool"
    ? rolesById[draggingToken.roleId]
    : undefined;

  if (mapQuery.isLoading && !effectiveMapConfig) {
    return (
      <div className="
        w-full h-full flex items-center justify-center bg-base-200
      ">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (!mapImageUrl) {
    return (
      <div className="
        w-full h-full flex items-center justify-center bg-base-200
      ">
        <div className="text-center space-y-2">
          <p className="text-sm">请上传地图</p>
          <ImgUploader setImg={file => handleUploadMap(file)}>
            <button className="btn btn-primary" type="button">上传地图</button>
          </ImgUploader>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-base-200 flex flex-col overflow-hidden">
      <ClearMapConfirmDialog
        isOpen={isClearMapConfirmOpen}
        onCancel={() => setIsClearMapConfirmOpen(false)}
        onConfirm={handleConfirmReset}
      />
      {draggingPoolRole && draggingToken?.isDragging && (
        <div
          className="
            pointer-events-none fixed z-[10000] -translate-x-1/2
            -translate-y-1/2 opacity-85 drop-shadow-xl
          "
          style={{
            left: `${draggingToken.currentClientX}px`,
            top: `${draggingToken.currentClientY}px`,
          }}
        >
          <RoleToken
            role={draggingPoolRole}
            size={tokenSize}
            isSelected
            status={roleStatusById[draggingPoolRole.roleId]}
          />
        </div>
      )}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-base-300/40"
      >
        <MediaImage
          ref={imageRef}
          src={mapImageUrl}
          alt="地图"
          className="w-full h-full object-contain"
        />
        {rect.width > 0 && rect.height > 0 && (
          <div
            ref={overlayRef}
            className={`
              absolute transition-colors
              ${selectedRoleId ? `rounded-sm ring-2 ring-primary/30 ring-inset` : ""}
            `}
            style={{
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }}
            onClick={handleMapOverlayClick}
          >
            <div
              className={`
                absolute inset-0 transition-colors
                ${
                selectedRoleId ? "cursor-crosshair bg-primary/5" : `
                  cursor-default
                `
              }
              `}
              style={gridOverlayStyle}
            />
            {tokens.map((token) => {
              const role = rolesById[token.roleId];
              if (!role) {
                return null;
              }
              const tokenStyle = buildTokenPositionStyle(token.rowIndex, token.colIndex, gridRows, gridCols);
              const tokenDrag = draggingToken?.roleId === token.roleId ? draggingToken : null;
              const dragOffsetX = tokenDrag ? tokenDrag.currentClientX - tokenDrag.startClientX : 0;
              const dragOffsetY = tokenDrag ? tokenDrag.currentClientY - tokenDrag.startClientY : 0;
              return (
                <div
                  key={token.roleId}
                  className={`
                    absolute z-10 touch-none
                    ${tokenDrag?.isDragging ? `z-20 cursor-grabbing` : ""}
                  `}
                  style={{
                    ...tokenStyle,
                    transform: tokenDrag
                      ? `${tokenStyle.transform ?? ""} translate(${dragOffsetX}px, ${dragOffsetY}px)`
                      : tokenStyle.transform,
                  }}
                  onPointerDown={event => handleTokenPointerDown(event, token)}
                  onPointerMove={handleTokenPointerMove}
                  onPointerUp={handleTokenPointerEnd}
                  onPointerCancel={handleTokenPointerEnd}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressNextTokenClickRef.current) {
                      return;
                    }
                    if (!selectedRoleId) {
                      setSelectedRoleId(token.roleId);
                      return;
                    }
                    handlePlaceRole(selectedRoleId, token.rowIndex, token.colIndex);
                    setSelectedRoleId(null);
                  }}
                >
                  <RoleToken
                    role={role}
                    size={tokenSize}
                    isSelected={selectedRoleId === role.roleId}
                    status={roleStatusById[role.roleId]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={`
          min-h-0 overflow-x-hidden overflow-y-auto flex flex-col gap-2 border-t
          border-base-300 bg-base-100 p-2
          ${
          variant === "frame" ? "min-h-[180px]" : "max-h-[45%]"
        }
        `}
      >
        <div className="flex w-full flex-wrap items-center gap-2">
          <h2 className="font-semibold shrink-0">地图编辑</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="
              flex items-center gap-1 rounded-md border border-base-300
              bg-base-200 px-2 py-1
            ">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={MAX_GRID_DIMENSION}
                value={gridRows}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isNaN(next)) {
                    return;
                  }
                  handleGridChange(clampGridDimension(next), gridCols);
                }}
                className="
                  w-10 bg-transparent text-center text-sm outline-none
                  [appearance:textfield]
                "
              />
              <span className="px-1 text-xs text-base-content/40">×</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={1}
                max={MAX_GRID_DIMENSION}
                value={gridCols}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isNaN(next)) {
                    return;
                  }
                  handleGridChange(gridRows, clampGridDimension(next));
                }}
                className="
                  w-10 bg-transparent text-center text-sm outline-none
                  [appearance:textfield]
                "
              />
            </div>
            <div className="
              flex items-center gap-1.5 rounded-md border border-base-300
              bg-base-200 px-2 py-1
            ">
              {GRID_COLOR_OPTIONS.map((option) => {
                const isSelected = gridColor.toLowerCase() === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={isSelected}
                    className={`
                      size-3 rounded-full border
                      ${option.className}
                      ${
                      isSelected ? `
                        ring-2 ring-primary/60 ring-offset-2
                        ring-offset-base-100
                      ` : ""
                    }
                    `}
                    onClick={() => handleGridColorChange(option.value)}
                  />
                );
              })}
            </div>
          </div>
          <button className="btn btn-error btn-xs ml-auto shrink-0" type="button" onClick={handleReset}>
            清空
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-x-hidden">
          <div
            className={`
              flex w-full flex-col gap-1 rounded-md border border-base-300
              bg-base-100 p-0.5 transition-colors
              ${
              selectedRoleId && tokenByRoleId.has(selectedRoleId)
                ? `
                  cursor-pointer border-primary/40 bg-primary/5
                  hover:bg-primary/10
                `
                : "hover:bg-base-200/30"
            }
            `}
            style={{ minHeight: `${rolePoolTokenSize + 6}px` }}
            onClick={handleRolePoolClick}
          >
            <div className="flex items-center gap-2 flex-wrap content-start">
              {unplacedRoles.map(role => (
                <RoleToken
                  key={role.roleId}
                  role={role}
                  size={rolePoolTokenSize}
                  isSelected={selectedRoleId === role.roleId}
                  status={roleStatusById[role.roleId]}
                  onPointerDown={event => handleRolePoolTokenPointerDown(event, role.roleId)}
                  onPointerMove={handleTokenPointerMove}
                  onPointerUp={handleTokenPointerEnd}
                  onPointerCancel={handleTokenPointerEnd}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressNextTokenClickRef.current) {
                      return;
                    }
                    setSelectedRoleId(prev => (prev === role.roleId ? null : role.roleId));
                  }}
                />
              ))}
            </div>
          </div>
          <MapStateStrip runtime={stateRuntime} roomRoles={roomRoles} />
        </div>
      </div>
    </div>
  );
}
