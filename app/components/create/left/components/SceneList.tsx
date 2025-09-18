import type { StageEntityResponse } from "api";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useRef, useState } from "react";

// 场景表单项
function SceneListItem(
  { scene, name, isSelected, onClick, onDelete, onRename, deleteMode }: {
    scene: StageEntityResponse;
    name: string;
    isSelected: boolean;
    onClick?: () => void;
    onDelete?: () => void;
    onRename?: (nextName: string) => void;
    deleteMode?: boolean;
  },
) {
  const [confirming, setConfirming] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [showMenu, setShowMenu] = useState(false);
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
      className={`group relative w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2 min-w-0">
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
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scene.entityInfo!.description}</p>
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

      {/* 右侧按钮（删除/确认） */}
      <div className="flex items-center gap-1">
        {onDelete && deleteMode && (
          <button
            type="button"
            className="btn btn-ghost btn-xs opacity-100 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            aria-label="立即删除剧情"
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
        {onDelete && !deleteMode && confirming && (
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
              aria-label="确认删除剧情"
            >
              删除
            </button>
          </>
        )}
        {onDelete && !deleteMode && !confirming && (
          <button
            type="button"
            className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
            aria-label="删除剧情"
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
    </div>
  );
}

export default function SceneList({ stageId, searchQuery: controlledQuery, deleteMode }: { stageId: number; searchQuery?: string; deleteMode?: boolean; showCreateButton?: boolean }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem, updateModuleTabLabel, updateModuleTabContentName } = useModuleContext();
  const handleClick = (scene: StageEntityResponse) => {
    pushModuleTabItem({
      id: scene.id!.toString(),
      label: scene.name!,
      content: scene,
      type: ModuleItemEnum.SCENE,
    });
    setCurrentSelectedTabId(scene.id!.toString());
  };

  // 模组相关
  const { data, isSuccess: _isSuccess } = useQueryEntitiesQuery(stageId);
  const { mutate: updateMap } = useUpdateEntityMutation(stageId);
  const list = data?.data!.filter(i => i.entityType === 3);

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveQuery = (controlledQuery ?? searchQuery).toLowerCase();

  // 根据搜索查询过滤列表，并按 id 升序稳定排序
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});
  const filteredList = list?.filter(i => ((renameMap[i.id!.toString()] ?? i.name) || "").toLowerCase().includes(effectiveQuery));
  const sortedList = filteredList?.slice().sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  // 同步到地图
  const mapData = data?.data!.filter(i => i.entityType === 5)[0];
  const isEmpty = !sortedList || sortedList!.length === 0;

  // 删除模组场景
  const { mutate: deleteScene } = useDeleteEntityMutation();

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
              placeholder="搜索剧情..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {isEmpty
        ? (
            <div className="text-sm text-gray-500 px-2 py-4">
              暂时没有剧情哦
            </div>
          )
        : (
            sortedList?.map(i => (
              <SceneListItem
                key={i!.id!.toString()}
                scene={i!}
                name={(renameMap[i!.id!.toString()] ?? i!.name) || "未命名"}
                deleteMode={deleteMode}
                onRename={(nextName) => {
                  const oldName = i!.name!;
                  setRenameMap(prev => ({ ...prev, [i!.id!.toString()]: nextName }));
                  updateModuleTabLabel(i!.id!.toString(), nextName);
                  updateModuleTabContentName(i!.id!.toString(), nextName);
                  if (mapData) {
                    const oldMap = mapData?.entityInfo?.sceneMap || {};
                    const newMap: Record<string, any> = {};
                    Object.entries(oldMap).forEach(([key, value]) => {
                      const keyToUse = key === oldName ? nextName : key;
                      if (Array.isArray(value)) {
                        const replaced = value.map(v => v === oldName ? nextName : v);
                        newMap[keyToUse] = replaced;
                      }
                      else {
                        newMap[keyToUse] = value === oldName ? nextName : value;
                      }
                    });
                    updateMap({ id: mapData.id!, entityType: 5, entityInfo: { ...mapData.entityInfo, sceneMap: newMap }, name: mapData.name });
                  }
                  // 更新场景自身名称
                  updateMap({ id: i!.id!, entityType: 3, entityInfo: i!.entityInfo!, name: nextName });
                }}
                onDelete={() => {
                  removeModuleTabItem(i.id!.toString());
                  if (mapData) {
                    const oldMap = mapData?.entityInfo?.sceneMap;
                    const newMap: Record<string, any> = {};
                    if (oldMap) {
                      Object.entries(oldMap).forEach(([key, value]) => {
                        if (key !== i.name) {
                          if (Array.isArray(value)) {
                            newMap[key] = value.filter(item => item !== i.name);
                          }
                          else {
                            newMap[key] = value;
                          }
                        }
                      });
                    }
                    updateMap({
                      id: mapData.id!,
                      entityType: 5,
                      entityInfo: {
                        ...mapData.entityInfo,
                        sceneMap: newMap,
                      },
                    });
                  }
                  deleteScene({
                    id: i.id!,
                    stageId,
                  });
                }}
                isSelected={currentSelectedTabId === i!.id!.toString()}
                onClick={() => handleClick(i!)}
              />
            ))
          )}
    </>
  );
}
