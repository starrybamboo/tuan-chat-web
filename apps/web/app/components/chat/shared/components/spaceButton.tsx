import { motion, useAnimate } from "motion/react";
import { useEffect, useRef } from "react";

import { buttonClassName } from "@/components/common/Button";
import { maskClassName } from "@/components/common/DesignLanguage";
import { MediaImage } from "@/components/common/mediaImage";
import { interactiveButtonMotionProps } from "@/components/common/motion/interactiveButtonMotion";
import PortalTooltip from "@/components/common/portalTooltip";
import { CountBadge, StatusIndicator } from "@/components/common/StatusPrimitives";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/media/mediaUrl";

import type { Space } from "../../../../../api";

import { chatSidebarFocusClassName, type ChatSidebarActiveTone, getChatSidebarActiveTextClassName } from "./chatSidebarActiveTone";
import { resolveEntityImageUrl } from "./entityImageUrl";
import SidebarActiveCursor from "./sidebarActiveCursor";

const sidebarIconButtonBaseClass = buttonClassName({
  variant: "ghost",
  shape: "square",
  className: `w-10 border border-transparent relative transition-colors hover:bg-base-300 ${chatSidebarFocusClassName}`,
});
const collapsedButtonAnimation = {
  scale: [1, 0.9, 1.12, 0.98, 1],
  rotate: [0, -4, 4, -2, 0],
  x: [0, -1, 1, 0],
};
const collapsedButtonAnimationOptions = {
  duration: 0.42,
  ease: "easeOut",
} as const;

export default function SpaceButton({ space, unreadMessageNumber, onclick, onPreload, isActive, activeTone = "default", isCollapseToggleClick, collapseAnimationKey }: {
  space: Space;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  onPreload?: () => void;
  isActive: boolean;
  activeTone?: ChatSidebarActiveTone;
  isCollapseToggleClick?: boolean;
  collapseAnimationKey?: string;
}) {
  const displayName = space.name || "未命名空间";
  const fallbackAvatar = "/favicon.ico";
  const displayAvatar = imageLowUrlFromUrl(resolveEntityImageUrl(imageLowUrl(space.avatarFileId), fallbackAvatar));
  const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
  const previousAnimationKeyRef = useRef(collapseAnimationKey);
  const [buttonScope, animateButton] = useAnimate<HTMLButtonElement>();

  useEffect(() => {
    if (!collapseAnimationKey || previousAnimationKeyRef.current === collapseAnimationKey) {
      previousAnimationKeyRef.current = collapseAnimationKey;
      return;
    }
    previousAnimationKeyRef.current = collapseAnimationKey;
    void animateButton(buttonScope.current, collapsedButtonAnimation, collapsedButtonAnimationOptions);
  }, [animateButton, buttonScope, collapseAnimationKey]);

  const handleClick = () => {
    if (isCollapseToggleClick) {
      void animateButton(buttonScope.current, collapsedButtonAnimation, collapsedButtonAnimationOptions);
    }
    onclick();
  };

  return (
    <div
      className="
        group relative z-20 flex w-full justify-center py-1
        hover:z-50
      "
      key={space.spaceId}
    >
      <SidebarActiveCursor isActive={isActive} tone={activeTone} />
      <PortalTooltip label={displayName} placement="right">
        <motion.button
          className={`
            ${sidebarIconButtonBaseClass} overflow-visible
            ${isActive ? getChatSidebarActiveTextClassName(activeTone) : ""}
          `}
          ref={buttonScope}
          type="button"
          aria-label={displayName}
          aria-current={isActive ? "page" : undefined}
          onClick={handleClick}
          onFocus={onPreload}
          onPointerEnter={onPreload}
          {...(isCollapseToggleClick
            ? { whileHover: interactiveButtonMotionProps.whileHover, transition: interactiveButtonMotionProps.transition }
            : interactiveButtonMotionProps)}
        >
          <StatusIndicator
            indicator={unreadMessageNumber && unreadMessageNumber > 0
              ? <CountBadge tone="error">{unreadMessageNumber > 99 ? "99+" : unreadMessageNumber}</CountBadge>
              : null}
          >
            <div className={maskClassName({ className: "size-10" })}>
              <MediaImage
                src={displayAvatar}
                alt={displayName}
                className="h-full w-full object-cover"
                draggable={false}
                fallbackSrc={fallbackAvatar}
                loadTransition={true}
                onError={() => {
                  if (isDev) {
                    console.warn("[SpaceButton] avatar load failed after derivative/original fallback", {
                      spaceId: space.spaceId,
                      spaceName: displayName,
                      avatar: displayAvatar,
                    });
                  }
                }}
              />
            </div>
          </StatusIndicator>
        </motion.button>
      </PortalTooltip>
    </div>
  );
}
