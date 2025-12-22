import type { FriendResponse } from "api/models/FriendResponse";

import { BaselineDeleteOutline, ChevronRight, HomeIcon, Search, UsersIcon, XMarkICon } from "@/icons";
import {
  useAcceptFriendRequestMutation,
  useCheckFriendQuery,
  useDeleteFriendMutation,
  useGetFriendListQuery,
  useGetFriendRequestPageQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
} from "api/hooks/friendQueryHooks";
import { useGetUserInfoByUsernameQuery, useGetUserInfoQuery } from "api/hooks/UserHooks";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

type FriendsTab = "all" | "pending" | "add";
type AddFriendSearchMode = "id" | "username";

export default function FriendsPage({
  setIsOpenLeftDrawer,
}: {
  setIsOpenLeftDrawer: (isOpen: boolean) => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState<FriendsTab>("all");
  const [friendKeyword, setFriendKeyword] = useState("");

  // 允许通过 URL 控制默认页签：/chat/private?tab=pending
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "all" || tabParam === "pending" || tabParam === "add") {
      setTab(tabParam);
    }
  }, [searchParams]);

  // 添加好友（按用户ID搜索）
  const [inputKeyword, setInputKeyword] = useState<string>("");
  const [searchMode, setSearchMode] = useState<AddFriendSearchMode>("id");
  const [searchUserId, setSearchUserId] = useState<number>(-1);
  const [searchUsername, setSearchUsername] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [noticeType, setNoticeType] = useState<"warning" | "success">("warning");

  const friendListQuery = useGetFriendListQuery({ pageNo: 1, pageSize: 100 });
  const friendUserInfos: FriendResponse[] = useMemo(
    () => (Array.isArray(friendListQuery.data?.data) ? friendListQuery.data.data : []),
    [friendListQuery.data],
  );

  // 待处理好友申请（received + status=1）
  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingReceivedRequests = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list || [];
    return list.filter((r: any) => r?.type === "received" && r?.status === 1);
  }, [friendRequestPageQuery.data]);

  const acceptFriendRequestMutation = useAcceptFriendRequestMutation();
  const rejectFriendRequestMutation = useRejectFriendRequestMutation();
  const deleteFriendMutation = useDeleteFriendMutation();

  const searchUserInfoById = useGetUserInfoQuery(searchUserId).data?.data || null;
  const searchUserInfoByUsername = useGetUserInfoByUsernameQuery(searchUsername).data?.data || null;
  const searchUserInfo = searchMode === "username" ? searchUserInfoByUsername : searchUserInfoById;
  const targetUserId = searchUserInfo?.userId || -1;
  const friendCheckQuery = useCheckFriendQuery(targetUserId, searching && targetUserId > 0);
  const friendCheck = friendCheckQuery.data?.data;
  const sendFriendRequestMutation = useSendFriendRequestMutation();

  function showNotice(text: string, type: "warning" | "success" = "warning") {
    setNoticeType(type);
    setNotice(text);
  }

  function getErrorMessage(error: unknown): string | undefined {
    const anyError = error as any;
    const errMsg = anyError?.body?.errMsg || anyError?.errMsg;
    if (typeof errMsg === "string" && errMsg.trim()) {
      return errMsg.trim();
    }
    const message = anyError?.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
    return undefined;
  }

  const filteredFriends = useMemo(() => {
    const keyword = friendKeyword.trim().toLowerCase();
    if (!keyword) {
      return friendUserInfos;
    }
    return friendUserInfos.filter((f) => {
      const name = `${f?.username ?? ""}`.toLowerCase();
      const id = `${f?.userId ?? ""}`;
      return name.includes(keyword) || id.includes(keyword);
    });
  }, [friendKeyword, friendUserInfos]);

  const pendingBadgeText = useMemo(() => {
    const count = pendingReceivedRequests.length;
    if (count <= 0) {
      return null;
    }
    if (count > 99) {
      return "99+";
    }
    return String(count);
  }, [pendingReceivedRequests.length]);

  function searchInputKeyword() {
    const keyword = inputKeyword.trim();
    if (!keyword) {
      return;
    }

    setNotice("");
    setVerifyMsg("");
    setSearching(true);

    if (/^\d+$/.test(keyword)) {
      const id = Number.parseInt(keyword, 10);
      if (id > 0) {
        setSearchMode("id");
        setSearchUsername("");
        setSearchUserId(id);
      }
      return;
    }

    setSearchMode("username");
    setSearchUserId(-1);
    setSearchUsername(keyword);
  }

  return (
    <div className="flex flex-col h-full w-full bg-base-100">
      {/* 顶部栏 */}
      <div className="h-12 w-full border-b border-base-300 flex items-center gap-3 px-4">
        <ChevronRight
          onClick={() => setIsOpenLeftDrawer(true)}
          className="size-6 sm:hidden"
        />
        <div className="flex items-center gap-2 min-w-0">
          <UsersIcon className="size-5 opacity-70" />
          <span className="font-semibold">好友</span>
        </div>

        {/* 交互左对齐：全部/待处理同组切换，添加好友单独强调 */}
        <div className="flex items-center gap-2">
          <div className="join">
            <button
              type="button"
              className={`btn btn-sm join-item ${tab === "all" ? "btn-active" : "btn-ghost"}`}
              onClick={() => setTab("all")}
            >
              全部
            </button>
            <button
              type="button"
              className={`btn btn-sm join-item ${tab === "pending" ? "btn-active" : "btn-ghost"}`}
              onClick={() => setTab("pending")}
            >
              <span className="indicator">
                {pendingBadgeText && (
                  <span className="indicator-item badge badge-error badge-xs">
                    {pendingBadgeText}
                  </span>
                )}
                <span>
                  待处理
                </span>
              </span>
            </button>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${tab === "add" ? "btn-success" : "btn-outline btn-success"}`}
            onClick={() => setTab("add")}
          >
            添加好友
          </button>
        </div>
      </div>

      {/* 内容区：中间列表 + 右侧活动 */}
      <div className="flex flex-1 min-h-0">
        {/* 中间 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 搜索（仅在线/全部） */}
          {tab === "all" && (
            <div className="px-4 py-3">
              <div className="relative">
                <input
                  type="text"
                  className="input input-sm w-full"
                  placeholder="搜索"
                  value={friendKeyword}
                  onChange={e => setFriendKeyword(e.target.value)}
                />
                {friendKeyword
                  ? (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
                        onClick={() => setFriendKeyword("")}
                        aria-label="清空"
                      >
                        <XMarkICon className="size-4" />
                      </button>
                    )
                  : (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60">
                        <Search className="size-4" />
                      </div>
                    )}
              </div>

              <div className="text-xs opacity-70 mt-3">
                好友总数 —
                {friendUserInfos.length}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto px-2 pb-2">
            {tab === "all" && (
              <div className="flex flex-col">
                {filteredFriends.map((friend, index) => (
                  <button
                    key={friend?.userId || index}
                    type="button"
                    className="w-full text-left flex items-center justify-between hover:bg-base-200 rounded-md px-3 py-2"
                    onClick={() => navigate(`/chat/private/${friend?.userId}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="avatar w-9">
                        <img
                          className="rounded-full"
                          src={friend?.avatar}
                          alt={friend?.username}
                        />
                      </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {friend?.username || `用户${friend?.userId}`}
                          </div>
                          <div className="text-xs opacity-70 truncate">{friend?.userId}</div>
                        </div>
                        {/* 交互左对齐：把“主页”按钮放到左侧信息区 */}
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${friend?.userId}`);
                          }}
                          aria-label="查看主页"
                          title="前往主页"
                        >
                          <HomeIcon className="size-4" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square text-error"
                          disabled={deleteFriendMutation.isPending || !friend?.userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!friend?.userId)
                              return;
                            // eslint-disable-next-line no-alert
                            const ok = window.confirm(`确定删除好友「${friend?.username || friend.userId}」吗？`);
                            if (!ok)
                              return;
                            deleteFriendMutation.mutate({ targetUserId: friend.userId });
                          }}
                          aria-label="删除好友"
                          title="删除好友"
                        >
                          <BaselineDeleteOutline className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-2"></div>
                  </button>
                ))}

                {filteredFriends.length === 0 && (
                  <div className="flex items-center justify-center h-32 opacity-70 text-sm">
                    未找到好友
                  </div>
                )}
              </div>
            )}

            {/* 待处理 */}
            {tab === "pending" && (
              <div className="px-2 pt-2">
                {pendingReceivedRequests.length === 0
                  ? (
                      <div className="flex items-center justify-center h-32 opacity-70 text-sm">
                        暂无待处理好友申请
                      </div>
                    )
                  : (
                      <div className="flex flex-col gap-2">
                        {pendingReceivedRequests.map((req: any) => {
                          const user = req.fromUser;
                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between p-3 rounded-md bg-base-200/40"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="avatar w-9">
                                  <img
                                    className="rounded-full"
                                    src={user?.avatar}
                                    alt={user?.username}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{user?.username}</div>
                                  <div className="text-xs opacity-70 truncate">
                                    {user?.userId}
                                    {req.verifyMsg ? ` · ${req.verifyMsg}` : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="btn btn-xs btn-primary"
                                  disabled={acceptFriendRequestMutation.isPending || !req.id}
                                  onClick={() => {
                                    if (!req.id)
                                      return;
                                    acceptFriendRequestMutation.mutate({ friendReqId: req.id });
                                  }}
                                >
                                  同意
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-xs"
                                  disabled={rejectFriendRequestMutation.isPending || !req.id}
                                  onClick={() => {
                                    if (!req.id)
                                      return;
                                    rejectFriendRequestMutation.mutate({ friendReqId: req.id });
                                  }}
                                >
                                  拒绝
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
              </div>
            )}

            {/* 添加好友 */}
            {tab === "add" && (
              <div className="px-4 pt-4">
                <div className="font-semibold">添加好友</div>
                <div className="text-xs opacity-70 mt-1">通过用户ID或用户名发送好友申请。</div>

                <div className="mt-4">
                  <div className="relative">
                    <input
                      type="text"
                      className="input input-md w-full"
                      placeholder="输入用户ID或用户名，按 Enter 或点击搜索"
                      value={inputKeyword}
                      onChange={(e) => {
                        setInputKeyword(e.target.value);
                        if (!e.target.value.trim()) {
                          setSearching(false);
                          setSearchUserId(-1);
                          setSearchUsername("");
                          setSearchMode("id");
                          setNotice("");
                          setVerifyMsg("");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchInputKeyword();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square"
                      onClick={searchInputKeyword}
                      aria-label="搜索"
                    >
                      <Search className="size-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-12 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm btn-square"
                      onClick={() => {
                        setInputKeyword("");
                        setSearching(false);
                        setSearchUserId(-1);
                        setSearchUsername("");
                        setSearchMode("id");
                        setNotice("");
                        setVerifyMsg("");
                      }}
                      aria-label="清空"
                    >
                      <XMarkICon className="size-5" />
                    </button>
                  </div>

                  {notice && (
                    <div className="mt-3">
                      <div className={`alert ${noticeType === "success" ? "alert-success" : "alert-warning"} py-2`}>
                        <span className="text-sm">{notice}</span>
                      </div>
                    </div>
                  )}

                  {searching && (
                    <div className="mt-4">
                      {searchUserInfo
                        ? (
                            <div
                              className="flex items-center justify-between p-3 rounded-md bg-base-200/40 cursor-pointer hover:bg-base-200"
                              onClick={() => {
                                if (friendCheck?.canSendMessage === false) {
                                  return;
                                }
                                setSearching(false);
                                navigate(`/chat/private/${searchUserInfo?.userId}`);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="avatar w-10">
                                  <img
                                    className="rounded-full"
                                    src={searchUserInfo?.avatar}
                                    alt={searchUserInfo?.username}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{searchUserInfo?.username}</div>
                                  <div className="text-xs opacity-70 truncate">{searchUserInfo?.userId}</div>
                                </div>
                                {friendCheck?.statusDesc && (
                                  <span className="badge badge-ghost badge-sm">{friendCheck.statusDesc}</span>
                                )}
                                {friendCheckQuery.isLoading && (
                                  <span className="badge badge-ghost badge-sm">查询中</span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {!friendCheck?.isFriend && friendCheck?.status !== 3 && (
                                  <div
                                    className="flex items-end gap-2"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="form-control">
                                      <label className="label py-0">
                                        <span className="label-text text-xs">
                                          验证信息
                                          <span className="text-error ml-1">*</span>
                                        </span>
                                      </label>
                                      <input
                                        type="text"
                                        className="input input-sm input-bordered w-64"
                                        placeholder="必填：简单说明你是谁/为何添加"
                                        value={verifyMsg}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setVerifyMsg(e.target.value)}
                                      />
                                    </div>
                                    {(() => {
                                      const isVerifyMissing = verifyMsg.trim().length === 0;
                                      const isAlreadyRequested = friendCheck?.status === 1;
                                      const disabled
                                        = sendFriendRequestMutation.isPending
                                          || !searchUserInfo?.userId
                                          || friendCheckQuery.isLoading
                                          || isAlreadyRequested
                                          || isVerifyMissing;
                                      const needVerifyTip
                                        = isVerifyMissing
                                          && !sendFriendRequestMutation.isPending
                                          && !!searchUserInfo?.userId
                                          && !friendCheckQuery.isLoading
                                          && !isAlreadyRequested;

                                      const buttonNode = (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-primary"
                                          disabled={disabled}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!searchUserInfo?.userId)
                                              return;
                                            const trimmed = verifyMsg.trim();
                                            if (!trimmed) {
                                              showNotice("请填写验证信息", "warning");
                                              return;
                                            }
                                            sendFriendRequestMutation.mutate(
                                              {
                                                targetUserId: searchUserInfo.userId,
                                                verifyMsg: trimmed,
                                              },
                                              {
                                                onSuccess: () => {
                                                  showNotice("好友申请已发送", "success");
                                                },
                                                onError: (error) => {
                                                  const message = getErrorMessage(error);
                                                  showNotice(message || "发送失败，请稍后重试", "warning");
                                                },
                                              },
                                            );
                                          }}
                                        >
                                          {isAlreadyRequested ? "已申请" : "发送申请"}
                                        </button>
                                      );

                                      if (!needVerifyTip) {
                                        return buttonNode;
                                      }

                                      return (
                                        <span
                                          className="inline-block"
                                          title="请填写验证信息"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          {buttonNode}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                )}

                                {friendCheck?.status === 3 && (
                                  <span className="text-xs opacity-60">已拉黑，无法申请</span>
                                )}

                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm btn-square"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/profile/${searchUserInfo?.userId}`);
                                  }}
                                  aria-label="查看主页"
                                  title="前往主页"
                                >
                                  <HomeIcon className="size-5" />
                                </button>
                              </div>
                            </div>
                          )
                        : (
                            <div className="flex items-center justify-center h-24 opacity-70 text-sm">
                              未找到用户
                            </div>
                          )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：当前活动（Discord 风格，桌面展示） */}
        <div className="hidden lg:flex w-80 border-l border-base-300 bg-base-200/20 flex-col p-4">
          <div className="font-semibold">当前活动</div>
          <div className="mt-6 text-center">
            <div className="font-bold">现在还安静……</div>
            <div className="text-sm opacity-70 mt-2">
              当好友开始活动或加入语音聊天的时候，他们的状态将会显示在这里！
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
