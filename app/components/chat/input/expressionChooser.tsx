import type { UserRole } from "../../../../api";
import { use } from "react";
import { toast } from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { AddRingLight, NarratorIcon } from "@/icons";
import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

export function ExpressionChooser({
  roleId,
  handleExpressionChange,
  handleRoleChange,
  showNarratorOption = true,
}: {
  roleId: number;
  handleExpressionChange: (avatarId: number) => void;
  handleRoleChange: (roleId: number) => void;
  /** 是否显示旁白选项（WebGAL 联动模式下使用） */
  showNarratorOption?: boolean;
}) {
  const roomContext = use(RoomContext);
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);

  const isKP = (roomContext.curMember?.memberType ?? -1) === 1;

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
    if (!isKP) {
      toast.error("只有KP可以使用旁白");
      return;
    }
    handleRoleChange(-1); // roleId <= 0 表示旁白
  };

  return (
    <div className="flex flex-col md:flex-row w-[80vw] md:w-full min-w-0 md:min-w-0 max-w-full max-h-[70vh] md:max-h-[50vh] overflow-hidden">
      {/* 左侧：角色列表 */}
      <div className="w-full md:w-2/3 min-w-0 md:min-w-[180px] border-b md:border-b-0 md:border-r border-base-300 p-2 md:pb-0 md:pr-3">
        <div className="text-sm font-semibold mb-3 text-center">角色选择</div>
        <div className="space-y-2 max-h-[22vh] md:max-h-[42vh] overflow-y-auto px-1 -mx-1">
          {/* 旁白选项（WebGAL 联动模式） */}
          {showNarratorOption && (
            <div
              onClick={handleNarratorSelect}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isKP ? "cursor-pointer hover:bg-base-200" : "cursor-not-allowed opacity-60"
              } ${
                isNarratorMode ? "bg-base-200 ring-2 ring-inset ring-secondary/30" : ""
              }`}
            >
              <div className="size-10 rounded-full bg-base-300 flex items-center justify-center flex-shrink-0">
                <NarratorIcon className="size-6 text-base-content/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">旁白</div>
                  {isNarratorMode && (
                    <div className="text-xs text-secondary">已选中</div>
                  )}
                </div>
                <div className="text-xs text-base-content/50">{isKP ? "无角色叙述" : "仅KP可用"}</div>
              </div>
            </div>
          )}
          {
            availableRoles.length === 0 && (!showNarratorOption || !isKP) && (
              <div className="text-center text-sm text-gray-500 py-4">无可用角色</div>
            )
          }
          {
            availableRoles.map(role => (
              <div
                key={role.roleId}
                onClick={() => handleRoleSelect(role)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-base-200 transition-colors ${
                  selectedRoleId === role.roleId ? "bg-base-200 ring-2 ring-inset ring-primary/30" : ""
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
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium truncate">{role.roleName}</div>
                    {selectedRoleId === role.roleId && (
                      <div className="text-xs text-primary">已选中</div>
                    )}
                  </div>
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
      <div className="w-full md:w-1/3 min-w-0 md:min-w-[380px] md:pl-3">
        {/* 旁白模式下不显示表情 */}
        {isNarratorMode
          ? (
              <div className="text-center text-gray-500">
                <NarratorIcon className="size-16 mx-auto text-base-content/30" />
                <div className="text-sm mb-2">旁白模式</div>
                <div className="text-xs text-base-content/50">旁白消息没有角色头像和表情</div>
              </div>
            )
          : roleAvatars && roleAvatars.length > 0
            ? (
                <div className="max-h-[40vh] md:max-h-[35vh] overflow-y-auto">
                  <div className="grid grid-cols-4">
                    {roleAvatars.map(avatar => (
                      <div
                        onClick={() => handleExpressionChange(avatar.avatarId ?? -1)}
                        className="aspect-square rounded-lg transition-all hover:bg-base-200 cursor-pointer flex items-center justify-center"
                        key={avatar.avatarId}
                        title="点击选择表情"
                      >
                        <RoleAvatarComponent
                          avatarId={avatar.avatarId || -1}
                          width={16}
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
