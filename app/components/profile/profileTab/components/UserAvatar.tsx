import type { UserInfoResponse } from "../../../../../api";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";

import UserStatusDot from "@/components/common/userStatusBadge.jsx";
import React, { useEffect, useState } from "react";

interface UserAvatarProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  isEditingProfile?: boolean;
  size?: "sm" | "lg";
  onAvatarUpdate: (newAvatarUrl: string) => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  isEditingProfile = false,
  size = "sm",
  onAvatarUpdate,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // 重置图片错误状态当avatar URL改变时
  useEffect(() => {
    if (user?.avatar) {
      setImageError(false);
      setImageLoading(true);
    }
  }, [user?.avatar]);

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // 处理图片加载成功
  const handleImageLoad = () => {
    setImageError(false);
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
          : "mask mask-circle w-full h-full text-4xl"
      }`}
      >
        {initials}
      </div>
    );
  };
  if (isLoading) {
    return (
      <div className={`skeleton ${
        size === "sm"
          ? "w-16 h-16 rounded-full"
          : "md:w-48 md:h-48 lg:w-54 lg:h-54 rounded-full"
      }`}
      >
      </div>
    );
  }

  const isOwner = userId === loginUserId;
  const canEdit = isOwner && (size === "sm" || isEditingProfile);

  const avatarContent = (
    <div className="relative group cursor-pointer">
      {!imageError && user?.avatar
        ? (
            <>
              <img
                src={user.avatar}
                alt={user?.username}
                className={`object-cover transition-all duration-300 ${
                  canEdit ? "group-hover:brightness-75" : ""
                } ${
                  size === "sm"
                    ? "w-16 h-16 rounded-full"
                    : "mask mask-circle w-full h-full"
                } ${imageLoading ? "opacity-0" : "opacity-100"}`}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
              {imageLoading && (
                <div className={`absolute inset-0 skeleton ${
                  size === "sm"
                    ? "w-16 h-16 rounded-full"
                    : "mask mask-circle w-full h-full"
                }`}
                />
              )}
            </>
          )
        : (
            getFallbackAvatar()
          )}
      {canEdit && (
        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-sm ${
          size === "sm" ? "rounded-full" : "mask mask-circle"
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
    <div className={size === "lg" ? "md:w-46 lg:w-54" : "w-16 h-16"}>
      <div className="w-full h-full relative">
        {canEdit
          ? (
              <ImgUploaderWithCopper
                setCopperedDownloadUrl={onAvatarUpdate}
                fileName={`userId-${user?.userId}`}
              >
                {avatarContent}
              </ImgUploaderWithCopper>
            )
          : (
              <div className={isOwner ? "w-full h-full relative" : "pointer-events-none w-full h-full relative"}>
                {!imageError && user?.avatar
                  ? (
                      <>
                        <img
                          src={user.avatar}
                          alt={user?.username}
                          className={`object-cover ${
                            size === "sm"
                              ? "w-16 h-16 rounded-full"
                              : "mask mask-circle w-full h-full"
                          } ${imageLoading ? "opacity-0" : "opacity-100"}`}
                          onError={handleImageError}
                          onLoad={handleImageLoad}
                        />
                        {imageLoading && (
                          <div className={`absolute inset-0 skeleton ${
                            size === "sm"
                              ? "w-16 h-16 rounded-full"
                              : "mask mask-circle w-full h-full"
                          }`}
                          />
                        )}
                      </>
                    )
                  : (
                      getFallbackAvatar()
                    )}
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
