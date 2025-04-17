import { GroupContext } from "@/components/chat/GroupContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { use } from "react";

export default function RoleChooser({ handleRoleChange, className }: { handleRoleChange: (roleId: number) => void; className?: string }) {
  const groupContext = use(GroupContext);
  return (
    <div className={className}>
      {
        // 仅显示角色列表里面有的角色
        groupContext.groupRolesThatUserOwn.map(role => (
          <li
            key={role.roleId}
            onClick={() => handleRoleChange(role.roleId)}
            className="flex, flex-row list-none"
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
    </div>
  );
}
