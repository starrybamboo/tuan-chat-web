import type { ComponentType, SVGProps } from "react";

import { CheckCircleIcon, IdentificationCardIcon, PaintBrushBroadIcon, PaletteIcon } from "@phosphor-icons/react";

import { RoomChatIcon } from "@/icons";
import { DESIGN_SYSTEM_PATH } from "@/utils/devRouteAccess";

type TopNavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type TopNavItem = {
  to: string;
  label: string;
  icon: TopNavIcon;
  activePathPrefix?: string;
};

type BuildTopNavItemsOptions = {
  lastChatPath: string;
  canUseAiImage: boolean;
  canUseFeedback: boolean;
  canUseDesignSystem: boolean;
};

/** 按运行环境生成主界面一级 Tab，开发工具仅在对应环境进入导航。 */
export function buildTopNavItems({
  lastChatPath,
  canUseAiImage,
  canUseFeedback,
  canUseDesignSystem,
}: BuildTopNavItemsOptions): TopNavItem[] {
  return [
    { to: lastChatPath, label: "聊天", icon: RoomChatIcon, activePathPrefix: "/chat" },
    { to: "/role", label: "角色", icon: IdentificationCardIcon },
    ...(canUseAiImage ? [{ to: "/ai-image", label: "AI生图", icon: PaintBrushBroadIcon }] : []),
    ...(canUseFeedback ? [{ to: "/feedback", label: "反馈", icon: CheckCircleIcon }] : []),
    ...(canUseDesignSystem ? [{ to: DESIGN_SYSTEM_PATH, label: "设计系统", icon: PaletteIcon }] : []),
  ];
}
