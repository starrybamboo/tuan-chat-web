import type { CommentVO } from "api";
import React from "react";
import { useGetUserInfoQuery } from "../../../../api/hooks/UserHooks";

/**
 * 预览评论，当评论被折叠的时候会显示这个组件
 * @param commentVO
 * @constructor
 */
export default function CommentPreview({ commentVO }: { commentVO: CommentVO }) {
  const getUserInfoQuery = useGetUserInfoQuery(commentVO.userId ?? -1);
  const user = getUserInfoQuery.data?.data;
  return (
    <div className="flex gap-2 items-center">
      <h3 className="font-semibold text-base-content">
        {user?.username || "YOU_KNOW_WHO"}
      </h3>
      <span className="text-xs text-base-content/70">
        {new Date(commentVO?.createTime || "").toLocaleString()}
      </span>
    </div>
  );
}
