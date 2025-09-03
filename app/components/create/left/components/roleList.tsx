import type { StageEntityResponse } from "api";
import RoleAvatar from "@/components/common/roleAvatar";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useAddRoleMutation, useDeleteEntityMutation, useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useState } from "react";
import CreateRole from "./createRole";
import Section from "./section";

// 角色表单项
function RoleListItem(
  { role, name, isSelected, onClick, onDelete }: {
    role: StageEntityResponse;
    name: string;
    isSelected: boolean;
    onClick?: () => void;
    onDelete?: () => void;
  },
) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        {/* <img
          src={role.entityInfo!.avatarIds[0]}
          alt="avatar"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        /> */}
        <RoleAvatar avatarId={role.entityInfo!.avatarId || (role.entityInfo!.avatarIds && role.entityInfo!.avatarIds.length > 0 ? role.entityInfo!.avatarIds[0] : 0)} width={10} isRounded={true} stopPopWindow={true} />

        <div className="flex flex-col">
          <p className="self-baseline">{name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5 line-clamp-1">{role.entityInfo!.description}</p>
        </div>
      </div>

      {/* 右侧按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
        onClick={(e) => {
          if (onDelete)
            onDelete();
          e.stopPropagation();
        }}
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
    </div>
  );
}

export default function RoleList({ stageId }: { stageId: number }) {
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

  const list = data?.data!.filter(i => i.entityType === 2);
  const sceneList = data?.data!.filter(i => i.entityType === 3);

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");

  // 根据搜索查询过滤列表
  const filteredList = list?.filter(i =>
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isEmpty = !filteredList || filteredList!.length === 0;

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  const handleOpen = () => {
    setIsOpen(true);
  };
  const handleClose = () => {
    setIsOpen(false);
  };

  // 角色相关
  const { mutate: deleteRole } = useDeleteEntityMutation();
  const { mutate: createRole } = useAddRoleMutation();
  const { mutate: createNewRole } = useAddEntityMutation(2);
  const listIdSets = new Set(list?.map(i => i.id!.toString())); // 已经请求到的角色 ID 集合, 传入创建中, 提示用户避免选入
  const handleAddRoleSubmit = (row: any[]) => {
    Promise.all(row.map(role =>
      createRole({
        stageId,
        roleId: role.id,
        type: 1,
      }),
    ));
  };

  // 使用状态管理角色序号，避免重名
  const [roleCounter, setRoleCounter] = useState(0);

  const handleCreateNewRole = (sum: number) => {
    try {
      let newCounter = roleCounter;
      for (let j = 1; j <= sum; j++) {
        let name = `新角色${newCounter}`;
        // 检查是否已存在，如果存在则继续递增直到找到唯一名称
        while (list?.some(role => role.name === name)) {
          newCounter++;
          name = `新角色${newCounter}`;
        }
        createNewRole({
          stageId: stageId as number,
          name,
          entityInfo: {
            avatarIds: [],
            description: "无",
            speakerName: "无",
            modelName: "无",
            type: 0,
            ability: {},
            act: {},
          },
        });
        newCounter++;
      }
      // 更新序号状态
      setRoleCounter(newCounter);
    }
    catch (error) {
      console.error("创建角色失败:", error);
    }
    handleClose();
  };

  return (
    <Section label="角色" onClick={handleOpen}>
      <>
        {/* 添加搜索框 */}
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

        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有人物哦
              </div>
            )
          : (filteredList?.map(i => (
              <RoleListItem
                key={i!.entityInfo!.roleId ?? i!.name ?? 0}
                role={i!}
                name={i!.name || "未命名"}
                onDelete={() => {
                  removeModuleTabItem(i.id!.toString());
                  deleteRole({
                    id: i.id!,
                    stageId,
                  }, {
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
                  });
                }}
                isSelected={currentSelectedTabId === (i!.id!.toString())}
                onClick={() => handleClick(i!)}
              />
            )))}
      </>

      <CreateRole
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleAddRoleSubmit}
        onCreateNew={handleCreateNewRole}
        multiSelect={true}
        existIdSet={listIdSets}
      />
    </Section>
  );
}
