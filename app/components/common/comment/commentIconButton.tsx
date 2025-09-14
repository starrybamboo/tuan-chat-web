import { CommentOutline } from "@/icons";

interface CommentIconButtonProps {
  feedId: number;
  className?: string;
  direction?: "row" | "column";
  /** 外部可选传入评论数，避免重复请求 */
  commentCount?: number;
}

interface CommentIconButtonProps {
  feedId: number;
  className?: string;
  direction?: "row" | "column";
  commentCount?: number;
  showComments?: boolean;
  onToggle?: () => void;
}

export default function CommentIconButton({
  className,
  direction = "row",
  commentCount,
  onToggle,
}: CommentIconButtonProps) {
  return (
    <button
      type="button"
      className={`w-12 h-8 flex items-center justify-center join-item btn btn-sm btn-ghost ${
        direction === "row" ? "flex-row gap-1" : "flex-col"
      } ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
    >
      {/* 评论图标 */}
      {direction === "row"
        ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <CommentOutline className="w-5 h-5" />
            </div>
          )
        : (
            <div className="relative w-10 h-10">
              <div className="absolute inset-0">
                <CommentOutline className="w-6 h-6" />
              </div>
            </div>
          )}

      {/* 评论数量 */}
      <span className="text-xs whitespace-nowrap">
        {commentCount ?? 0}
      </span>
    </button>
  );
}
