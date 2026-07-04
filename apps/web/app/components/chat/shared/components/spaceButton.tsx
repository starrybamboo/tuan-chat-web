import { motion, useAnimate } from "motion/react";
import { useEffect, useRef } from "react";

import { IMAGE_NATURAL_BORDER_CLASS } from "@/components/common/Avatar";
import { MediaImage } from "@/components/common/mediaImage";
import { interactiveButtonMotionProps } from "@/components/common/motion/interactiveButtonMotion";
import PortalTooltip from "@/components/common/portalTooltip";
import { imageLowUrl, imageLowUrlFromUrl } from "@/utils/media/mediaUrl";

import type { Space } from "../../../../../api";

import { resolveEntityImageUrl } from "./entityImageUrl";
import SidebarActiveCursor from "./sidebarActiveCursor";

const sidebarIconButtonBaseClass = "w-10 btn btn-square border border-transparent relative";
const sidebarIconButtonActiveClass = "border-info/40 text-info";
const collapsedButtonAnimation = {
  scale: [1, 0.9, 1.12, 0.98, 1],
  rotate: [0, -4, 4, -2, 0],
  x: [0, -1, 1, 0],
};
const collapsedButtonAnimationOptions = {
  duration: 0.42,
  ease: "easeOut",
} as const;

export default function SpaceButton({ space, unreadMessageNumber, onclick, onPreload, isActive, isLeftDrawerCollapsed, isCollapseToggleClick, collapseAnimationKey }: {
  space: Space;
  unreadMessageNumber: number | undefined;
  onclick: () => void;
  onPreload?: () => void;
  isActive: boolean;
  isLeftDrawerCollapsed?: boolean;
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
        group relative z-20
        hover:z-50
        w-10 my-1 rounded
      "
      key={space.spaceId}
    >
      <SidebarActiveCursor isActive={isActive} tone={isLeftDrawerCollapsed ? "collapsed" : "default"} />
      <PortalTooltip label={displayName} placement="right">
        <motion.button
          className={`
            ${sidebarIconButtonBaseClass}
            ${isActive ? sidebarIconButtonActiveClass : ""}
          `}
          ref={buttonScope}
          type="button"
          aria-label={displayName}
          aria-pressed={isActive}
          onClick={handleClick}
          onFocus={onPreload}
          onPointerEnter={onPreload}
          {...(isCollapseToggleClick
            ? { whileHover: interactiveButtonMotionProps.whileHover, transition: interactiveButtonMotionProps.transition }
            : interactiveButtonMotionProps)}
        >
          <div className="indicator">
            {(unreadMessageNumber && unreadMessageNumber > 0)
              ? (
                  <span
                    className="indicator-item badge badge-xs bg-error"
                  >
                    {unreadMessageNumber}
                  </span>
                )
              : null}
            <div className={`avatar mask mask-squircle size-10 ${IMAGE_NATURAL_BORDER_CLASS}`}>
              <MediaImage
                src={displayAvatar}
                alt={displayName}
                className="h-full w-full object-cover"
                draggable={false}
                fallbackSrc={fallbackAvatar}
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
          </div>
        </motion.button>
      </PortalTooltip>
    </div>
  );
}
