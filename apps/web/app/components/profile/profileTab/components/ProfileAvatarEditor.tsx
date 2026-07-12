import React from "react";

import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { Skeleton } from "@/components/common/StatusPrimitives";
import { UserAvatarByUser } from "@/components/common/userAccess";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";

import type { UserInfoResponse } from "../../../../../api";

type ProfileAvatarEditorProps = {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  size?: "sm" | "md" | "lg";
  onAvatarUpdate: (payload: { avatarFileId: number }) => void;
}

function getAvatarSizeClass(size: NonNullable<ProfileAvatarEditorProps["size"]>) {
  if (size === "lg")
    return "w-full aspect-square";
  if (size === "md")
    return "w-20 h-20";
  return "w-16 h-16";
}

function getInnerAvatarSizeClass(size: NonNullable<ProfileAvatarEditorProps["size"]>) {
  if (size === "lg")
    return "w-full h-full rounded-full text-4xl";
  if (size === "md")
    return "w-20 h-20 rounded-full text-2xl";
  return "w-16 h-16 rounded-full text-lg";
}

export const ProfileAvatarEditor: React.FC<ProfileAvatarEditorProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  size = "sm",
  onAvatarUpdate,
}) => {
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
      <div className={`
        ${bgColor}
        flex items-center justify-center text-white font-bold
        ${getInnerAvatarSizeClass(size)}
      `}>
        {initials}
      </div>
    );
  };

  if (isLoading || !user) {
    return (
      <div className={getAvatarSizeClass(size)}>
        <Skeleton className="w-full h-full" rounded="full" />
      </div>
    );
  }

  const isOwner = userId === loginUserId;
  const canEdit = isOwner;

  // 渲染头像图片内容（不包含交互层）
  const renderAvatarImage = () => {
    const hasAvatar = typeof user.avatarFileId === "number" && user.avatarFileId > 0;

    if (hasAvatar) {
      return (
        <div className="relative w-full h-full">
          <UserAvatarByUser
            user={user}
            fallbackUserId={userId}
            width={size === "lg" ? "full" : size === "md" ? 20 : 16}
            isRounded={true}
            stopToastWindow={true}
            clickEnterProfilePage={false}
          />
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
        <div className="
          absolute inset-0 flex items-center justify-center opacity-0
          group-hover:opacity-100
          transition-all duration-300 bg-black/20 backdrop-blur-sm rounded-full
        ">
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
              <div className={isOwner ? "w-full h-full relative" : `
                pointer-events-none w-full h-full relative
              `}>
                {renderAvatarImage()}
              </div>
            )}
        <UserStatusDot
          status={user?.activeStatus}
          size={size}
          editable={true}
          className={`
            absolute border-white
            ${
            size === "sm"
              ? "border-2 bottom-1 right-1"
              : size === "md"
                ? "border-[3px] bottom-2 right-2"
                : "border-4 bottom-4 right-4"
          }
          `}
        />
      </div>
    </div>
  );
};

