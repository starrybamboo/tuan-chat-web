import type { CommentTimelineVO, CommentVO } from "api";

function formatCommentDateTime(value?: string) {
  if (!value) {
    return "时间未知";
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withTimezone = /(?:[+-]\d{2}:?\d{2}|Z)$/i.test(normalized)
    ? normalized
    : `${normalized}+08:00`;
  const date = new Date(withTimezone);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

/**
 * 预览评论，当评论被折叠的时候会显示这个组件
 * @param commentVO
 * @constructor
 */
export default function CommentPreview({ commentVO }: { commentVO: CommentVO | CommentTimelineVO }) {
  const user = commentVO.userInfo;
  return (
    <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
      <h3 className="max-w-full truncate text-sm font-medium text-base-content">
        {user?.username || "YOU_KNOW_WHO"}
      </h3>
      <span className="text-xs text-base-content/50">
        {formatCommentDateTime(commentVO?.createTime)}
      </span>
    </div>
  );
}
