import type { ReactNode } from "react";
import type { SideDrawerState } from "@/components/chat/stores/sideDrawerStore";

import { CheckerboardIcon, SwordIcon } from "@phosphor-icons/react";

import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { FolderIcon, WebgalIcon } from "@/icons";

interface RunSideDrawerButtonsProps {
  className?: string;
  orientation?: "row" | "column";
  tooltipPlacement?: "top" | "bottom" | "right";
}

type RunSideDrawerTarget = "clue" | "combat" | "map" | "webgal";

function isRunSideDrawerTargetOpen(state: SideDrawerState, target: RunSideDrawerTarget): boolean {
  if (target === "combat") {
    return state === "combat" || state === "initiative" || state === "state";
  }
  return state === target;
}

export function getNextRunSideDrawerState(
  state: SideDrawerState,
  target: RunSideDrawerTarget,
): SideDrawerState {
  return isRunSideDrawerTargetOpen(state, target) ? "none" : target;
}

export default function RunSideDrawerButtons({
  className = "",
  orientation = "row",
  tooltipPlacement = "top",
}: RunSideDrawerButtonsProps) {
  const isRealtimeRenderActive = useRealtimeRenderStore(state => state.isActive);
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const isCombatDrawerOpen = sideDrawerState === "combat" || sideDrawerState === "initiative" || sideDrawerState === "state";
  const isClueDrawerOpen = sideDrawerState === "clue";
  const isMapDrawerOpen = sideDrawerState === "map";
  const isWebgalDrawerOpen = sideDrawerState === "webgal";

  const tooltipClassName = tooltipPlacement === "bottom"
    ? "tooltip-bottom"
    : tooltipPlacement === "right"
      ? "tooltip-right"
      : "tooltip-top";
  const getRunDrawerButtonClassName = (isActive: boolean) => [
    "tooltip flex h-7 items-center gap-1.5 px-2 text-xs leading-none transition-colors",
    tooltipClassName,
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
  }: {
    icon: ReactNode;
    isActive: boolean;
    label: string;
    onClick: () => void;
    tip?: string;
  }) => (
    <button
      type="button"
      className={getRunDrawerButtonClassName(isActive)}
      data-tip={tip ?? label}
      data-side-drawer-toggle="true"
      aria-pressed={isActive}
      onClick={onClick}
    >
      {icon}
      <span className="whitespace-nowrap font-medium">{label}</span>
    </button>
  );

  return (
    <div className={`flex ${orientation === "column" ? "flex-col divide-y" : "divide-x"} divide-base-300/70 overflow-hidden rounded-md border border-base-300/80 bg-base-200/35 ${className}`}>
      {renderButton({
        icon: <FolderIcon className="size-4 jump_icon" />,
        isActive: isClueDrawerOpen,
        label: "线索",
        onClick: () => setSideDrawerState(getNextRunSideDrawerState(sideDrawerState, "clue")),
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

      {renderButton({
        icon: <WebgalIcon className={`size-4 jump_icon ${isRealtimeRenderActive ? "animate-pulse" : ""}`} />,
        isActive: isWebgalDrawerOpen,
        label: "WebGAL",
        tip: isWebgalDrawerOpen ? "关闭 WebGAL 预览" : "打开 WebGAL 预览",
        onClick: () => setSideDrawerState(getNextRunSideDrawerState(sideDrawerState, "webgal")),
      })}
    </div>
  );
}
