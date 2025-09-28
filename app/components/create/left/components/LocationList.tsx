import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useRef, useState } from "react";

export function LocationListItem({
  location,
  name,
  isSelected,
  onClick,
  onDelete,
  onRename,
  deleteMode,
}: {
  location: StageEntityResponse;
  name: string;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: (nextName: string) => void;
  deleteMode?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const next = draftName.trim();
    setIsRenaming(false);
    setShowMenu(false);
    if (next && next !== name) {
      onRename?.(next);
    }
  };
  return (
    <div
      className={`group relative w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""} ${
        isDragging ? "opacity-50 bg-blue-100" : ""
      }`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData("application/reactflow", JSON.stringify({
          type: "location",
          name: location.name,
          id: location.id,
          entityType: location.entityType,
        }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={location?.entityInfo?.image || "/favicon.ico"}
          alt="location"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col min-w-0">
          {isRenaming
            ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={draftName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitRename();
                    }
                    if (e.key === "Escape") {
                      setIsRenaming(false);
                      setShowMenu(false);
                      setDraftName(name);
                    }
                  }}
                  onBlur={commitRename}
                  className="input input-bordered input-xs w-40"
                />
              )
            : (
                <p className="text-sm font-medium truncate">{name}</p>
              )}
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{location.entityInfo?.description}</p>
        </div>
      </div>

      {/* 右键菜单 */}
      {showMenu && (
        <div
          className="absolute right-2 top-2 z-20 bg-base-100 shadow rounded border"
          onClick={e => e.stopPropagation()}
          onMouseLeave={() => setShowMenu(false)}
        >
          <button
            type="button"
            className="btn btn-ghost btn-xs w-full"
            onClick={() => {
              setDraftName(name);
              setIsRenaming(true);
              setShowMenu(false);
            }}
          >
            编辑
          </button>
        </div>
      )}

      {/* 右侧按钮（删除确认） */}
      {onDelete && (
        <div className="flex items-center gap-1">
          {deleteMode && (
            <button
              type="button"
              className="btn btn-ghost btn-xs opacity-100 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              aria-label="立即删除地点"
              title="删除"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          {!deleteMode && confirming && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirming(false);
                }}
                aria-label="取消删除"
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-error btn-xs text-error-content"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirming(false);
                  onDelete?.();
                }}
                aria-label="确认删除地点"
              >
                删除
              </button>
            </>
          )}
          {!deleteMode && !confirming && (
            <button
              type="button"
              className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
              aria-label="删除地点"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function LocationList({ stageId, searchQuery: controlledQuery, deleteMode }: { stageId: number; searchQuery?: string; deleteMode?: boolean; showCreateButton?: boolean }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem, updateModuleTabLabel, updateModuleTabContentName } = useModuleContext();
  const handleClick = (location: StageEntityResponse) => {
    const locationId = location.id!.toString();
    const locationName = location.name!;

    pushModuleTabItem({
      id: locationId,
      label: locationName,
      content: location,
      type: ModuleItemEnum.LOCATION,
    });
    setCurrentSelectedTabId(locationId);
  };

  // 创建地点和删除
  const { mutate: deleteLocation } = useDeleteEntityMutation();

  const { data } = useQueryEntitiesQuery(stageId);
  const list = data?.data?.filter(i => i!.entityType === 4);

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveQuery = (controlledQuery ?? searchQuery).toLowerCase();

  // 根据搜索查询过滤列表，并按 id 升序稳定排序
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const filteredList = list?.filter(i => ((renameMap[i.id!.toString()] ?? i.name) || "").toLowerCase().includes(effectiveQuery));
  const sortedList = filteredList?.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  const sceneList = data?.data?.filter(i => i!.entityType === 3);

  const { mutate: updateScene } = useUpdateEntityMutation(stageId);

  // 判断列表是否存在且非空
  const isEmpty = !sortedList || sortedList.length === 0;

  return (
    <>
      {controlledQuery === undefined && (
        <div className="px-2 pb-2">
          <label className="input input-bordered flex items-center gap-2">
            <svg className="h-4 w-4 opacity-70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="grow"
              placeholder="搜索地点..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {isEmpty
        ? (
            <div className="text-sm text-gray-500 px-2 py-4">暂时没有场景哦</div>
          )
        : (
            <>
              {sortedList?.map(location => (
                <LocationListItem
                  key={location.id!.toString()}
                  location={location}
                  name={(renameMap[location.id!.toString()] ?? location.name) || "未命名"}
                  isSelected={currentSelectedTabId === location.id!.toString()}
                  onClick={() => handleClick(location)}
                  deleteMode={deleteMode}
                  onRename={(nextName) => {
                    const oldName = location.name!;
                    setRenameMap(prev => ({ ...prev, [location.id!.toString()]: nextName }));
                    updateModuleTabLabel(location.id!.toString(), nextName);
                    updateModuleTabContentName(location.id!.toString(), nextName);
                    // 更新地点名称
                    updateScene(
                      { id: location.id!, entityType: 4, entityInfo: location.entityInfo!, name: nextName },
                      {
                        onSuccess: () => {
                          // 同步更新引用该地点的场景
                          const newScenes = sceneList?.map((scene) => {
                            const newLocations = scene.entityInfo?.locations.map((loc: string | undefined) => (loc === oldName ? nextName : loc));
                            return { ...scene, entityInfo: { ...scene.entityInfo, locations: newLocations } };
                          });
                          newScenes?.forEach(scene => updateScene({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
                        },
                      },
                    );
                  }}
                  onDelete={() => {
                    removeModuleTabItem(location.id!.toString());
                    deleteLocation({
                      id: location.id!,
                      stageId,
                    }, {
                      onSuccess: () => {
                        const newScenes = sceneList?.map((scene) => {
                          const newLocations = scene.entityInfo?.locations.filter((loc: string) => loc !== location.name);
                          return { ...scene, entityInfo: { ...scene.entityInfo, locations: newLocations } };
                        });
                        newScenes?.forEach(scene => updateScene({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
                      },
                    });
                  }}
                />
              ))}
            </>
          )}
    </>
  );
}
