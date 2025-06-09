import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGetRoleAvatarsQuery } from "api/queryHooks";

export function ExpressionChooser({ roleId, handleExpressionChange }: { roleId: number; handleExpressionChange: (avatarId: number) => void }) {
  const roleAvatarsQuery = useGetRoleAvatarsQuery(roleId);
  const roleAvatars = roleAvatarsQuery.data?.data || [];
  return (
    roleAvatars && roleAvatars.length > 0
      ? (
          <div className="w-95 flex overflow-auto">
            <div className="grid grid-cols-5 gap-2 ">
              {roleAvatars.map(avatar => (
                <div
                  onClick={() => handleExpressionChange(avatar.avatarId ?? -1)}
                  className="object-cover rounded transition-all"
                  key={avatar.avatarId}
                >
                  <RoleAvatarComponent
                    avatarId={avatar.avatarId || -1}
                    width={16}
                    isRounded={false}
                    withTitle={true}
                    stopPopWindow={true}
                  >
                  </RoleAvatarComponent>
                </div>
              ))}
            </div>
          </div>
        )
      : (
          <div className="text-center p-2 text-gray-500 text-sm">暂无可用头像</div>
        )
  );
}
