import type { UserRole } from "../../../../api";
import { useRoomExtra } from "@/components/chat/hooks";
import { RoomContext } from "@/components/chat/roomContext";
import { confirmToast } from "@/components/common/comfirmToast";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { UploadUtils } from "@/utils/UploadUtils";
import React, { use, useLayoutEffect, useRef, useState } from "react"; // 引入 useLayoutEffect 用于DOM计算
import { useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery } from "../../../../api/queryHooks";

/**
 * 可拖动的头像组件
 * @param role 角色
 * @param onDragStart 拖拽开始事件
 * @param scale 缩放比例，由于我们的这个图是可以缩放的，如果不考虑这个系数，拖拽的时候的拖拽图像会出现问题
 * @param className
 * @param size 大小，按px计
 * @constructor
 */
function RoleStamp({ role, onDragStart, scale = 1, className, size }: {
  role: UserRole;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, role: UserRole) => void;
  scale?: number;
  className?: string;
  size?: number;
}) {
  const roleAvatar = useGetRoleAvatarQuery(role.avatarId ?? -1).data?.data;
  const containerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);

  // 使用 useLayoutEffect 将字体大小设置为容器高度的一定比例
  useLayoutEffect(() => {
    const container = containerRef.current;
    const name = nameRef.current;

    if (!container || !name)
      return;
      // The observer will fire when the container's size is first calculated or when it changes.
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          name.style.fontSize = `${height * 0.22}px`;
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleInternalDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    const originalElement = e.currentTarget;
    const width = originalElement.offsetWidth * scale;
    const height = originalElement.offsetHeight * scale;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px"; // 移出屏幕外
    dragImage.style.width = `${width}px`;
    dragImage.style.height = `${height}px`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, width / 2, height / 2);
    e.currentTarget.classList.add("opacity-50");
    onDragStart(e, role);
  };

  const handleInternalDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.classList.remove("opacity-50");
  };

  const sizeStyles = size ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <div
      ref={containerRef}
      draggable
      className={`relative aspect-square cursor-grab transition-opacity ${className}`}
      style={sizeStyles}
      onDragStart={handleInternalDragStart}
      onDragEnd={handleInternalDragEnd}
    >
      <div className="absolute bottom-full w-full flex justify-center items-center bg-base-100/50 rounded">
        <span ref={nameRef} className="max-w-full truncate rounded bg-opacity-70 select-none pointer-events-none">
          {role.roleName}
        </span>
      </div>
      <img
        src={roleAvatar?.avatarUrl}
        alt={role.roleName}
        className="rounded-full w-full h-full pointer-events-none object-cover"
      />
    </div>
  );
}

