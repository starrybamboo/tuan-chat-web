import { RoomContext } from "@/components/chat/roomContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { use } from "react";

/**
 * 角色选择器组件，用于在聊天中选择不同的角色
 * @param handleRoleChange 角色变更时的回调函数，接收角色ID作为参数
 * @param className 自定义样式类名
 */
export default function RoleChooser({
  handleRoleChange,
  className,
}: {
  handleRoleChange: (roleId: number) => void;
  className?: string;
}) {
  const roomContext = use(RoomContext);
  return (
    <div className={className}>
      {
        roomContext.roomRolesThatUserOwn.length === 0 && (
          <div className="">无可用角色</div>
        )
      }
      {
        // 仅显示角色列表里面有的角色
        roomContext.roomRolesThatUserOwn.map(role => (
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
