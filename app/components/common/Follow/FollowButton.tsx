import { useUserFollowMutation, useUserIsFollowedQuery, useUserUnfollowMutation } from "../../../../api/hooks/userFollowQueryHooks";

interface FollowButtonProps {
  userId: number;
  status?: number;
  onStatusChange?: (newStatus: number) => void;
  className?: string;
}

export function FollowButton({ userId, status, onStatusChange, className = "" }: FollowButtonProps) {
  const { mutate: followUser } = useUserFollowMutation();
  const { mutate: unfollowUser } = useUserUnfollowMutation();
  const { data: isFollowedData } = useUserIsFollowedQuery(userId);
  const currentStatus = status ?? (isFollowedData?.data ? 1 : 0);

  const handleClick = () => {
    if (currentStatus === 0) {
      // 未关注状态，执行关注操作
      followUser(userId);
      onStatusChange?.(1);
    }
    else if (currentStatus === 1 || currentStatus === 2) {
      // 已关注或互相关注状态，执行取消关注操作
      unfollowUser(userId);
      onStatusChange?.(0);
    }
  };

  return (
    <button
      type="button"
      className={`btn btn-sm mt-2 w-20 ${currentStatus === 0 ? "btn-info" : "btn-info btn-soft"} ${className}`}
      onClick={handleClick}
    >
      {currentStatus === 0 ? "关注" : currentStatus === 1 ? "已关注" : "互相关注"}
    </button>
  );
}
