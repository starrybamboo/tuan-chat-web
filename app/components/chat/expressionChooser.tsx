import type { UserRole } from "../../../api";
import { RoomContext } from "@/components/chat/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { AddRingLight, NarratorIcon } from "@/icons";
import { useGetRoleAvatarsQuery } from "api/queryHooks";
import { use } from "react";

export function ExpressionChooser({
  roleId,
  handleExpressionChange,
  handleRoleChange,
  showNarratorOption = false,
}: {
  roleId: number;
  handleExpressionChange: (avatarId: number) => void;
  handleRoleChange: (roleId: number) => void;
  /** 是否显示旁白选项（WebGAL 联动模式下使用） */
  showNarratorOption?: boolean;
}) {
  const roomContext = use(RoomContext);
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);

  const selectedRoleId = roleId;
  const roleAvatarsQuery = useGetRoleAvatarsQuery(selectedRoleId);
  const roleAvatars = roleAvatarsQuery.data?.data || [];

  const availableRoles = roomContext.roomRolesThatUserOwn;

  // 判断当前是否为旁白模式
  const isNarratorMode = selectedRoleId <= 0;

  const handleRoleSelect = (role: UserRole) => {
    handleRoleChange(role.roleId);
  };

  // 切换到旁白模式
  const handleNarratorSelect = () => {
    handleRoleChange(-1); // roleId <= 0 表示旁白
  };

  return (
    <div className="flex w-full min-w-[600px] max-h-[50vh] overflow-hidden">
      {/* 左侧：角色列表 */}
      <div className="w-1/3 min-w-[180px] border-r border-base-300 pr-3">
        <div className="text-sm font-semibold mb-3 text-center">角色选择</div>
        <div className="space-y-2 max-h-[42vh] overflow-y-auto">
          {/* 旁白选项（WebGAL 联动模式） */}
          {showNarratorOption && (
            <div
              onClick={handleNarratorSelect}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors ${
                isNarratorMode ? "bg-base-200 ring-2 ring-secondary/30" : ""
              }`}
            >
              <div className="size-10 rounded-full bg-base-300 flex items-center justify-center flex-shrink-0">
                <NarratorIcon className="size-6 text-base-content/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">旁白</div>
                <div className="text-xs text-base-content/50">无角色叙述</div>
                {isNarratorMode && (
                  <div className="text-xs text-secondary mt-1">已选中</div>
                )}
              </div>
            </div>
          )}
          {
            availableRoles.length === 0 && !showNarratorOption && (
              <div className="text-center text-sm text-gray-500 py-4">无可用角色</div>
            )
          }
          {
            availableRoles.map(role => (
              <div
                key={role.roleId}
                onClick={() => handleRoleSelect(role)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors ${
                  selectedRoleId === role.roleId ? "bg-base-200 ring-2 ring-primary/30" : ""
                }`}
              >
                <RoleAvatarComponent
                  avatarId={role.avatarId ?? 0}
                  width={10}
                  isRounded={true}
                  withTitle={false}
                  stopPopWindow={true}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{role.roleName}</div>
                  {selectedRoleId === role.roleId && (
                    <div className="text-xs text-primary mt-1">已选中</div>
                  )}
                </div>
              </div>
            ))
          }
          {
            (roomContext.curMember?.memberType ?? 3) < 3 && (
              <div
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors group border-2 border-dashed border-base-300"
                onClick={() => setIsRoleAddWindowOpen(true)}
              >
                <AddRingLight className="size-10 group-hover:text-info" />
                <div className="text-sm text-base-content/70 group-hover:text-info">添加新角色</div>
              </div>
            )
          }
        </div>
      </div>

      {/* 右侧：表情列表 */}
      <div className="w-2/3 min-w-[380px] pl-3">
        {/* 旁白模式下不显示表情 */}
        {isNarratorMode
          ? (
              <div className="text-center py-12 text-gray-500">
                <NarratorIcon className="size-16 mx-auto mb-4 text-base-content/30" />
                <div className="text-sm mb-2">旁白模式</div>
                <div className="text-xs text-base-content/50">旁白消息没有角色头像和表情</div>
              </div>
            )
          : roleAvatars && roleAvatars.length > 0
            ? (
                <div className="max-h-[35vh] overflow-y-auto">
                  <div className="grid grid-cols-6 gap-2">
                    {roleAvatars.map(avatar => (
                      <div
                        onClick={() => handleExpressionChange(avatar.avatarId ?? -1)}
                        className="aspect-square rounded-lg transition-all hover:bg-base-200 cursor-pointer flex items-center justify-center"
                        key={avatar.avatarId}
                        title="点击选择表情"
                      >
                        <RoleAvatarComponent
                          avatarId={avatar.avatarId || -1}
                          width={12}
                          isRounded={false}
                          withTitle={false}
                          stopPopWindow={true}
                          hoverToScale={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-sm mb-2">暂无可用头像</div>
                  <div className="text-xs text-base-content/50">请先为角色添加表情差分</div>
                </div>
              )}
      </div>
    </div>
  );
}
