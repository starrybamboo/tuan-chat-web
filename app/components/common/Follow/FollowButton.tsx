import { useUserFollowMutation, useUserIsFollowedQuery, useUserUnfollowMutation } from "../../../../api/hooks/userFollowQueryHooks";

interface FollowButtonProps {
  userId: number;
  status?: number;
  onStatusChange?: (newStatus: number) => void;
}

export function FollowButton({ userId, status, onStatusChange }: FollowButtonProps) {
  const { mutate: followUser } = useUserFollowMutation();
  const { mutate: unfollowUser } = useUserUnfollowMutation();
  const { data: isFollowedData } = useUserIsFollowedQuery(userId);
  const currentStatus = status ?? (isFollowedData?.data ? 1 : 0);

  const handleClick = () => {
    if (currentStatus === 0) {
      // 未关注状态，执行关注操作
      followUser(userId, {
        onSuccess: () => {
          onStatusChange?.(1); // 更新为已关注状态
        },
      });
    }
    else if (currentStatus === 1 || currentStatus === 2) {
      // 已关注或互相关注状态，执行取消关注操作
      unfollowUser(userId, {
        onSuccess: () => {
          onStatusChange?.(0); // 更新为未关注状态
        },
      });
    }
  };

  return (
    <button
      type="button"
      className="btn btn-primary btn-sm mt-2"
      onClick={handleClick}
    >
      {currentStatus === 0 ? "关注" : currentStatus === 1 ? "已关注" : "互相关注"}
    </button>
  );
}
