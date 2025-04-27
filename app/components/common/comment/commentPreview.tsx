import type { CommentVO } from "api";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function CommentPreview({ commentVO }: { commentVO: CommentVO }) {
  const getUserInfoQuery = useGetUserInfoQuery(commentVO.userId ?? -1);
  const user = getUserInfoQuery.data?.data;
  return (
    <div className="flex gap-2 items-center">
      <span className="font-medium">{user?.username ?? "未知用户"}</span>
      <span className="text-xs opacity-70">
        {new Date(commentVO.createTime || "").toLocaleString()}
      </span>
    </div>
  );
}
