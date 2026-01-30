import type { UserRole } from "../../../../api";
import { use, useState } from "react";
import { toast } from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { RoleDetailPagePopup } from "@/components/common/roleDetailPagePopup";
import { AddRingLight, IdentificationCardIcon, NarratorIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
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
  const [roleDetailRoleId, setRoleDetailRoleId] = useState<number>(-1);

  const isKP = (roomContext.curMember?.memberType ?? -1) === 1;

  const selectedRoleId = roleId;
  const roleAvatarsQuery = useGetRoleAvatarsQuery(selectedRoleId);
  const roleAvatars = roleAvatarsQuery.data?.data || [];

  const currentUserId = roomContext.curMember?.userId;
  const availableRoles = currentUserId
    ? roomContext.roomRolesThatUserOwn.filter(role => role.userId === currentUserId)
    : roomContext.roomRolesThatUserOwn;

  // 判断当前是否为旁白模式
  const isNarratorMode = selectedRoleId <= 0;
  const narratorTitle = showNarratorOption ? "旁白模式" : "未选择角色";
  const narratorDescription = showNarratorOption
    ? "旁白也可以选择“旁白用头像”（如果已配置），用于统一交互"
    : "请选择你的角色后再发送消息";

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

  const closeRoleDetail = () => {
    setRoleDetailRoleId(-1);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row w-full max-w-[92vw] md:max-w-[560px] lg:max-w-[640px] min-w-0 max-h-[70vh] md:max-h-[50vh] overflow-hidden">
        {/* 左侧：角色列表 */}
        <div className="w-full md:w-3/5 min-w-0 md:min-w-[160px] lg:min-w-[200px] border-b md:border-b-0 md:border-r border-base-300 p-2 md:pb-0 md:pr-3">
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
                    roleId={role.roleId}
                    width={10}
                    isRounded={true}
                    withTitle={false}
                    stopPopWindow={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{role.roleName}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs shrink-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRoleDetailRoleId(role.roleId);
                    }}
                    aria-label={`查看角色详情：${role.roleName}`}
                    title="查看角色详情"
                  >
                    <IdentificationCardIcon className="size-4" />
                  </button>
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
        <div className="w-full md:w-3/5 min-w-0 md:pl-3">
          {/* 旁白模式也可选择头像（若已配置） */}
          {roleAvatars && roleAvatars.length > 0
            ? (
                <div className="max-h-[40vh] md:max-h-[35vh] overflow-y-auto">
                  <div className="grid grid-cols-3 sm:grid-cols-4">
                    {roleAvatars.map(avatar => (
                      <div
                        onClick={() => handleExpressionChange(avatar.avatarId ?? -1)}
                        className="aspect-square rounded-lg transition-all hover:bg-base-200 cursor-pointer flex items-center justify-center"
                        key={avatar.avatarId}
                        title="点击选择头像"
                      >
                        <RoleAvatarComponent
                          avatarId={avatar.avatarId || -1}
                          roleId={selectedRoleId}
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
            : isNarratorMode
              ? (
                  <div className="text-center text-gray-500">
                    <NarratorIcon className="size-16 mx-auto text-base-content/30" />
                    <div className="text-sm mb-2">{narratorTitle}</div>
                    <div className="text-xs text-base-content/50">{narratorDescription}</div>
                  </div>
                )
              : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-sm mb-2">暂无可用头像</div>
                    <div className="text-xs text-base-content/50">请先为角色添加头像差分</div>
                  </div>
                )}
        </div>
      </div>

      <PopWindow
        isOpen={roleDetailRoleId > 0}
        onClose={closeRoleDetail}
        fullScreen={getScreenSize() === "sm"}
      >
        <div className="justify-center w-full">
          <RoleDetailPagePopup
            roleId={roleDetailRoleId}
            onClose={closeRoleDetail}
          />
        </div>
      </PopWindow>
    </>
  );
}
