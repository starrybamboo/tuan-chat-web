import type { UserProfileInfoResponse } from "@tuanchat/openapi-client/models/UserProfileInfoResponse";

import React, { useState } from "react";

import { Button } from "@/components/common/Button";
import { TextArea, TextInput } from "@/components/common/FormField";
import { Divider, Skeleton } from "@/components/common/StatusPrimitives";

type ProfileEditingState = {
  isEditingProfile: boolean;
  editingUsername: string;
  editingDescription: string;
  setEditingUsername: (value: string) => void;
  setEditingDescription: (value: string) => void;
  saveProfile: () => void;
  cancelEditingProfile: () => void;
  isSaving: boolean;
}

type UserProfileProps = {
  user: UserProfileInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  profileEditing: ProfileEditingState;
  variant?: "mobile" | "desktop";
  avatar?: React.ReactNode;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  profileEditing,
  variant = "desktop",
  avatar,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOwner = userId === loginUserId;
  const isMobile = variant === "mobile";

  const {
    isEditingProfile,
    editingUsername,
    editingDescription,
    setEditingUsername,
    setEditingDescription,
    saveProfile,
    cancelEditingProfile,
    isSaving,
  } = profileEditing;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  return (
    <div className={isMobile ? "w-52" : "w-full"}>
      {/* 用户名 */}
      {avatar && !isMobile
        ? (
            <div className="flex items-end gap-4">
              <div className="shrink-0">
                {avatar}
              </div>
              <div className="min-w-0 flex-1">
                {isOwner && isEditingProfile
                  ? (
                      <div className="flex items-center gap-2">
                        <TextInput
                          density="compact"
                          type="text"
                          autoComplete="off"
                          aria-label="用户名"
                          value={editingUsername}
                          onChange={e => setEditingUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing)
                              return;
                            if (e.key === "Enter")
                              saveProfile();
                            if (e.key === "Escape")
                              cancelEditingProfile();
                          }}
                          aria-invalid={editingUsername.length > 30 || undefined}
                          className="flex-1 text-lg font-bold"
                          maxLength={30}
                          placeholder="请输入用户名"
                        />
                      </div>
                    )
                  : (
                      <h2 className="font-bold truncate text-2xl" title={user?.username ?? "未知用户"}>
                        {user?.username
                          ? (
                              <>
                                {user.username}
                                {" "}
                                <span className="text-sm text-base-content/50 block">
                                  UID:
                                  {" "}
                                  {userId}
                                </span>
                              </>
                            )
                          : (
                              "未知用户"
                            )}
                      </h2>
                    )}
              </div>
            </div>
          )
        : (
            <div className={isMobile ? "" : "self-start w-full mt-4"}>
              {isOwner && isEditingProfile && !isMobile
                ? (
                    <div className="flex items-center gap-2">
                      <TextInput
                        density="compact"
                        type="text"
                        autoComplete="off"
                        aria-label="用户名"
                        value={editingUsername}
                        onChange={e => setEditingUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing)
                            return;
                          if (e.key === "Enter")
                            saveProfile();
                          if (e.key === "Escape")
                            cancelEditingProfile();
                        }}
                        aria-invalid={editingUsername.length > 30 || undefined}
                        className="flex-1 text-lg font-bold"
                        maxLength={30}

                        placeholder="请输入用户名"
                      />
                    </div>
                  )
                : (
                    <h2
                      className={`
                      font-bold truncate
                      ${isMobile ? "text-lg" : `text-2xl`}
                    `}
                      title={user?.username ?? "未知用户"}
                    >
                      {user?.username
                        ? (
                            <>
                              {user.username}
                              {" "}
                              <span className={`
                                text-sm text-base-content/50
                                ${isMobile ? `inline` : `block`}
                              `}>
                                UID:
                                {" "}
                                {userId}
                              </span>
                            </>
                          )
                        : (
                            "未知用户"
                          )}
                    </h2>
                  )}
            </div>
          )}
      {/* 描述 */}
      <Divider />
      <div className={isMobile ? "mt-2" : "w-full min-h-24"}>
        {isOwner && isEditingProfile && !isMobile
          ? (
              <div className="space-y-2">
                <TextArea
                  autoComplete="off"
                  aria-label="个人描述"
                  value={editingDescription}
                  onChange={e => setEditingDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing)
                      return;
                    if (e.key === "Escape")
                      cancelEditingProfile();
                    if (e.key === "Enter" && e.ctrlKey)
                      saveProfile();
                  }}
                  aria-invalid={editingDescription.length > 253 || undefined}
                  className="resize-none text-sm"
                  rows={4}
                  placeholder="请输入个人描述..."
                />
                {!isMobile && (
                  <div className="flex justify-between items-center">
                    <div className={`
                      text-xs
                      ${
                      editingDescription.length > 253 ? "text-error" : `
                        text-neutral-500
                      `
                    }
                    `}
                    >
                      {editingDescription.length}
                      /253
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={saveProfile}
                        loading={isSaving}
                        title={
                          isSaving
                            ? "正在保存个人资料"
                            : !editingUsername.trim()
                              ? "请输入用户名"
                              : editingUsername.length > 30
                                ? "用户名最多 30 个字符"
                                : editingDescription.length > 253
                                  ? "个人描述最多 253 个字符"
                                  : "保存个人资料"
                        }
                        disabled={
                          !editingUsername.trim()
                          || editingUsername.length > 30
                          || editingDescription.length > 253
                          || isSaving
                        }
                      >
                        {isSaving ? "保存中..." : "保存"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditingProfile}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          : (
              <div>
                <div
                  className={`
                    wrap-break-word transition-all duration-300 ease-in-out
                    motion-reduce:transition-none
                    ${
                    isMobile
                      ? `
                        text-sm
                        ${isExpanded ? "" : "line-clamp-2"}
                      `
                      : `
                        text-sm overflow-hidden
                        ${isExpanded ? "max-h-96" : `max-h-12`}
                      `
                  }
                  `}
                  style={
                    isMobile
                      ? {}
                      : {
                          display: "-webkit-box",
                          WebkitLineClamp: isExpanded ? "unset" : 2,
                          WebkitBoxOrient: "vertical",
                        }
                  }
                >
                  <p className={isMobile ? "" : "leading-6"}>
                    {user?.description || "这个人就是个杂鱼，什么也不愿意写喵~"}
                  </p>
                </div>
                {user?.description && user.description.length > 80 && (
                  <button
                    onClick={() => setIsExpanded(prev => !prev)}
                    className={`
                      text-info text-xs
                      hover:underline
                      transition-colors duration-200
                      ${
                      isMobile ? "mt-1" : `
                        cursor-pointer mt-2 flex items-center gap-1
                      `
                    }
                    `}
                    type="button"
                  >
                    <span>{isExpanded ? "收起" : "展开"}</span>
                    {!isMobile && (
                      <svg
                        className={`
                          w-3 h-3 transition-transform duration-300
                          motion-reduce:transition-none
                          ${
                          isExpanded ? "rotate-180" : ""
                        }
                        `}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            )}
      </div>
      <Divider />
    </div>
  );
};
