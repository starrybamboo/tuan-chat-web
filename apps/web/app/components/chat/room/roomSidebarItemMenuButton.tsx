import type { MouseEvent } from "react";

import { DotsThreeVerticalIcon } from "@phosphor-icons/react";

type RoomSidebarItemMenuButtonProps = {
  ariaLabel: string;
  floating?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function RoomSidebarItemMenuButton({
  ariaLabel,
  floating = true,
  onClick,
}: RoomSidebarItemMenuButtonProps) {
  const positionClassName = floating
    ? "absolute right-1 top-1/2 -translate-y-1/2"
    : "";

  return (
    <button
      type="button"
      className={`
        pointer-events-none hidden size-7 items-center justify-center rounded-md
        border border-base-300/70 bg-base-100/92 text-base-content/55 opacity-0
        shadow-sm transition duration-150
        hover:border-info/40 hover:text-base-content
        md:flex
        md:group-hover:pointer-events-auto md:group-hover:opacity-100
        md:group-focus-within:pointer-events-auto
        md:group-focus-within:opacity-100
        ${positionClassName}
      `}
      aria-label={ariaLabel}
      title={ariaLabel}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick(event);
      }}
    >
      <DotsThreeVerticalIcon className="size-4" weight="regular" />
    </button>
  );
}
