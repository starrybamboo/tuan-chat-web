import type { UserRole } from "../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { AddRingLight } from "@/icons";
import React, { use } from "react";

/**
 * 角色选择器组件，用于在聊天中选择不同的角色
 * @param handleRoleChange 角色变更时的回调函数
 * @param roles 如果指定，就会使用这里的角色作为显示的列表，否则使用roomContext.roomRolesThatUserOwn
 * @param className 自定义样式类名
 */
export default function RoleChooser({
  handleRoleChange,
  roles,
  className,
}: {
  handleRoleChange: (roleId: UserRole) => void;
  roles?: UserRole[];
  className?: string;
}) {
  const roomContext = use(RoomContext);
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  return (
    <div className={`${className} max-h-[30vh]`}>
      {
        roomContext.roomRolesThatUserOwn.length === 0 && (
          <div className="">无可用角色</div>
        )
      }
      {
        // 仅显示角色列表里面有的角色
        (roles || roomContext.roomRolesThatUserOwn).map(role => (
          <li
            key={role.roleId}
            onClick={() => handleRoleChange(role)}
            className="flex flex-row list-none"
          >
            <div className="w-full">
              <RoleAvatarComponent
                avatarId={role.avatarId ?? 0}
                width={10}
                isRounded={false}
                withTitle={false}
                stopPopWindow={true}
              >
              </RoleAvatarComponent>
              <div>{role.roleName}</div>
            </div>
          </li>
        ))
      }
      {
        (roomContext.curMember?.memberType ?? 3) < 3 && (
          <li className="flex flex-row list-none group" onClick={() => setIsRoleAddWindowOpen(true)}>
            <div className="w-full">
              <AddRingLight className="size-10 group-hover:text-info"></AddRingLight>
              <div>
                添加角色
              </div>
            </div>
          </li>
        )
      }
    </div>
  );
}
