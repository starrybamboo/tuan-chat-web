import type { StageEntityResponse } from "api";
import RoleAvatar from "@/components/common/roleAvatar";
import { useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import { useModuleContext } from "../../workPlace/context/_moduleContext";
import { ModuleItemEnum } from "../../workPlace/context/types";

// 角色表单项
function RoleListItem(
  { role, name, isSelected, onClick, onDelete, deleteMode }: {
    role: StageEntityResponse;
    name: string;
    isSelected: boolean;
    onClick?: () => void;
    onDelete?: () => void;
    deleteMode?: boolean;
  },
) {
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
          type: "role",
          name: role.name,
          id: role.versionId,
          entityType: role.entityType,
        }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2 min-w-0">
        {/* <img
          src={role.entityInfo!.avatarIds[0]}
          alt="avatar"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        /> */}
        <RoleAvatar avatarId={role.entityInfo!.avatarId || (role.entityInfo!.avatarIds && role.entityInfo!.avatarIds.length > 0 ? role.entityInfo!.avatarIds[0] : 0)} width={10} isRounded={true} stopPopWindow={true} />

        <div className="flex flex-col min-w-0 truncate">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{role.entityInfo!.description}</p>
        </div>
      </div>

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
            aria-label="立即删除角色"
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
              aria-label="确认删除角色"
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
            aria-label="删除角色"
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

export default function RoleList({ stageId, searchQuery: controlledQuery, deleteMode }: { stageId: number; searchQuery?: string; deleteMode?: boolean; showCreateButton?: boolean }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const handleClick = (role: StageEntityResponse) => {
    pushModuleTabItem({
      id: role.id!.toString(),
      label: role.name!,
      content: role,
      type: ModuleItemEnum.ROLE,
    });
    setCurrentSelectedTabId(role.id!.toString());
  };

  // 模组相关
  const { data, isSuccess: _isSuccess } = useQueryEntitiesQuery(stageId);
  const { mutate: updateScene } = useUpdateEntityMutation(stageId);
  // const { mutate: updateRole } = useUpdateEntityMutation(stageId); // 编辑功能已移除

  const list = data?.data!.filter(i => i.entityType === 2);
  const sceneList = data?.data!.filter(i => i.entityType === 3);

  // 添加搜索状态（支持受控）
  const [searchQuery, setSearchQuery] = useState("");
  const effectiveQuery = (controlledQuery ?? searchQuery).toLowerCase();

  // 根据搜索查询过滤列表
  const filteredList = list?.filter(i => ((i.name) || "")!.toLowerCase().includes(effectiveQuery));
  // 使用稳定顺序：按 id 升序，避免因后端返回顺序变化或名称变化导致列表抖动
  const sortedList = (filteredList || []).slice().sort((a, b) => (a.id || 0) - (b.id || 0));

  const isEmpty = sortedList.length === 0;

  // 删除角色
  const { mutate: deleteRole } = useDeleteEntityMutation();

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
              placeholder="搜索角色..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
      )}

      {isEmpty && (
        <div className="text-sm text-gray-500 px-2 py-4">暂时没有人物哦</div>
      )}
      {!isEmpty && (
        <>
          {sortedList.map(i => (
            <RoleListItem
              key={i!.id!.toString()}
              role={i!}
              name={i!.name || "未命名"}
              deleteMode={deleteMode}
              onDelete={() => {
                removeModuleTabItem(i.id!.toString());
                deleteRole(
                  {
                    id: i.id!,
                    stageId,
                  },
                  {
                    onSuccess: () => {
                      const newScenes = sceneList?.map((scene) => {
                        const newRoles = scene.entityInfo!.roles.filter((role: string | undefined) => role !== i.name);
                        return {
                          id: scene.id,
                          name: scene.name,
                          entityType: scene.entityType,
                          entityInfo: { ...scene.entityInfo, roles: newRoles },
                        };
                      });
                      newScenes?.forEach(scene => updateScene({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
                    },
                  },
                );
              }}
              isSelected={currentSelectedTabId === i!.id!.toString()}
              onClick={() => handleClick(i!)}
            />
          ))}
        </>
      )}
    </>
  );
}
