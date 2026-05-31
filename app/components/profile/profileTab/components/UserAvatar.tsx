import type { UserInfoResponse } from "../../../../../api";
import React, { useState } from "react";

import { MediaImage } from "@/components/common/mediaImage";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";
import { imageLowUrl } from "@/utils/mediaUrl";

interface UserAvatarProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  size?: "sm" | "md" | "lg";
  onAvatarUpdate: (payload: { avatarFileId: number }) => void;
}

function getAvatarSizeClass(size: NonNullable<UserAvatarProps["size"]>) {
  if (size === "lg")
    return "w-full aspect-square";
  if (size === "md")
    return "w-20 h-20";
  return "w-16 h-16";
}

function getInnerAvatarSizeClass(size: NonNullable<UserAvatarProps["size"]>) {
  if (size === "lg")
    return "w-full h-full rounded-full text-4xl";
  if (size === "md")
    return "w-20 h-20 rounded-full text-2xl";
  return "w-16 h-16 rounded-full text-lg";
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
      <div className={`${bgColor} flex items-center justify-center text-white font-bold ${getInnerAvatarSizeClass(size)}`}>
        {initials}
      </div>
    );
  };

  if (isLoading || !user) {
    return (
      <div className={getAvatarSizeClass(size)}>
        <div className="skeleton w-full h-full rounded-full" />
      </div>
    );
  }

  const isOwner = userId === loginUserId;
  const canEdit = isOwner;

  // 渲染头像图片内容（不包含交互层）
  const renderAvatarImage = () => {
    // 修改：优化渲染逻辑
    const avatarSrc = imageLowUrl(user.avatarFileId);
    const hasAvatar = avatarSrc && !imageError;

    if (hasAvatar) {
      return (
        <div className="relative w-full h-full">
          <MediaImage
            src={avatarSrc}
            alt={user?.username}
            className={`object-cover transition-all duration-300 ${
              canEdit ? "group-hover:brightness-75" : ""
            } ${getInnerAvatarSizeClass(size)}`}
            onError={handleImageError}
          />
          {imageLoading && (
            <div className={`absolute inset-0 skeleton ${getInnerAvatarSizeClass(size)}`} />
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
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-sm rounded-full">
          <span className="text-white font-medium text-xs px-2 py-1">
            {size === "sm" ? "更换" : "更换头像"}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className={getAvatarSizeClass(size)}>
      <div className="w-full h-full relative">
        {canEdit
          ? (
              <ImgUploaderWithCopper
                mutate={(payload) => {
                  if (payload?.avatarFileId) {
                    onAvatarUpdate({ avatarFileId: payload.avatarFileId });
                  }
                }}
                fileName={`userId-${user?.userId}`}
                aspect={1}
              >
                <div className="w-full h-full cursor-pointer">
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
              : size === "md"
                ? "border-[3px] bottom-2 right-2"
                : "border-4 bottom-4 right-4"
          }`}
        />
      </div>
    </div>
  );
};