export default function DNDMap() {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId;
  const { data: roomRolesData } = useGetRoomRoleQuery(roomId ?? -1);
  const roomRoles = roomRolesData?.data ?? [];
  const uploadUtil = new UploadUtils();

  // --- 状态管理 ---
  const [mapImg, setMapImg] = useRoomExtra(roomId ?? -1, "dndMapImg", "");
  const [gridSize, setGridSize] = useRoomExtra(roomId ?? -1, "dndMapGridSize", { rows: 10, cols: 10 });
  const [stampPositions, setStampPositions] = useRoomExtra<Record<string, { row: number; col: number }>>(roomId ?? -1, "dndMapStampPositions", {});
  const [gridColor, setGridColor] = useLocalStorage("dndGridColor", "#808080");

  // --- 地图变换状态 ---
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 用于对齐网格和图片的状态
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageRenderInfo, setImageRenderInfo] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // --- 事件处理 ---
  async function handleUpdateMapImg(img: File) {
    const imgUrl = await uploadUtil.uploadImg(img);
    setMapImg(imgUrl);
    setTransform({ scale: 1, x: 0, y: 0 });
  }

  // --- 拖拽逻辑 ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, role: UserRole) => {
    e.dataTransfer.setData("application/json", JSON.stringify(role));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnGrid = (e: React.DragEvent<HTMLDivElement>, row: number, col: number) => {
    e.preventDefault();
    e.stopPropagation();
    const roleJSON = e.dataTransfer.getData("application/json");
    if (roleJSON) {
      const role: UserRole = JSON.parse(roleJSON);
      setStampPositions({ ...stampPositions, [role.roleId]: { row, col } });
    }
  };

  const handleDropOnPanel = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const roleJSON = e.dataTransfer.getData("application/json");
    if (roleJSON) {
      const role: UserRole = JSON.parse(roleJSON);
      const { [role.roleId]: _, ...rest } = stampPositions;
      setStampPositions(rest);
    }
  };

  // --- 平移和缩放逻辑 ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[draggable=\"true\"]")) {
      return;
    }
    e.preventDefault();
    isPanning.current = true;
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning.current)
      return;
    const dx = e.clientX - lastPanPoint.current.x;
    const dy = e.clientY - lastPanPoint.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastPanPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = mapContainerRef.current;
    if (!container)
      return;
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, transform.scale + scaleAmount), 5);
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newX = transform.x + (mouseX - transform.x) * (1 - newScale / transform.scale);
    const newY = transform.y + (mouseY - transform.y) * (1 - newScale / transform.scale);
    setTransform({ scale: newScale, x: newX, y: newY });
  };

  const handleResetClick = () => {
    confirmToast(() => {
      setStampPositions({});
      setMapImg("");
    }, "此操作会清除地图和所有角色位置。", "确认重置");
  };

  // 计算图片实际渲染位置和尺寸的函数 ---
  const calculateImagePosition = () => {
    const image = imageRef.current;
    const container = mapContainerRef.current;
    if (!image || !container || !image.complete)
      return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const { naturalWidth, naturalHeight } = image;

    const containerRatio = containerWidth / containerHeight;
    const imageRatio = naturalWidth / naturalHeight;

    let width = 0;
    let height = 0;
    let top = 0;
    let left = 0;

    if (imageRatio > containerRatio) {
      // 图片比容器更宽，宽度撑满，上下留白
      width = containerWidth;
      height = width / imageRatio;
      top = (containerHeight - height) / 2;
      left = 0;
    }
    else {
      // 图片比容器更高或比例相同，高度撑满，左右留白
      height = containerHeight;
      width = height * imageRatio;
      left = (containerWidth - width) / 2;
      top = 0;
    }
    setImageRenderInfo({ width, height, top, left });
  };

  // 使用 useLayoutEffect 在渲染前计算，防止闪烁 ---
  useLayoutEffect(() => {
    // 图片加载完成时重新计算
    const image = imageRef.current;
    if (image) {
      image.addEventListener("load", calculateImagePosition);
    }
    // 窗口大小改变时重新计算
    window.addEventListener("resize", calculateImagePosition);
    // 初始计算一次
    calculateImagePosition();
    // 清理
    return () => {
      if (image) {
        image.removeEventListener("load", calculateImagePosition);
      }
      window.removeEventListener("resize", calculateImagePosition);
    };
  }, [mapImg]); // 当图片源改变时，重新设置监听

  // --- 渲染逻辑 ---
  if (!mapImg) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-200">
        <div className="text-center">
          <p className="text-sm mb-2">请上传地图</p>
          <ImgUploader setImg={img => handleUpdateMapImg(img)}>
            <button className="btn btn-primary" type="button">上传地图</button>
          </ImgUploader>
        </div>
      </div>
    );
  }

  const rolesById = roomRoles.reduce((acc, role) => {
    acc[role.roleId] = role;
    return acc;
  }, {} as Record<string, UserRole>);

  const cellToRoleMap: Record<string, string> = {};
  Object.entries(stampPositions).forEach(([roleId, pos]) => {
    const key = `${pos.row}-${pos.col}`;
    cellToRoleMap[key] = roleId;
  });

  // 图标尺寸
  const cellWidth = imageRenderInfo.width > 0 ? imageRenderInfo.width / gridSize.cols : 0;
  const cellHeight = imageRenderInfo.height > 0 ? imageRenderInfo.height / gridSize.rows : 0;
  const stampSizeOnMap = Math.min(cellWidth, cellHeight) * 0.8;

  return (
    <div className="w-full h-full flex bg-base-200">
      {/* 主地图区域 */}
      <div
        ref={mapContainerRef}
        className="flex-grow h-full relative overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <img ref={imageRef} src={mapImg} alt="无法加载地图" className="w-full h-full object-contain" />
          <div
            className="absolute grid"
            style={{
              top: `${imageRenderInfo.top}px`,
              left: `${imageRenderInfo.left}px`,
              width: `${imageRenderInfo.width}px`,
              height: `${imageRenderInfo.height}px`,
              gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
              gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
            }}
          >
            {Array.from({ length: gridSize.rows }).map((_, row) =>
              Array.from({ length: gridSize.cols }).map((_, col) => {
                const cellKey = `${row}-${col}`;
                const roleIdInCell = cellToRoleMap[cellKey];
                const roleInCell = roleIdInCell ? rolesById[roleIdInCell] : null;
                return (
                  <div
                    key={cellKey}
                    className="border flex items-center justify-center border-dashed"
                    style={{ border: `1px dashed ${gridColor}80` }}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDropOnGrid(e, row, col)}
                  >
                    {roleInCell && (
                      <RoleStamp
                        role={roleInCell}
                        onDragStart={handleDragStart}
                        scale={transform.scale}
                        size={stampSizeOnMap}
                      />
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* 右侧控制面板 */}
      <div
        className="w-64 h-full bg-base-100 p-4 flex flex-col shadow-lg"
        onDragOver={handleDragOver}
        onDrop={handleDropOnPanel}
      >
        <h2 className="text-lg font-bold mb-4">地图编辑器</h2>
        <div className="form-control">
          <label className="label"><span className="label-text">行数</span></label>
          <input
            type="number"
            value={gridSize.rows}
            onChange={e => setGridSize({ ...gridSize, rows: Number.parseInt(e.target.value) })}
            className="input input-bordered w-full"
          />
        </div>
        <div className="form-control pt-2">
          <label className="label"><span className="label-text">列数</span></label>
          <input
            type="number"
            value={gridSize.cols}
            onChange={e => setGridSize({ ...gridSize, cols: Number.parseInt(e.target.value) })}
            className="input input-bordered w-full"
          />
        </div>
        <div className="divider"></div>
        <h3 className="font-semibold pb-2">角色 (拖动到地图)</h3>
        <div className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 pt-4">
            {roomRoles.filter(role => !stampPositions[role.roleId])
              .map(role => (
                <div className="aspect-square flex items-center justify-center" key={role.roleId}>
                  <RoleStamp role={role} onDragStart={handleDragStart} />
                </div>
              ))}
          </div>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">网格线颜色</span>
          </label>
          <div className="relative w-full h-10">
            <div
              className="w-full h-full rounded-lg border border-base-content/20"
              style={{ backgroundColor: gridColor }}
            >
            </div>
            <input
              type="color"
              value={gridColor}
              onChange={e => setGridColor(e.target.value)}
              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <div className="divider"></div>
        <button
          className="btn btn-error btn-sm mt-4"
          type="button"
          onClick={handleResetClick}
        >
          重置地图
        </button>
      </div>
    </div>
  );
}
