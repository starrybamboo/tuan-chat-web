/**
 * 喜欢的图标
 */
import type { LikeRecordRequest } from "../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import React from "react";
import { toast } from "react-hot-toast";
import {
  useGetLikeCountQuery,
  useIsLikedQuery,
  useLikeMutation,
  useUnlikeMutation,
} from "../../../api/hooks/likeQueryHooks";

interface LikeIconButtonProps {
  targetInfo: LikeRecordRequest;
  className?: string;
  icon?: React.ReactNode;
  direction?: "row" | "column";
  /** 外部可选传入点赞数，避免重复请求 */
  likeCount?: number;
}

export default function LikeIconButton({
  targetInfo,
  className,
  icon,
  direction = "column",
  likeCount,
}: LikeIconButtonProps) {
  const isLikedQuery = useIsLikedQuery({
    targetId: targetInfo.targetId,
    targetType: targetInfo.targetType,
  });

  const likeCountQuery = useGetLikeCountQuery({
    targetId: targetInfo.targetId,
    targetType: targetInfo.targetType,
  });

  const isLiked = isLikedQuery.data?.data;

  // 优先用外部传入的 likeCount
  const finalLikeCount
    = likeCount !== undefined ? likeCount : likeCountQuery.data?.data ?? 0;

  const likeMutation = useLikeMutation();
  const unlikeMutation = useUnlikeMutation();

  const userId: number | null = useGlobalContext().userId;

  const defaultIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={isLiked ? "currentColor" : "none"}
      />
    </svg>
  );

  const toggleLike = () => {
    if (userId == null) {
      toast.error("请先登录！");
      return;
    }

    if (isLiked) {
      unlikeMutation.mutate(targetInfo);
    }
    else {
      likeMutation.mutate(targetInfo);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleLike();
      }}
      className={`flex items-center justify-center ${
        direction === "row" ? "flex-row gap-1" : "flex-col"
      } ${className}`}
      type="button"
      disabled={likeMutation.isPending || unlikeMutation.isPending}
    >
      {direction === "row"
        ? (
            <div className="w-6 h-6 flex items-center justify-center text-red-500">
              {icon ?? defaultIcon}
            </div>
          )
        : (
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 text-red-500 flex items-center justify-center">
                {icon ?? defaultIcon}
              </div>
            </div>
          )}

      <span className="text-xs mt-1">
        {likeCountQuery.isLoading && likeCount === undefined
          ? "..."
          : finalLikeCount}
      </span>
    </button>
  );
}
