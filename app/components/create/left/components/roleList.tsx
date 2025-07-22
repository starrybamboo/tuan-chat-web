import type { RoleResponse, StageEntityResponse } from "api";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddEntityMutation, useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useCreateRoleMutation, useGetUserRolesQuery } from "api/queryHooks";
import { useState } from "react";
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
        <img
          src={role.entityInfo!.avatar}
          alt="avatar"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline">{name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{role.entityInfo!.description}</p>
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

// 新增：用于我的角色选择弹窗的组件
function MyRoleListItem({ avatarId, name, description, isSelected, onClick }: {
  avatarId: number | string;
  name: string;
  description?: string;
  isSelected: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <RoleAvatarComponent
          avatarId={Number(avatarId)}
          width={10}
          withTitle={false}
          isRounded={true}
          stopPopWindow={true}
        />
        <div className="flex flex-col">
          <p className="self-baseline">{name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function RoleList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const userId = useGlobalContext().userId ?? -1;
  const handleClick = (role: StageEntityResponse) => {
    pushModuleTabItem({
      id: role.id!.toString(),
      label: role.name!,
      type: ModuleItemEnum.ROLE,
    });
    setCurrentSelectedTabId(role.id!.toString());
  };

  // 模组相关
  const { data, isSuccess: _isSuccess } = useQueryEntitiesQuery(stageId);
  const list = data?.data!.filter(i => i.entityType === "role");
  const isEmpty = !list || list!.length === 0;

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 添加角色弹窗
  const [selectedRoleList, setSelectedRoleList] = useState<RoleResponse[]>([]);

  const handleAddRole = (role: RoleResponse) => {
    const { roleId } = role;
    if (roleId) {
      if (selectedRoleList.some(r => r.roleId === roleId)) {
        setSelectedRoleList(selectedRoleList.filter(r => r.roleId !== roleId));
      }
      else {
        setSelectedRoleList([...selectedRoleList, role]);
      }
    }
  };

  // 添加自己的角色
  const { data: myRoleData } = useGetUserRolesQuery(userId);
  const myRoleList = myRoleData?.data || [];

  // 添加模组角色
  const { mutate: addRole } = useAddEntityMutation("role");
  // 删除模组角色
  const { mutate: deleteRole } = useDeleteEntityMutation();
  const handleAddRoleSubmit = () => {
    Promise.all(selectedRoleList.map(role =>
      addRole({
        stageId,
        name: role.roleName!,
        entityInfo: role,
      }),
    )).then(() => {
      setSelectedRoleList([]);
    });
  };

  // 创建全新的模组角色
  const { mutate: createRole } = useCreateRoleMutation();
  const handleCreateRoleSubmit = () => {
    createRole({
      roleName: "新角色",
      description: "无",
    }, {
      onSuccess: (data) => {
        addRole({
          stageId,
          name: `新角色${data}`,
          entityInfo: {
            roleName: "新角色",
            description: "无",
          },
        });
      },
    });
  };

  return (
    <Section label="角色" onClick={handleOpen}>
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有人物哦
              </div>
            )
          : (list?.map(i => (
              <RoleListItem
                key={i!.entityInfo!.roleId ?? i!.name ?? 0}
                role={i!}
                name={i!.name || "未命名"}
                onDelete={() => {
                  removeModuleTabItem(i.id!.toString());
                  deleteRole({
                    id: i.id!,
                    stageId,
                  });
                }}
                isSelected={currentSelectedTabId === (i!.id!.toString())}
                onClick={() => handleClick(i!)}
              />
            )))}
      </>
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">选择你的角色进行添加</p>
          <div className="space-y-2">
            {myRoleList?.map(i => (
              <MyRoleListItem
                key={i!.roleId}
                avatarId={i!.avatarId || ""}
                name={i!.roleName || "角色名称未设置"}
                description={i!.description || ""}
                isSelected={selectedRoleList.some(r => r.roleId === i!.roleId)}
                onClick={() => handleAddRole(i)}
              />
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleCreateRoleSubmit();
                handleClose();
              }}
              title="创建一个全新的模组角色"
            >
              创建一个全新的模组角色
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleAddRoleSubmit();
                handleClose();
                // 添加角色的逻辑
              }}
              title="添加角色"
            >
              添加角色
            </button>
          </div>
        </div>
      </PopWindow>
    </Section>
  );
}
