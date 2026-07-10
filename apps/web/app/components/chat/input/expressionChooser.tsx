import { use, useEffect, useMemo, useState } from "react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { getScreenSize } from "@/utils/getScreenSize";

import type { UserRole } from "../../../../api";

import { useGetRoleAvatarsQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { ExpressionAvatarPanel } from "./expressionAvatarPanel";
import { RoleSelectionPanel } from "./roleSelectionPanel";

export function ExpressionChooser({
  roleId,
  selectedAvatarId,
  handleExpressionChange,
  handleRoleChange,
  showNarratorOption = true,
  onRequestClose,
  defaultFullscreen = false,
  fullscreenLayoutMode = "dialog",
  onRequestFullscreen,
  fitContainer = false,
}: {
  roleId: number;
  selectedAvatarId?: number;
  handleExpressionChange: (avatarId: number) => void;
  handleRoleChange: (roleId: number) => void;
  /** 是否显示旁白选项（WebGAL 联动模式下使用） */
  showNarratorOption?: boolean;
  onRequestClose?: () => void;
  defaultFullscreen?: boolean;
  /** 全屏时的布局模式：`dialog` 保持原本固定高度；`fill` 填满父容器 */
  fullscreenLayoutMode?: "dialog" | "fill";
  onRequestFullscreen?: (next: boolean) => void;
  /** 由房间输入框弹层控制尺寸时，选择器填满父容器 */
  fitContainer?: boolean;
}) {
  const roomContext = use(RoomContext);
  const [isAvatarFullscreen, setIsAvatarFullscreen] = useState(Boolean(defaultFullscreen));
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const setAvatarSamplerActive = useRoomUiStore(state => state.setAvatarSamplerActive);
  const isMobile = getScreenSize() === "sm";
  const isMobileFullscreen = isMobile && isAvatarFullscreen;
  // 移动端全屏下默认折叠角色列表，优先展示立绘差分。
  const [isRoleListExpanded, setIsRoleListExpanded] = useState(!isMobileFullscreen);

  useEffect(() => {
    setIsAvatarFullscreen(Boolean(defaultFullscreen));
  }, [defaultFullscreen]);

  useEffect(() => {
    setIsRoleListExpanded(!isMobileFullscreen);
  }, [isMobileFullscreen]);

  const selectedRoleId = roleId;
  const roleAvatarsQuery = useGetRoleAvatarsQuery(selectedRoleId);
  const roleAvatars = useMemo(() => roleAvatarsQuery.data?.data ?? [], [roleAvatarsQuery.data]);
  const storedAvatarVariantId = useRoomRoleSelectionStore(state => state.curAvatarVariantIdMap[selectedRoleId]);
  const setCurAvatarVariantIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarVariantIdForRole);

  const availableRoles = roomContext.roomRolesThatUserOwn;
  const selectedRole = useMemo(
    () => availableRoles.find(role => role.roleId === selectedRoleId),
    [availableRoles, selectedRoleId],
  );
  // 判断当前是否为旁白模式
  const isNarratorMode = selectedRoleId < 0;
  // 判断是否未选择角色
  const isNoRoleMode = selectedRoleId === 0;

  let narratorTitle = selectedRole?.roleName ?? "未知角色";
  if (isNarratorMode) {
    narratorTitle = "旁白模式";
  }
  else if (isNoRoleMode) {
    narratorTitle = "未选择角色";
  }

  const narratorDescription = showNarratorOption
    ? "旁白也可以选择“旁白用头像”（如果已配置），用于统一交互"
    : "请选择你的角色后再发送消息";

  const containerSizeClassName = isAvatarFullscreen
    ? (fullscreenLayoutMode === "fill"
        ? "w-full max-w-full min-w-0 h-full max-h-full min-h-0"
        : "w-full max-w-full min-w-0 h-[80vh] max-h-[80vh]")
    : (fitContainer
        ? "w-full min-w-0 h-full min-h-0"
        : "w-[96vw] md:w-[840px] h-[78vh] md:h-[430px] max-h-[82vh]");
  const containerLayoutClassName = isAvatarFullscreen
    ? (isMobileFullscreen ? "gap-2" : "gap-3 md:gap-4")
    : "";
  const roleListClassName = isAvatarFullscreen
    ? (isMobile
        ? "space-y-2 max-h-[42vh] overflow-y-auto px-1 -mx-1"
        : "space-y-2 flex-1 min-h-0 overflow-y-auto px-1 -mx-1")
    : (isMobile
        ? "space-y-2 max-h-[32vh] overflow-y-auto px-1 -mx-1"
        : "space-y-2 flex-1 min-h-0 overflow-y-auto px-1 -mx-1");
  const leftPanelClassName = isAvatarFullscreen
    ? (isMobile
        ? "w-full shrink-0 border border-base-200/80 rounded-xl bg-base-100/90 shadow-sm p-2"
        : "w-full md:w-[240px] lg:w-[260px] shrink-0 h-full min-h-0 flex flex-col border border-base-200/80 rounded-xl bg-base-100/90 shadow-sm p-2 md:pb-0 md:pr-3 overflow-hidden")
    : "w-full md:w-[320px] md:min-w-[320px] md:max-w-[320px] md:h-full md:min-h-0 shrink-0 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-base-300 p-2 md:pb-0 md:pr-3";
  const rightPanelClassName = isAvatarFullscreen
    ? (isMobileFullscreen
        ? "w-full min-w-0 h-full min-h-0 overflow-hidden flex flex-col rounded-xl border border-base-200/80 bg-base-100/90 shadow-sm px-1.5 pt-1.5"
        : "w-full md:flex-1 min-w-0 h-full min-h-0 overflow-hidden flex flex-col rounded-xl border border-base-200/80 bg-base-100/90 shadow-sm px-3 pt-2")
    : "w-full flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col md:pl-3";
  const leftPanelOrderClassName = isMobileFullscreen ? "order-2 mt-2" : "order-1";
  const rightPanelOrderClassName = isMobileFullscreen ? "order-1" : "order-2";

  const handleRoleSelect = (role: UserRole) => {
    handleRoleChange(role.roleId);
    if (isMobileFullscreen) {
      setIsRoleListExpanded(false);
    }
  };

  // 切换到旁白模式
  const handleNarratorSelect = () => {
    handleRoleChange(-1); // roleId <= 0 表示旁白
    if (isMobileFullscreen) {
      setIsRoleListExpanded(false);
    }
  };

  const handleAvatarPanelFullscreenChange = (next: boolean) => {
    setIsAvatarFullscreen(next);
    onRequestFullscreen?.(next);
  };

  return (
    <div className={`
      flex flex-col
      md:flex-row
      w-full min-w-0 overflow-hidden
      ${containerSizeClassName}
      ${containerLayoutClassName}
      ${isAvatarFullscreen ? `items-stretch` : ""}
    `}>
      <RoleSelectionPanel
        className={`${leftPanelClassName} ${leftPanelOrderClassName}`}
        listClassName={`${roleListClassName} ${isMobileFullscreen ? "mt-2" : ""}`}
        roles={availableRoles}
        selectedRoleId={selectedRoleId}
        showNarratorOption={showNarratorOption}
        showMobileCurrentRoleToggle={isMobileFullscreen}
        isMobileLayout={isMobile}
        isExpanded={isRoleListExpanded}
        onExpandedChange={setIsRoleListExpanded}
        onRoleSelect={handleRoleSelect}
        onNarratorSelect={handleNarratorSelect}
      />

      <ExpressionAvatarPanel
        className={`${rightPanelClassName} ${rightPanelOrderClassName}`}
        selectedRoleId={selectedRoleId}
        selectedAvatarId={selectedAvatarId}
        roleAvatars={roleAvatars}
        storedAvatarVariantId={storedAvatarVariantId}
        narratorTitle={narratorTitle}
        narratorDescription={narratorDescription}
        isNarratorMode={isNarratorMode}
        isNoRoleMode={isNoRoleMode}
        isMobile={isMobile}
        isAvatarFullscreen={isAvatarFullscreen}
        isMobileFullscreen={isMobileFullscreen}
        isAvatarSamplerActive={isAvatarSamplerActive}
        onAvatarSamplerChange={setAvatarSamplerActive}
        onRequestClose={onRequestClose}
        onRequestFullscreen={handleAvatarPanelFullscreenChange}
        onAvatarChange={handleExpressionChange}
        onAvatarVariantChange={setCurAvatarVariantIdForRole}
      />
    </div>
  );
}
