import type { StageEntityResponse } from "api";
import { useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import { useModuleContext } from "../../workPlace/context/_moduleContext";
import { ModuleItemEnum } from "../../workPlace/context/types";

function ItemListItem({
  item,
  isSelected,
  onClick,
  onDelete,
  deleteMode,
}: {
  item: StageEntityResponse;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  deleteMode?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  return (
    <div
      className={`group relative w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""} ${
        isDragging ? "opacity-50 bg-blue-100" : ""
      }`}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData("application/reactflow", JSON.stringify({
          type: "item",
          name: item.name,
          id: item.versionId,
          entityType: item.entityType,
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
          src={item.entityInfo!.image || "/favicon.ico"}
          alt="item"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col min-w-0 truncate">
          <p className="text-sm font-medium truncate">{item.name || "未命名"}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.entityInfo!.description}</p>
        </div>
      </div>

      {/* 右侧按钮 */}
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
              aria-label="立即删除物品"
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
                aria-label="确认删除物品"
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
              aria-label="删除物品"
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

// 物品列表
export default function ItemList({ stageId, searchQuery: controlledQuery, deleteMode }: { stageId: number; searchQuery?: string; deleteMode?: boolean; showCreateButton?: boolean }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  // const queryClient = useQueryClient();

  const handleClick = (item: StageEntityResponse) => {
    pushModuleTabItem({
      id: item.id!.toString(),
      label: item.name!,
      content: item,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(item.id!.toString());
  };

  const { data } = useQueryEntitiesQuery(stageId);

  // 创建物品并添加物品
  const { mutate: deleteItem } = useDeleteEntityMutation();
  const { mutate: updateScene } = useUpdateEntityMutation(stageId);

  const entities = (data?.data ?? []) as StageEntityResponse[];
  const list = entities.filter((i: StageEntityResponse) => i.entityType === 1);

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveQuery = (controlledQuery ?? searchQuery).toLowerCase();

  const filteredList = list?.filter((i: StageEntityResponse) => ((i.name || "").toLowerCase().includes(effectiveQuery)));
  const sortedList = filteredList?.slice().sort((a: StageEntityResponse, b: StageEntityResponse) => (a.id ?? 0) - (b.id ?? 0));

  const sceneList = entities.filter((i: StageEntityResponse) => i.entityType === 3);
  const isEmpty = !sortedList || sortedList.length === 0;

  return (
    <>
      {/* 受控时隐藏本地搜索框 */}
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
              placeholder="搜索物品..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {isEmpty
        ? (
            <div className="text-sm text-gray-500 px-2 py-4">
              暂时没有物品哦
            </div>
          )
        : (
            sortedList!.map((item: StageEntityResponse) => (
              <ItemListItem
                key={item.id!.toString()}
                item={item}
                isSelected={currentSelectedTabId === item.id!.toString()}
                onClick={() => handleClick(item)}
                deleteMode={deleteMode}
                onDelete={() => {
                  removeModuleTabItem(item.id!.toString());
                  deleteItem({
                    id: item.id!,
                    spaceId: stageId,
                  }, {
                    onSuccess: () => {
                      const newScenes = sceneList?.map((scene: StageEntityResponse) => {
                        const newItems = scene.entityInfo?.items.filter((i: string | undefined) => i !== item.name);
                        return { ...scene, entityInfo: { ...scene.entityInfo, items: newItems } };
                      });
                      newScenes?.forEach((scene: StageEntityResponse) => updateScene({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
                    },
                  });
                }}
              />
            ))
          )}
    </>
  );
}
