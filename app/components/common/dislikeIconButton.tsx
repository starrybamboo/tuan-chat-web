import { DislikeLine } from "@/icons";

interface DislikeIconButtonProps {
  className?: string;
  direction?: "row" | "column";
  onDislike?: () => void;
}

export default function DislikeIconButton({
  className,
  direction = "row",
  onDislike,

}: DislikeIconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center whitespace-nowrap ${
        direction === "row" ? "flex-row gap-1" : "flex-col"
      } ${className}`}
      type="button"
      onClick={onDislike}
    >
      <DislikeLine
        className={`${direction === "row" ? "w-5 h-5" : "w-6 h-6"}`}
      />
      <span
        className={`${direction === "row" ? "text-sm" : "text-xs mt-1"}`}
      >
        不感兴趣
      </span>
    </button>
  );
}
