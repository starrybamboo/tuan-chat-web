import type { UserRole } from "../../../../../api";
import type { RoomDndMapSnapshot, RoomDndMapToken } from "./roomDndMapApi";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { use, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { RoomContext } from "@/components/chat/core/roomContext";
import { confirmToast } from "@/components/common/comfirmToast";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useIsMobile } from "@/utils/getScreenSize";
import { UploadUtils } from "@/utils/UploadUtils";
import { useGetRoomRoleQuery } from "../../../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery } from "../../../../../api/hooks/RoleAndAvatarHooks";

import {
  applyRoomDndMapChange,
  clearRoomDndMap,
  fetchRoomDndMap,
  removeRoomDndMapToken,
  roomDndMapQueryKey,
  upsertRoomDndMap,
  upsertRoomDndMapToken,
} from "./roomDndMapApi";

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

interface DNDMapProps {
  roomId?: number;
  spaceId?: number;
  variant?: "embedded" | "frame";
}

const RoleToken = React.memo(({
  role,
  size = 42,
  draggable = false,
  isSelected = false,
  onDragStart,
  onClick,
}: {
  role: UserRole;
  size?: number;
  draggable?: boolean;
  isSelected?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>, roleId: number) => void;
  onClick?: () => void;
}) => {
  const roleAvatar = useGetRoleAvatarQuery(role.avatarId ?? -1).data?.data;
  const sizeStyle = { width: `${size}px`, height: `${size}px` };
  return (
    <div
      draggable={draggable}
      className={`relative rounded-full overflow-hidden border border-base-300 bg-base-100 shadow-sm ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${draggable ? "cursor-grab" : "cursor-pointer"}`}
      style={sizeStyle}
      onDragStart={event => onDragStart?.(event, role.roleId)}
      onClick={onClick}
      title={role.roleName}
    >
      <img
        src={roleAvatar?.avatarUrl}
        alt={role.roleName}
        className="w-full h-full object-cover"
      />
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
    updateRect();

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

export default function DNDMap({ roomId: roomIdProp, spaceId: spaceIdProp, variant = "embedded" }: DNDMapProps) {
  const roomContext = use(RoomContext);
  const roomId = roomIdProp ?? roomContext.roomId ?? -1;
  const spaceId = spaceIdProp ?? roomContext.spaceId;
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const uploadUtil = useMemo(() => new UploadUtils(), []);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const { data: roomRolesData } = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesData?.data ?? [], [roomRolesData]);

  const mapQuery = useQuery({
    queryKey: roomDndMapQueryKey(roomId),
    queryFn: () => fetchRoomDndMap(roomId),
    enabled: roomId > 0,
  });

  const map = mapQuery.data ?? null;
  const gridRows = map?.gridRows ?? DEFAULT_GRID_ROWS;
  const gridCols = map?.gridCols ?? DEFAULT_GRID_COLS;
  const gridColor = map?.gridColor ?? DEFAULT_GRID_COLOR;

  const tokens = useMemo(() => map?.tokens ?? [], [map?.tokens]);
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

  const unplacedRoles = useMemo(() => {
    return roomRoles.filter(role => !tokenByRoleId.has(role.roleId));
  }, [roomRoles, tokenByRoleId]);

  const { containerRef, imageRef, rect } = useContainedImageRect(map?.mapImgUrl ?? "");

  const tokenSize = useMemo(() => {
    if (rect.width <= 0 || rect.height <= 0) {
      return isMobile ? 28 : 40;
    }
    const cellWidth = rect.width / gridCols;
    const cellHeight = rect.height / gridRows;
    const size = Math.min(cellWidth, cellHeight) * 0.78;
    return Math.max(isMobile ? 24 : 32, Math.floor(size));
  }, [gridCols, gridRows, rect.height, rect.width, isMobile]);

  const mapUpsertMutation = useMutation({
    mutationFn: upsertRoomDndMap,
    onMutate: (payload) => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), prev => (
        applyRoomDndMapChange(prev as RoomDndMapSnapshot | null, {
          roomId,
          op: "map_upsert",
          map: {
            mapImgUrl: payload.mapImgUrl,
            gridRows: payload.gridRows,
            gridCols: payload.gridCols,
            gridColor: payload.gridColor,
          },
          clearTokens: payload.clearTokens,
        })
      ));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: roomDndMapQueryKey(roomId) });
      toast.error("地图更新失败，请重试");
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(roomDndMapQueryKey(roomId), data);
      }
    },
  });

  const mapClearMutation = useMutation({
    mutationFn: () => clearRoomDndMap(roomId),
    onMutate: () => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: roomDndMapQueryKey(roomId) });
      toast.error("清空地图失败，请重试");
    },
  });

  const tokenUpsertMutation = useMutation({
    mutationFn: upsertRoomDndMapToken,
    onMutate: (payload) => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), prev => (
        applyRoomDndMapChange(prev as RoomDndMapSnapshot | null, {
          roomId,
          op: "token_upsert",
          token: {
            roleId: payload.roleId,
            rowIndex: payload.rowIndex,
            colIndex: payload.colIndex,
          },
        })
      ));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: roomDndMapQueryKey(roomId) });
      toast.error("更新角色位置失败");
    },
  });

  const tokenRemoveMutation = useMutation({
    mutationFn: removeRoomDndMapToken,
    onMutate: (payload) => {
      queryClient.setQueryData(roomDndMapQueryKey(roomId), prev => (
        applyRoomDndMapChange(prev as RoomDndMapSnapshot | null, {
          roomId,
          op: "token_remove",
          token: {
            roleId: payload.roleId,
            rowIndex: -1,
            colIndex: -1,
          },
        })
      ));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: roomDndMapQueryKey(roomId) });
      toast.error("移除角色失败");
    },
  });

  const handleUploadMap = useCallback(async (file: File) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    try {
      const url = await uploadUtil.uploadImg(file);
      if (!url) {
        toast.error("上传失败，请重试");
        return;
      }
      mapUpsertMutation.mutate({
        roomId,
        mapImgUrl: url,
        gridRows: map?.gridRows ?? DEFAULT_GRID_ROWS,
        gridCols: map?.gridCols ?? DEFAULT_GRID_COLS,
        gridColor: map?.gridColor ?? DEFAULT_GRID_COLOR,
        clearTokens: true,
      });
    }
    catch (err) {
      console.error(err);
      toast.error("上传失败，请重试");
    }
  }, [map?.gridColor, map?.gridCols, map?.gridRows, mapUpsertMutation, roomId, uploadUtil]);

  const handleReset = useCallback(() => {
    confirmToast(() => {
      mapClearMutation.mutate();
      setSelectedRoleId(null);
    }, "确认清空地图与角色位置？", "清空地图");
  }, [mapClearMutation]);

  const handleGridChange = useCallback((nextRows: number, nextCols: number) => {
    if (!roomId || roomId <= 0 || !map) {
      return;
    }
    mapUpsertMutation.mutate({
      roomId,
      gridRows: nextRows,
      gridCols: nextCols,
      gridColor,
    });
  }, [gridColor, map, mapUpsertMutation, roomId]);

  const handleGridColorChange = useCallback((nextColor: string) => {
    if (!roomId || roomId <= 0 || !map) {
      return;
    }
    mapUpsertMutation.mutate({
      roomId,
      gridRows,
      gridCols,
      gridColor: nextColor,
    });
  }, [gridCols, gridRows, map, mapUpsertMutation, roomId]);

  const handleRoleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, roleId: number) => {
    event.dataTransfer.setData("text/plain", String(roleId));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleRemoveRole = useCallback((roleId: number) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    tokenRemoveMutation.mutate({ roomId, roleId });
    if (selectedRoleId === roleId) {
      setSelectedRoleId(null);
    }
  }, [roomId, selectedRoleId, tokenRemoveMutation]);

  const handlePlaceRole = useCallback((roleId: number, rowIndex: number, colIndex: number) => {
    if (!roomId || roomId <= 0) {
      return;
    }
    const occupant = roleByCellKey.get(buildCellKey(rowIndex, colIndex));
    if (occupant && occupant.roleId !== roleId) {
      handleRemoveRole(occupant.roleId);
    }
    tokenUpsertMutation.mutate({
      roomId,
      roleId,
      rowIndex,
      colIndex,
    });
  }, [handleRemoveRole, roleByCellKey, roomId, tokenUpsertMutation]);

  const handleCellDrop = useCallback((event: React.DragEvent<HTMLDivElement>, rowIndex: number, colIndex: number) => {
    event.preventDefault();
    const roleId = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return;
    }
    handlePlaceRole(roleId, rowIndex, colIndex);
  }, [handlePlaceRole]);

  const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
    if (!isMobile || !selectedRoleId) {
      return;
    }
    handlePlaceRole(selectedRoleId, rowIndex, colIndex);
    setSelectedRoleId(null);
  }, [handlePlaceRole, isMobile, selectedRoleId]);

  const handleTokenDropZone = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const roleId = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return;
    }
    handleRemoveRole(roleId);
  }, [handleRemoveRole]);

  const handleCopyRef = useCallback(async () => {
    if (!roomId || !spaceId) {
      toast.error("无法生成引用链接");
      return;
    }
    const url = `${window.location.origin}/room-map/${spaceId}/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("已复制地图引用");
    }
    catch (err) {
      console.error(err);
      toast.error("复制失败，请手动复制");
    }
  }, [roomId, spaceId]);

  if (mapQuery.isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (!map?.mapImgUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-200">
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
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-base-300/40"
      >
        <img
          ref={imageRef}
          src={map.mapImgUrl}
          alt="地图"
          className="w-full h-full object-contain"
        />
        <div
          className="absolute grid"
          style={{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)`,
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          }}
        >
          {Array.from({ length: gridRows }).map((_, rowIndex) => (
            Array.from({ length: gridCols }).map((__, colIndex) => {
              const cellToken = roleByCellKey.get(buildCellKey(rowIndex, colIndex));
              const role = cellToken ? rolesById[cellToken.roleId] : null;
              return (
                <div
                  key={buildCellKey(rowIndex, colIndex)}
                  className="border border-dashed flex items-center justify-center"
                  style={{ borderColor: `${gridColor}CC` }}
                  onDragOver={handleDragOver}
                  onDrop={event => handleCellDrop(event, rowIndex, colIndex)}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {role && (
                    <RoleToken
                      role={role}
                      size={tokenSize}
                      draggable
                      onDragStart={handleRoleDragStart}
                    />
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>

      <div
        className={`bg-base-100 border-t border-base-300 p-4 flex flex-col gap-4 ${
          variant === "frame" ? "min-h-[220px]" : "max-h-[45%]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">地图编辑</h2>
          <div className="flex items-center gap-2">
            {spaceId && roomId > 0 && (
              <button className="btn btn-ghost btn-xs" type="button" onClick={handleCopyRef}>
                复制引用
              </button>
            )}
            <button className="btn btn-error btn-xs" type="button" onClick={handleReset}>
              清空地图
            </button>
          </div>
        </div>

        <div className={`flex flex-wrap gap-3 ${isMobile ? "" : "items-center"}`}>
          <label className="input input-sm bg-base-200 border border-base-300">
            <span className="text-xs text-base-content/60">行</span>
            <span aria-hidden className="mx-2 h-4 w-px bg-base-content/20" />
            <input
              type="number"
              min={1}
              max={50}
              value={gridRows}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) {
                  return;
                }
                handleGridChange(Math.min(50, Math.max(1, next)), gridCols);
              }}
              className="w-16 bg-transparent outline-none"
            />
          </label>
          <label className="input input-sm bg-base-200 border border-base-300">
            <span className="text-xs text-base-content/60">列</span>
            <span aria-hidden className="mx-2 h-4 w-px bg-base-content/20" />
            <input
              type="number"
              min={1}
              max={50}
              value={gridCols}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) {
                  return;
                }
                handleGridChange(gridRows, Math.min(50, Math.max(1, next)));
              }}
              className="w-16 bg-transparent outline-none"
            />
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-base-content/60">网格色</span>
            <div className="flex items-center gap-1.5">
              {GRID_COLOR_OPTIONS.map((option) => {
                const isSelected = gridColor.toLowerCase() === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={isSelected}
                    className={`size-3 rounded-full border ${option.className} ${
                      isSelected ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-base-100" : ""
                    }`}
                    onClick={() => handleGridColorChange(option.value)}
                  />
                );
              })}
            </div>
          </div>
          <ImgUploader setImg={file => handleUploadMap(file)}>
            <button className="btn btn-sm btn-outline" type="button">更换地图</button>
          </ImgUploader>
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <div className="text-xs text-base-content/60">角色（拖拽到地图）</div>
          <div
            className="flex items-center gap-2 flex-wrap"
            onDragOver={handleDragOver}
            onDrop={handleTokenDropZone}
          >
            {unplacedRoles.length === 0 && (
              <span className="text-xs text-base-content/50">暂无可放置角色</span>
            )}
            {unplacedRoles.map(role => (
              <RoleToken
                key={role.roleId}
                role={role}
                size={isMobile ? 32 : 40}
                draggable={!isMobile}
                isSelected={isMobile && selectedRoleId === role.roleId}
                onDragStart={handleRoleDragStart}
                onClick={() => {
                  if (!isMobile) {
                    return;
                  }
                  setSelectedRoleId(prev => (prev === role.roleId ? null : role.roleId));
                }}
              />
            ))}
          </div>
          {!isMobile && (
            <div className="text-xs text-base-content/50">拖到此处可移除角色</div>
          )}
          {isMobile && selectedRoleId && (
            <div className="text-xs text-primary">
              点击格子放置角色，或再次点击头像取消选择
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
