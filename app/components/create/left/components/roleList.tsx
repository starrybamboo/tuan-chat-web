import type { StageEntityResponse } from "api";
import RoleAvatar from "@/components/common/roleAvatar";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddRoleMutation, useDeleteEntityMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
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
        <RoleAvatar avatarId={role.entityInfo!.avatarId || role.entityInfo!.avatarIds[0]} width={10} isRounded={true} stopPopWindow={true} />

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
  const list = data?.data!.filter(i => i.entityType === 2);
  const isEmpty = !list || list!.length === 0;

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

      <CreateRole
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleAddRoleSubmit}
        multiSelect={true}
        existIdSet={listIdSets}
      />
    </Section>
  );
}
