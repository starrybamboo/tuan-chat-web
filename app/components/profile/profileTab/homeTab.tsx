import type { UserInfoResponse } from "../../../../api";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

import { FollowButton } from "@/components/common/Follow/FollowButton";
import { UserFollower } from "@/components/common/Follow/UserFollower";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import UserStatusDot from "@/components/common/userStatusBadge.jsx";
import TagManagement from "@/components/common/userTags";
import { useGlobalContext } from "@/components/globalContextProvider";
import GNSSpiderChart from "@/components/profile/cards/GNSSpiderChart";
import React, { useState } from "react";

import { Link } from "react-router";
import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery, useUpdateUserInfoMutation } from "../../../../api/queryHooks";

interface HomeTabProps {
  userId: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userId }) => {
  const userQuery = useGetUserInfoQuery(userId);
  const [isExpanded, setIsExpanded] = useState(false);
  const loginUserId = useGlobalContext().userId ?? -1;
  const user = userQuery.data?.data;
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const [relationTab, setRelationTab] = useState<"following" | "followers">("following");

  // 内联编辑状态
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingReadMe, setIsEditingReadMe] = useState(false);
  const [editingUsername, setEditingUsername] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingReadMe, setEditingReadMe] = useState("");

  // API mutations
  const updateUserInfoMutation = useUpdateUserInfoMutation();

  const followingsQuery = useGetUserFollowingsQuery(userId, {
    pageNo: 1,
    pageSize: 16,
  });

  const followersQuery = useGetUserFollowersQuery(userId, {
    pageNo: 1,
    pageSize: 16,
  });

  const followStats = {
    following: followingsQuery.data?.data?.totalRecords || 0,
    followers: followersQuery.data?.data?.totalRecords || 0,
  };

  // 在点击处理器中
  const handleFollowingClick = () => {
    setRelationTab("following"); // 使用 setState 来更新值
    setIsFFWindowOpen(true);
  };

  const handleFollowersClick = () => {
    setRelationTab("followers"); // 使用 setState 来更新值
    setIsFFWindowOpen(true);
  };

  // 内联编辑功能
  const startEditingProfile = () => {
    setEditingUsername(user?.username || "");
    setEditingDescription(user?.description || "");
    setIsEditingProfile(true);
  };

  const startEditingReadMe = () => {
    setEditingReadMe(user?.readMe || "");
    setIsEditingReadMe(true);
  };

  const saveProfile = async () => {
    if (editingUsername.trim() && editingUsername.length <= 30 && editingDescription.length <= 253) {
      try {
        await updateUserInfoMutation.mutateAsync({
          ...user,
          username: editingUsername.trim(),
          description: editingDescription.trim(),
        } as UserInfoResponse);
        setIsEditingProfile(false);
      }
      catch (error) {
        console.error("保存个人资料失败:", error);
      }
    }
  };

  const saveReadMe = async () => {
    try {
      await updateUserInfoMutation.mutateAsync({
        ...user,
        readMe: editingReadMe,
      } as UserInfoResponse);
      setIsEditingReadMe(false);
    }
    catch (error) {
      console.error("保存ReadMe失败:", error);
    }
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditingUsername("");
    setEditingDescription("");
  };

  const cancelEditingReadMe = () => {
    setIsEditingReadMe(false);
    setEditingReadMe("");
  };

  // 头像上传即时保存
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    updateUserInfoMutation.mutate({
      ...user,
      avatar: newAvatarUrl,
    } as UserInfoResponse);
  };

  // 用于测试的，写死的数据
  // const userProfile = {
  //   lastLoginTime: "1999-13-32 25:100",
  //   rating: 0,
  //   sessions: 0,
  //   kpSessions: 0,
  // };

  return (
    <div className="max-w-7xl mx-auto p-2 transition-all duration-300 md:flex">
      {/* 在 md 及以上屏幕显示侧边栏布局，在 md 以下显示顶部栏布局 */}
      <div className="w-full flex flex-col md:max-w-1/4 py-4 md:py-8">
        {/* 小屏幕布局 - 顶部栏样式 */}
        <div className="md:hidden flex flex-row items-center justify-between p-4 bg-base-200 rounded-2xl">
          {/* 头像和用户名 */}
          <div className="flex gap-4">
            <div className="w-16 h-16">
              {userQuery?.isLoading
                ? (
                    <div className="skeleton w-16 h-16 rounded-full"></div>
                  )
                : (
                    <div className="relative">
                      {userId === loginUserId
                        ? (
                            <ImgUploaderWithCopper
                              setCopperedDownloadUrl={handleAvatarUpdate}
                              fileName={`userId-${user?.userId}`}
                            >
                              <div className="relative group cursor-pointer">
                                <img
                                  src={user?.avatar || undefined}
                                  alt={user?.username}
                                  className="w-16 h-16 rounded-full object-cover transition-all duration-300 group-hover:brightness-75"
                                />
                                <div
                                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-sm rounded-full"
                                >
                                  <span className="text-white font-medium text-xs">
                                    更换
                                  </span>
                                </div>
                              </div>
                            </ImgUploaderWithCopper>
                          )
                        : (
                            <img
                              src={user?.avatar || undefined}
                              alt={user?.username}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          )}
                      <UserStatusDot
                        status={user?.activeStatus}
                        size="sm"
                        editable={true}
                        className="absolute border-2 border-white bottom-1 right-1"
                      />
                    </div>
                  )}
            </div>
            <div>
              {userQuery.isLoading
                ? (
                    <div className="skeleton h-6 w-32"></div>
                  )
                : (
                    <>
                      <h2 className="text-lg font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                        {user?.username || "未知用户"}
                      </h2>
                      <div className="w-52">
                        <p className={`text-base break-words ${isExpanded ? "" : "line-clamp-2"}`}>
                          {user?.description || "这个人就是个杂鱼，什么也不愿意写喵~"}
                        </p>
                        {user?.description && user.description.length > 80 && (
                          <button
                            onClick={() => setIsExpanded(prev => !prev)}
                            className="text-blue-400 text-xs mt-1 hover:underline"
                            type="button"
                          >
                            {isExpanded ? "收起" : "展开"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
            </div>
          </div>
          {/* 小屏幕操作按钮 */}
          {!userQuery.isLoading && (
            <div className="flex gap-2">
              {user?.userId === loginUserId
                ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={startEditingProfile}
                      aria-label="编辑个人资料"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  )
                : (
                    <div className="flex-col">
                      <FollowButton userId={user?.userId || -1} />
                      <Link
                        to={`/chat/private/${userId}`}
                        className="flex btn btn-sm btn-ghost mt-4 bg-base-100 border-gray-300"
                      >
                        <svg
                          width="14"
                          height="14"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <g
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeWidth="2"
                            fill="none"
                            stroke="currentColor"
                          >
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                          </g>
                        </svg>
                      </Link>
                    </div>
                  )}
            </div>
          )}
        </div>

        {/* 小屏幕编辑面板 */}
        {userId === loginUserId && isEditingProfile && (
          <div className="md:hidden p-4 bg-base-100 rounded-2xl mt-2 space-y-4">
            <h3 className="text-lg font-semibold">编辑个人资料</h3>

            {/* 用户名编辑 */}
            <div>
              <label className="label">
                <span className="label-text">用户名</span>
              </label>
              <input
                type="text"
                value={editingUsername}
                onChange={e => setEditingUsername(e.target.value)}
                className={`input input-bordered w-full ${
                  editingUsername.length > 30 ? "input-error" : ""
                }`}
                maxLength={30}
                placeholder="请输入用户名"
              />
              <div className={`text-xs mt-1 ${
                editingUsername.length > 30 ? "text-error" : "text-neutral-500"
              }`}
              >
                {editingUsername.length}
                /30
              </div>
            </div>

            {/* 描述编辑 */}
            <div>
              <label className="label">
                <span className="label-text">个人描述</span>
              </label>
              <textarea
                value={editingDescription}
                onChange={e => setEditingDescription(e.target.value)}
                className={`textarea textarea-bordered w-full ${
                  editingDescription.length > 253 ? "textarea-error" : ""
                }`}
                rows={4}
                maxLength={253}
                placeholder="请输入个人描述..."
              />
              <div className={`text-xs mt-1 ${
                editingDescription.length > 253 ? "text-error" : "text-neutral-500"
              }`}
              >
                {editingDescription.length}
                /253
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveProfile}
                className="btn btn-success flex-1"
                disabled={
                  !editingUsername.trim()
                  || editingUsername.length > 30
                  || editingDescription.length > 253
                  || updateUserInfoMutation.isPending
                }
              >
                {updateUserInfoMutation.isPending
                  ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    )
                  : (
                      "保存"
                    )}
              </button>
              <button
                onClick={cancelEditingProfile}
                className="btn btn-ghost flex-1"
              >
                取消
              </button>
            </div>
          </div>
        )}
        <div className="md:hidden flex justify-center gap-8 py-3 rounded-2xl mt-2">
          <div
            className="btn-active flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer"
            onClick={handleFollowingClick}
          >
            <div className="stat-value text-sm">{followStats.following}</div>
            <div className="stat-title text-sm">关注</div>
          </div>
          <span className="border-l"></span>
          <div
            className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer"
            onClick={handleFollowersClick}
          >
            <div className="stat-value text-sm">{followStats.followers}</div>
            <div className="stat-title text-sm">粉丝</div>
          </div>
        </div>

        {/* 大屏幕布局 - 侧边栏样式 */}
        <div className="hidden md:flex flex-col items-center rounded-2xl p-2">
          {/* 头像 */}
          <div className="md:w-46 lg:w-54">
            {userQuery?.isLoading
              ? (
                  <div className="skeleton md:w-48 md:h-48 lg:w-54 lg:h-54 rounded-full"></div>
                )
              : (
                  <div className="w-full h-full relative">
                    {userId === loginUserId && isEditingProfile
                      ? (
                          <ImgUploaderWithCopper
                            setCopperedDownloadUrl={handleAvatarUpdate}
                            fileName={`userId-${user?.userId}`}
                          >
                            <div className="relative group cursor-pointer">
                              <img
                                src={user?.avatar || undefined}
                                alt={user?.username}
                                className="mask mask-circle w-full h-full object-cover transition-all duration-300 group-hover:brightness-75"
                              />
                              <div
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-sm rounded-full"
                              >
                                <span className="text-white font-medium px-2 py-1 rounded-full text-sm">
                                  更换头像
                                </span>
                              </div>
                            </div>
                          </ImgUploaderWithCopper>
                        )
                      : (
                          <div
                            className={userId === loginUserId ? "w-full h-full relative" : "pointer-events-none w-full h-full relative"}
                          >
                            <img
                              src={user?.avatar || undefined}
                              alt={user?.username}
                              className="mask mask-circle w-full h-full object-cover"
                            />
                          </div>
                        )}
                    <UserStatusDot
                      status={user?.activeStatus}
                      size="lg"
                      editable={true}
                      className="absolute border-4 border-white bottom-4 right-4 "
                    />
                  </div>
                )}
          </div>

          {/* 用户名 */}
          <div className="self-start w-full mt-4">
            {userQuery.isLoading
              ? (
                  <div className="skeleton h-8 w-48"></div>
                )
              : (
                  <div>
                    {userId === loginUserId && isEditingProfile
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
                              className={`input input-sm input-bordered flex-1 text-lg font-bold ${
                                editingUsername.length > 30 ? "input-error" : ""
                              }`}
                              maxLength={30}
                              autoFocus
                              placeholder="请输入用户名"
                            />
                          </div>
                        )
                      : (
                          <h2 className="text-2xl font-bold h-8 overflow-hidden text-ellipsis whitespace-nowrap">
                            {user?.username || "未知用户"}
                          </h2>
                        )}
                  </div>
                )}
          </div>

          {/* 简介 */}
          <div className="w-full mt-4">
            {userQuery.isLoading
              ? (
                  <div className="skeleton h-6 w-full"></div>
                )
              : (
                  <div>
                    {userId === loginUserId && isEditingProfile
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
                              maxLength={253}
                              placeholder="请输入个人描述..."
                            />
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
                                  onClick={saveProfile}
                                  className="btn btn-sm btn-success"
                                  disabled={
                                    !editingUsername.trim()
                                    || editingUsername.length > 30
                                    || editingDescription.length > 253
                                    || updateUserInfoMutation.isPending
                                  }
                                >
                                  保存
                                </button>
                                <button
                                  onClick={cancelEditingProfile}
                                  className="btn btn-sm btn-ghost"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      : (
                          <div>
                            <div
                              className={`text-base break-words overflow-hidden transition-all duration-300 ease-in-out ${
                                isExpanded ? "max-h-96" : "max-h-12"
                              }`}
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: isExpanded ? "unset" : 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              <p className="leading-6">
                                {user?.description || "这个人就是个杂鱼，什么也不愿意写喵~"}
                              </p>
                            </div>
                            {user?.description && user.description.length > 80 && (
                              <button
                                onClick={() => setIsExpanded(prev => !prev)}
                                className="text-blue-400 text-xs cursor-pointer mt-2 hover:underline transition-colors duration-200 flex items-center gap-1"
                                type="button"
                              >
                                <span>{isExpanded ? "收起" : "展开"}</span>
                                <svg
                                  className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
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
                              </button>
                            )}
                          </div>
                        )}
                  </div>
                )}
          </div>

          {/* 关注粉丝统计 - 大屏幕显示在简介正下方 */}
          <div className="flex gap-8 justify-center w-full mt-4">
            <div
              className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer"
              onClick={handleFollowingClick}
            >
              <div className="stat-value text-sm">{followStats.following}</div>
              <div className="stat-title text-sm">关注</div>
            </div>
            <span className="border-l"></span>
            <div
              className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer"
              onClick={handleFollowersClick}
            >
              <div className="stat-value text-sm">{followStats.followers}</div>
              <div className="stat-title text-sm">粉丝</div>
            </div>
          </div>

          {/* 用户标签 */}
          <div className="mb-4 mt-4">
            <TagManagement userId={userId} />
          </div>

          {/* 编辑个人资料按钮 - 只在未编辑时显示 */}
          {!userQuery.isLoading && user?.userId === loginUserId && !isEditingProfile && (
            <button
              className="btn flex w-full mt-4 border border-gray-300 hover:text-primary transition-colors h-10 cursor-pointer"
              type="button"
              onClick={startEditingProfile}
              aria-label="编辑个人资料"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span className="text-sm">编辑个人资料</span>
            </button>
          )}

          {/* GNS雷达图 */}
          {!userQuery.isLoading && (
            <div className="mt-6 w-full">
              <GNSSpiderChart userId={userId} />
            </div>
          )}

          {/* 非本人的操作按钮 */}
          {!userQuery.isLoading && user?.userId !== loginUserId && (
            <div className="flex-col w-full mt-4">
              <FollowButton userId={user?.userId || 0} className="w-full" />
              <Link to={`/chat/private/${userId}`} className="flex w-full flex-shrink-0 mt-4">
                <button
                  type="button"
                  className="btn flex border w-full border-gray-300 rounded-3 hover:text-primary transition-colors h-8 cursor-pointer"
                >
                  <svg
                    aria-label="私信"
                    width="16"
                    height="16"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="flex-shrink-0"
                  >
                    <g
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      strokeWidth="2"
                      fill="none"
                      stroke="currentColor"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </g>
                  </svg>
                  <span className="text-sm">私信</span>
                </button>
              </Link>
            </div>
          )}

        </div>

      </div>
      {/* 右侧 - 真正的主页 */}
      <div className="flex-1 lg:m-2">
        <div className="p-4 shadow-md rounded-xl">
          {/* 个人主页的Readme */}
          <div className="p-2">
            {userId === loginUserId && isEditingReadMe
              ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">编辑 ReadMe</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={saveReadMe}
                          className="btn btn-sm btn-success"
                          disabled={updateUserInfoMutation.isPending}
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEditingReadMe}
                          className="btn btn-sm btn-ghost"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                    <MarkdownEditor
                      defaultContent={editingReadMe}
                      onChange={value => setEditingReadMe(value)}
                    />
                    <div className="text-xs text-neutral-500">
                      提示：支持 Markdown 语法，使用 Ctrl+Enter 保存
                    </div>
                  </div>
                )
              : (
                  <div
                    className={userId === loginUserId ? "cursor-pointer hover:bg-base-200 p-2 rounded transition-colors relative" : ""}
                    onClick={userId === loginUserId ? startEditingReadMe : undefined}
                    title={userId === loginUserId ? "点击编辑 ReadMe" : undefined}
                  >
                    <MarkDownViewer
                      content={user?.readMe || "## Hi, welcome to my personal page!👋"}
                    >
                    </MarkDownViewer>
                    {userId === loginUserId && (
                      <div
                        className="absolute top-2 right-2 opacity-50 hover:opacity-100 transition-opacity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                )}
          </div>
        </div>
      </div>

      <PopWindow
        isOpen={isFFWindowOpen}
        onClose={() => {
          setIsFFWindowOpen(false);
          followingsQuery.refetch();
          followersQuery.refetch();
        }}
      >
        <UserFollower activeTab={relationTab} userId={userId}></UserFollower>
      </PopWindow>
    </div>
  );
};

export default HomeTab;
