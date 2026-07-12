import { Button, type ButtonSize } from "@/components/common/Button";

import { useUserFollowMutation, useUserIsFollowedQuery, useUserUnfollowMutation } from "../../../../api/hooks/userFollowQueryHooks";

type FollowButtonProps = {
  userId: number;
  status?: number;
  onStatusChange?: (newStatus: number) => void;
  className?: string;
  size?: ButtonSize;
  width?: string;
}

export function FollowButton({ userId, status, onStatusChange, className = "", size = "sm", width = "w-20" }: FollowButtonProps) {
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
    <Button
      variant="outline"
      size={size}
      className={`
        ${width}
        border-info/45 text-info hover:border-info/70 hover:bg-info/10
        ${className}
      `}
      onClick={handleClick}
      aria-pressed={currentStatus !== 0}
      aria-label={currentStatus === 0 ? "关注用户" : currentStatus === 1 ? "取消关注用户" : "取消互相关注用户"}
    >
      {currentStatus === 0 ? "关注" : currentStatus === 1 ? "已关注" : "互相关注"}
    </Button>
  );
}
