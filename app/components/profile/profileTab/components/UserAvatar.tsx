import type { UserInfoResponse } from "../../../../../api";
import React, { useState } from "react";

import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";

interface UserAvatarProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  size?: "sm" | "lg";
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  size = "sm",
  onAvatarUpdate,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // 获取备用头像内容
  const getFallbackAvatar = () => {
    const initials = user?.username?.slice(0, 2).toUpperCase() || "?";
    const bgColors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    const colorIndex = user?.userId ? user.userId % bgColors.length : 0;
    const bgColor = bgColors[colorIndex];

    return (
      <div className={`${bgColor} flex items-center justify-center text-white font-bold ${
        size === "sm"
          ? "w-16 h-16 rounded-full text-lg"
          : "w-full h-full rounded-full text-4xl"
      }`}
      >
        {initials}
      </div>
    );
  };

  if (isLoading || !user) {
    return (
      <div className={size === "lg" ? "w-full aspect-square" : "w-16 h-16"}>
        <div className="skeleton w-full h-full rounded-full" />
      </div>
    );
  }

  const isOwner = userId === loginUserId;
  const canEdit = isOwner;

  // 渲染头像图片内容（不包含交互层）
  const renderAvatarImage = () => {
    // 修改：优化渲染逻辑
    const hasAvatar = user.avatar && !imageError;

    if (hasAvatar) {
      return (
        <div className="relative w-full h-full">
          <img
            src={user.avatar}
            alt={user?.username}
            className={`object-cover transition-all duration-300 ${
              canEdit ? "group-hover:brightness-75" : ""
            } ${
              size === "sm"
                ? "w-16 h-16 rounded-full"
                : "w-full h-full rounded-full"
            }`}
            onError={handleImageError}
          />
          {imageLoading && (
            <div className={`absolute inset-0 skeleton ${
              size === "sm"
                ? "w-16 h-16 rounded-full"
                : "w-full h-full rounded-full"
            }`}
            />
          )}
        </div>
      );
    }
    return getFallbackAvatar();
  };

  // 渲染可编辑的头像内容
  const avatarContent = (
    <div className="relative group w-full h-full">
      {renderAvatarImage()}
      {canEdit && (
        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-sm ${
          size === "sm" ? "rounded-full" : "rounded-full"
        }`}
        >
          <span className="text-white font-medium text-xs px-2 py-1">
            {size === "sm" ? "更换" : "更换头像"}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className={size === "lg" ? "w-full aspect-square" : "w-16 h-16"}>
      <div className="w-full h-full relative">
        {canEdit
          ? (
              <ImgUploaderWithCopper
                setCopperedDownloadUrl={onAvatarUpdate}
                fileName={`userId-${user?.userId}`}
              >
                <div className={`w-full h-full cursor-pointer ${
                  size === "lg" ? "" : "w-16 h-16"
                }`}
                >
                  {avatarContent}
                </div>
              </ImgUploaderWithCopper>
            )
          : (
              <div className={isOwner ? "w-full h-full relative" : "pointer-events-none w-full h-full relative"}>
                {renderAvatarImage()}
              </div>
            )}
        <UserStatusDot
          status={user?.activeStatus}
          size={size}
          editable={true}
          className={`absolute border-white ${
            size === "sm"
              ? "border-2 bottom-1 right-1"
              : "border-4 bottom-4 right-4"
          }`}
        />
      </div>
    </div>
  );
};
