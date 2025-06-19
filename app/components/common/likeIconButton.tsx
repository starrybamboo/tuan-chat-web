/**
 * 喜欢的图标
 */
import type { LikeRecordRequest } from "../../../api";
import { useGlobalContext } from "@/components/globalContextProvider";
import React from "react";
import { toast } from "react-hot-toast";
import { useGetCounterQuery } from "../../../api/hooks/couterQueryHooks";
import { useIsLikedQuery, useLikeMutation, useUnlikeMutation } from "../../../api/hooks/likeQueryHooks";

interface LikeIconButtonProps {
  targetInfo: LikeRecordRequest;
  className?: string;
  icon?: React.ReactNode;
  direction?: "row" | "column";
}
export default function LikeIconButton({ targetInfo, className, icon, direction = "column" }: LikeIconButtonProps) {
  const isLikedQuery = useIsLikedQuery({
    targetId: targetInfo.targetId,
    targetType: targetInfo.targetType,
  });

  const isLiked = isLikedQuery.data?.data;
  const likeCount = useGetCounterQuery({ targetId: targetInfo.targetId, targetType: Number(targetInfo.targetType) }).data?.data ?? -2;

  const likeMutation = useLikeMutation();
  const unlikeMutation = useUnlikeMutation();

  const userId: number | null = useGlobalContext().userId;
  const defaultIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={isLiked ? "currentColor" : "none"}
      />
    </svg>
  );// 没有传入icon时使用默认图标

  const toggleLike = () => {
    if (userId == null) {
      toast.error("请先登录！");
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
      onClick={toggleLike}
      className={`flex flex-col items-center  ${direction === "row" ? "flex-row gap-1" : "flex-col"
      }  ${className}`}
      type="button"
    >
      {/* eslint-disable-next-line style/multiline-ternary */}
      {direction === "row" ? (
      // 横向：不加 relative/absolute，避免错位
        <div className={`w-5 h-5 flex items-center justify-center ${isLiked ? "text-red-500" : ""}`}>
          {icon ?? defaultIcon}
        </div>
      ) : (
      // 竖向：保留原来的效果
        <div className="relative w-10 h-10">
          <div className={`absolute inset-0 ${isLiked ? "text-red-500" : ""}`}>
            {icon ?? defaultIcon}
          </div>
        </div>
      )}

      {/* <div className="relative w-10 h-10"> */}
      {/*  <div className={`absolute inset-0 ${isLiked ? "text-red-500" : ""}`}> */}
      {/*    {icon ?? defaultIcon} */}
      {/*  </div> */}
      {/* </div> */}
      <span className="text-xs mt-1">{isLiked ? likeCount + 1 : likeCount}</span>
    </button>
  );
}
