import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { IconButton } from "@/components/common/IconButton";

type ChatSearchTriggerProps = {
  className?: string;
  onClick: () => void;
};

export default function ChatSearchTrigger({ className = "", onClick }: ChatSearchTriggerProps) {
  return (
    <IconButton
      label="搜索聊天记录"
      tooltip="搜索聊天记录"
      tooltipPlacement="bottom"
      size="xs"
      shape="square"
      className={`size-8 min-h-8 text-base-content/70 hover:bg-base-300/60 hover:text-info ${className}`}
      icon={<MagnifyingGlassIcon className="size-5" aria-hidden="true" />}
      onClick={onClick}
    />
  );
}
