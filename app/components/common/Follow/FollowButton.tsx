import { useUserFollowMutation, useUserUnfollowMutation } from "../../../../api/hooks/userFollowQueryHooks";

interface FollowButtonProps {
  userId: number;
  status?: number;
  onStatusChange?: (newStatus: number) => void;
}

export function FollowButton({ userId, status = 0, onStatusChange }: FollowButtonProps) {
  const { mutate: followUser } = useUserFollowMutation();
  const { mutate: unfollowUser } = useUserUnfollowMutation();

  const handleClick = () => {
    if (status === 0) {
      // 未关注状态，执行关注操作
      followUser(userId, {
        onSuccess: () => {
          onStatusChange?.(1); // 更新为已关注状态
        },
      });
    }
    else if (status === 1 || status === 2) {
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
      {status === 0 ? "关注" : status === 1 ? "已关注" : "互相关注"}
    </button>
  );
}
