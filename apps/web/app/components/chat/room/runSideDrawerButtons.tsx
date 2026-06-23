import { CheckerboardIcon, SwordIcon } from "@phosphor-icons/react";
import { use, type ReactNode } from "react";

import { formatUnreadBadgeCount, useVisibleClueFolderUnreadCount } from "@/components/chat/clues/clueUnread";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { getNextRunSideDrawerState } from "@/components/chat/room/runSideDrawerState";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { FolderIcon } from "@/icons";

type RunSideDrawerButtonsProps = {
  className?: string;
  orientation?: "row" | "column";
  tooltipPlacement?: "top" | "bottom" | "right";
}

export { getNextRunSideDrawerState } from "@/components/chat/room/runSideDrawerState";

function UnreadBadge({ count }: { count?: number }) {
  if (!count || count <= 0) {
    return null;
  }

  return (
    <span className="
      pointer-events-none absolute right-1 top-0 flex h-4 min-w-4
      items-center justify-center rounded-full bg-error px-1 text-[10px]
      font-semibold leading-none text-error-content shadow-sm
    ">
      {formatUnreadBadgeCount(count)}
    </span>
  );
}

export default function RunSideDrawerButtons({
  className = "",
  orientation = "row",
  tooltipPlacement = "top",
}: RunSideDrawerButtonsProps) {
  const spaceContext = use(SpaceContext);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const clueUnreadCount = useVisibleClueFolderUnreadCount(spaceContext.spaceId);
  const isCombatDrawerOpen = sideDrawerState === "combat" || sideDrawerState === "initiative" || sideDrawerState === "state";
  const isClueDrawerOpen = sideDrawerState === "clue";
  const isMapDrawerOpen = sideDrawerState === "map";

  const tooltipClassName = tooltipPlacement === "bottom"
    ? "tooltip-bottom"
    : tooltipPlacement === "right"
      ? "tooltip-right"
      : "tooltip-top";
  const getRunDrawerButtonClassName = (isActive: boolean, hasBadge: boolean) => [
    "tooltip relative flex h-7 items-center gap-1.5 px-2 text-xs leading-none transition-colors",
    tooltipClassName,
    hasBadge ? "pr-5" : "",
    isActive
      ? "bg-primary/15 text-primary"
      : "text-base-content/70 hover:bg-base-200/70 hover:text-primary",
  ].join(" ");

  const renderButton = ({
    icon,
    isActive,
    label,
    onClick,
    tip,
    unreadCount,
  }: {
    icon: ReactNode;
    isActive: boolean;
    label: string;
    onClick: () => void;
    tip?: string;
    unreadCount?: number;
  }) => (
    <button
      type="button"
      className={getRunDrawerButtonClassName(isActive, Boolean(unreadCount && unreadCount > 0))}
      data-tip={tip ?? label}
      data-side-drawer-toggle="true"
      aria-pressed={isActive}
      onClick={onClick}
    >
      {icon}
      <span className="whitespace-nowrap font-medium">{label}</span>
      <UnreadBadge count={unreadCount} />
    </button>
  );

  return (
    <div className={`
      flex
      ${orientation === "column" ? "flex-col divide-y" : `divide-x`}
      divide-base-300/70 overflow-hidden rounded-md border border-base-300/80
      bg-base-200/35
      ${className}
    `}>
      {renderButton({
        icon: <FolderIcon className="size-4 jump_icon" />,
        isActive: isClueDrawerOpen,
        label: "线索",
        onClick: () => setSideDrawerState(getNextRunSideDrawerState(sideDrawerState, "clue")),
        unreadCount: clueUnreadCount,
      })}

      {renderButton({
        icon: <SwordIcon className="size-4 jump_icon" />,
        isActive: isCombatDrawerOpen,
        label: "战斗",
        tip: "战斗面板",
        onClick: () => setSideDrawerState(getNextRunSideDrawerState(sideDrawerState, "combat")),
      })}

      {renderButton({
        icon: <CheckerboardIcon className="size-4 jump_icon" />,
        isActive: isMapDrawerOpen,
        label: "地图",
        onClick: () => setSideDrawerState(getNextRunSideDrawerState(sideDrawerState, "map")),
      })}

    </div>
  );
}
