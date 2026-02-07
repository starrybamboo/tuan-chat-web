import type { MouseEvent } from "react";
import type { UserRole } from "../../../../api";
import { use, useState } from "react";
import { toast } from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { RoleDetailPagePopup } from "@/components/common/roleDetailPagePopup";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { AddRingLight, ExpandCornersIcon, EyedropperIcon, IdentificationCardIcon, NarratorIcon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

export function ExpressionChooser({
  roleId,
  handleExpressionChange,
  handleRoleChange,
  showNarratorOption = true,
  onRequestClose,
}: {
  roleId: number;
  handleExpressionChange: (avatarId: number) => void;
  handleRoleChange: (roleId: number) => void;
  /** 是否显示旁白选项（WebGAL 联动模式下使用） */
  showNarratorOption?: boolean;
  onRequestClose?: () => void;
}) {
  const roomContext = use(RoomContext);
  const [_, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const [isAvatarFullscreen, setIsAvatarFullscreen] = useState(false);
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const setAvatarSamplerActive = useRoomUiStore(state => state.setAvatarSamplerActive);

  const isKP = (roomContext.curMember?.memberType ?? -1) === 1;

  const selectedRoleId = roleId;
  const roleAvatarsQuery = useGetRoleAvatarsQuery(selectedRoleId);
  const roleAvatars = roleAvatarsQuery.data?.data || [];

  const currentUserId = roomContext.curMember?.userId;
  const availableRoles = (isKP || !currentUserId)
    ? roomContext.roomRolesThatUserOwn
    : roomContext.roomRolesThatUserOwn.filter(role => role.userId === currentUserId);

  // 判断当前是否为旁白模式
  const isNarratorMode = selectedRoleId <= 0;
  const narratorTitle = showNarratorOption ? "旁白模式" : "未选择角色";
  const narratorDescription = showNarratorOption
    ? "旁白也可以选择“旁白用头像”（如果已配置），用于统一交互"
    : "请选择你的角色后再发送消息";

  const containerSizeClassName = isAvatarFullscreen
    ? "w-[94vw] min-w-[94vw] max-w-[94vw] md:w-[90vw] md:min-w-[90vw] md:max-w-[90vw] lg:w-[86vw] lg:min-w-[86vw] lg:max-w-[86vw] h-[80vh] max-h-[80vh]"
    : "max-w-[92vw] md:max-w-[560px] lg:max-w-[640px] max-h-[70vh] md:max-h-[50vh]";
  const containerLayoutClassName = isAvatarFullscreen ? "gap-3 md:gap-4" : "";
  const roleListClassName = isAvatarFullscreen
    ? "space-y-2 flex-1 min-h-0 overflow-y-auto px-1 -mx-1"
    : "space-y-2 max-h-[22vh] md:max-h-[42vh] overflow-y-auto px-1 -mx-1";
  const avatarListClassName = isAvatarFullscreen
    ? "flex-1 min-h-0"
    : "max-h-[40vh] md:max-h-[35vh]";
  const avatarGridClassName = isAvatarFullscreen
    ? "grid w-full grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2"
    : "grid grid-cols-3 sm:grid-cols-4 gap-1";
  const avatarSize = isAvatarFullscreen ? 30 : 12;
  const leftPanelClassName = isAvatarFullscreen
    ? "w-full md:w-[240px] lg:w-[260px] shrink-0 h-full min-h-0 flex flex-col border border-base-200/80 rounded-xl bg-base-100/90 shadow-sm p-2 md:pb-0 md:pr-3 overflow-hidden"
    : "w-full md:w-3/5 min-w-0 md:min-w-[160px] lg:min-w-[200px] border-b md:border-b-0 md:border-r border-base-300 p-2 md:pb-0 md:pr-3";
  const rightPanelClassName = isAvatarFullscreen
    ? "w-full md:flex-1 min-w-0 h-full min-h-0 overflow-hidden flex flex-col rounded-xl border border-base-200/80 bg-base-100/90 shadow-sm px-3 pt-2"
    : "w-full md:w-3/5 min-w-0 md:pl-3";
  const toolbarClassName = isAvatarFullscreen
    ? "sticky top-0 z-10 -mx-3 px-3 py-2 bg-base-100/95 backdrop-blur border-b border-base-200/70 rounded-t-xl"
    : "";
  const avatarItemClassName = isAvatarFullscreen
    ? "aspect-square rounded-xl bg-base-100/90 ring-1 ring-base-200/70 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center p-1"
    : "aspect-square rounded-lg transition-all hover:bg-base-200 cursor-pointer flex items-center justify-center";

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

  const handleSamplerToggle = (event?: MouseEvent<HTMLButtonElement>) => {
    if (isAvatarSamplerActive) {
      setAvatarSamplerActive(false);
      return;
    }
    setAvatarSamplerActive(true);
    onRequestClose?.();
    if (typeof document !== "undefined") {
      const activeElement = document.activeElement as HTMLElement | null;
      activeElement?.blur();
    }
    event?.currentTarget.blur();
  };

  return (
    <div className={`flex flex-col md:flex-row w-full min-w-0 overflow-hidden ${containerSizeClassName} ${containerLayoutClassName} ${isAvatarFullscreen ? "items-stretch" : ""}`}>
      {/* 左侧：角色列表 */}
      <div className={leftPanelClassName}>
        <div className={roleListClassName}>
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
              <div className="size-10 rounded-full bg-transparent flex items-center justify-center flex-shrink-0">
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
                  stopToastWindow={true}
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
                    toastWindow(close => (
                      <div className="justify-center w-full">
                        <RoleDetailPagePopup
                          roleId={role.roleId}
                          onClose={close}
                        />
                      </div>
                    ), {
                      fullScreen: getScreenSize() === "sm",
                    });
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
      <div className={rightPanelClassName}>
        {/* 旁白模式也可选择头像（若已配置） */}
        {roleAvatars && roleAvatars.length > 0
          ? (
              <>
                <div className={`flex items-center gap-2 pb-2 ${toolbarClassName} ${isAvatarFullscreen ? "justify-between" : "justify-end"}`}>
                  {isAvatarFullscreen && (
                    <div className="flex items-center gap-2 text-sm font-medium text-base-content/70">
                      头像列表
                      <span className="text-xs text-base-content/50">{roleAvatars.length}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`btn btn-xs gap-1 ${isAvatarSamplerActive ? "btn-info text-info-content" : "btn-ghost"}`}
                      onClick={handleSamplerToggle}
                      title={isAvatarSamplerActive ? "退出取样" : "墨水取样：点击消息头像"}
                      aria-label={isAvatarSamplerActive ? "退出取样" : "墨水取样：点击消息头像"}
                    >
                      <EyedropperIcon className="size-4" />
                      <span className="text-xs">{isAvatarSamplerActive ? "取样中" : "取样"}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs gap-1"
                      onClick={() => setIsAvatarFullscreen(prev => !prev)}
                      title={isAvatarFullscreen ? "退出全屏" : "全屏"}
                      aria-label={isAvatarFullscreen ? "退出全屏" : "全屏"}
                    >
                      <ExpandCornersIcon className="size-4" />
                      <span className="text-xs">{isAvatarFullscreen ? "退出全屏" : "全屏"}</span>
                    </button>
                  </div>
                </div>
                <div className={`${avatarListClassName} w-full overflow-y-auto overflow-x-hidden ${isAvatarFullscreen ? "pb-4" : ""}`}>
                  <div className={avatarGridClassName}>
                    {roleAvatars.map(avatar => (
                      <div
                        onClick={() => handleExpressionChange(avatar.avatarId ?? -1)}
                        className={avatarItemClassName}
                        key={avatar.avatarId}
                        title="点击选择头像"
                      >
                        <RoleAvatarComponent
                          avatarId={avatar.avatarId || -1}
                          roleId={selectedRoleId}
                          width={avatarSize}
                          isRounded={false}
                          withTitle={false}
                          stopToastWindow={true}
                          hoverToScale={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
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
  );
}
