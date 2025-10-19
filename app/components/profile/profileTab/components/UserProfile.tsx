import type { UserInfoResponse } from "../../../../../api";
import React, { useState } from "react";

interface ProfileEditingState {
  isEditingProfile: boolean;
  editingUsername: string;
  editingDescription: string;
  setEditingUsername: (value: string) => void;
  setEditingDescription: (value: string) => void;
  saveProfile: () => void;
  cancelEditingProfile: () => void;
  isSaving: boolean;
}

interface UserProfileProps {
  user: UserInfoResponse | undefined;
  userId: number;
  loginUserId: number;
  isLoading: boolean;
  profileEditing: ProfileEditingState;
  variant?: "mobile" | "desktop";
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  userId,
  loginUserId,
  isLoading,
  profileEditing,
  variant = "desktop",
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
        <div className="skeleton h-6 w-32"></div>
        <div className="skeleton h-6 w-full"></div>
      </div>
    );
  }

  return (
    <div className={isMobile ? "w-52" : "w-full"}>
      {/* 用户名 */}
      <div className={isMobile ? "" : "self-start w-full mt-4"}>
        {isOwner && isEditingProfile && !isMobile
          ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingUsername}
                  onChange={e => setEditingUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      saveProfile();
                    if (e.key === "Escape")
                      cancelEditingProfile();
                  }}
                  className={`input input-sm input-bordered flex-1 ${
                    isMobile ? "text-lg" : "text-lg"
                  } font-bold ${
                    editingUsername.length > 30 ? "input-error" : ""
                  }`}
                  maxLength={30}
                  autoFocus={!isMobile}
                  placeholder="请输入用户名"
                />
              </div>
            )
          : (
              <h2 className={`font-bold truncate ${isMobile ? "text-lg" : "text-2xl"}`}>
                {user?.username
                  ? (
                      <>
                        {user.username}
                        {" "}
                        <span className={`text-sm text-gray-400 ${isMobile ? "inline" : "block"}`}>
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
      {/* 描述 */}
      <div className={isMobile ? "mt-2" : "w-full mt-4"}>
        {isOwner && isEditingProfile && !isMobile
          ? (
              <div className="space-y-2">
                <textarea
                  value={editingDescription}
                  onChange={e => setEditingDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape")
                      cancelEditingProfile();
                    if (e.key === "Enter" && e.ctrlKey)
                      saveProfile();
                  }}
                  className={`textarea textarea-bordered w-full text-sm resize-none ${
                    editingDescription.length > 253 ? "textarea-error" : ""
                  }`}
                  rows={4}
                  placeholder="请输入个人描述..."
                />
                {!isMobile && (
                  <div className="flex justify-between items-center">
                    <div className={`text-xs ${
                      editingDescription.length > 253 ? "text-error" : "text-neutral-500"
                    }`}
                    >
                      {editingDescription.length}
                      /253
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveProfile}
                        className="btn btn-sm btn-success"
                        disabled={
                          !editingUsername.trim()
                          || editingUsername.length > 30
                          || editingDescription.length > 253
                          || isSaving
                        }
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingProfile}
                        className="btn btn-sm btn-ghost"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          : (
              <div>
                <div
                  className={`break-words transition-all duration-300 ease-in-out ${
                    isMobile
                      ? `text-base ${isExpanded ? "" : "line-clamp-2"}`
                      : `text-base overflow-hidden ${isExpanded ? "max-h-96" : "max-h-12"}`
                  }`}
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
                    className={`text-blue-400 text-xs hover:underline transition-colors duration-200 ${
                      isMobile ? "mt-1" : "cursor-pointer mt-2 flex items-center gap-1"
                    }`}
                    type="button"
                  >
                    <span>{isExpanded ? "收起" : "展开"}</span>
                    {!isMobile && (
                      <svg
                        className={`w-3 h-3 transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
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
    </div>
  );
};
