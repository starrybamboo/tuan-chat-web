import type { FriendResponse } from "api/models/FriendResponse";
import {
  useAcceptFriendRequestMutation,
  useBlockFriendMutation,
  useCheckFriendQuery,
  useDeleteFriendMutation,
  useGetBlackListQuery,
  useGetFriendListQuery,
  useGetFriendRequestPageQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
  useUnblockFriendMutation,
} from "api/hooks/friendQueryHooks";
import { useGetUserInfoByUsernameQuery, useGetUserInfoQuery } from "api/hooks/UserHooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { BaselineDeleteOutline, ChevronRight, HomeIcon, Search, SearchFilled, XMarkICon } from "@/icons";

type FriendsTab = "all" | "pending" | "add" | "blacklist";
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
  const friendSearchInputRef = useRef<HTMLInputElement>(null);

  // 允许通过 URL 控制默认页签：/chat/private?tab=pending|blacklist|add|all
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "all" || tabParam === "pending" || tabParam === "add" || tabParam === "blacklist") {
      setTab(tabParam);
    }
    else {
      setTab("all");
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
  const blackListQuery = useGetBlackListQuery({ pageNo: 1, pageSize: 100 });
  const blackListUserInfos: FriendResponse[] = useMemo(
    () => (Array.isArray(blackListQuery.data?.data) ? blackListQuery.data.data : []),
    [blackListQuery.data],
  );

  // 待处理好友申请（received + status=1）
  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingReceivedRequests = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list || [];
    return list.filter((r: any) => r?.type === "received" && r?.status === 1);
  }, [friendRequestPageQuery.data]);

  const showTopSubBar = tab === "all" || tab === "pending" || tab === "blacklist";
  const topSubBarLabel = tab === "pending" ? "待处理请求" : tab === "blacklist" ? "黑名单人数" : "好友总数";
  const topSubBarCount = tab === "pending"
    ? pendingReceivedRequests.length
    : tab === "blacklist"
      ? blackListUserInfos.length
      : friendUserInfos.length;

  const acceptFriendRequestMutation = useAcceptFriendRequestMutation();
  const rejectFriendRequestMutation = useRejectFriendRequestMutation();
  const deleteFriendMutation = useDeleteFriendMutation();
  const blockFriendMutation = useBlockFriendMutation();
  const unblockFriendMutation = useUnblockFriendMutation();

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
    <div className="flex flex-col h-full w-full bg-white/30 dark:bg-slate-950/30">
      {/* 顶部栏 */}
      <div className="border-gray-300 dark:border-gray-700 border-t border-b flex justify-between items-center overflow-visible relative z-10">
        <div
          className="flex justify-between items-center w-full px-2 h-10
          bg-white/40 dark:bg-slate-950/25 backdrop-blur-xl
          border border-white/40 dark:border-white/10"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="sm:hidden">
              <button
                type="button"
                aria-label="打开左侧边栏"
                className="btn btn-ghost btn-square btn-sm"
                onClick={() => setIsOpenLeftDrawer(true)}
              >
                <ChevronRight className="size-6" />
              </button>
            </div>
            <span className="text-base font-bold truncate leading-none min-w-0 text-left ml-3">
              # 好友列表
            </span>

            <span aria-hidden="true" className="mx-1 text-base-content/50">
              •
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm rounded-md border border-gray-300 dark:border-gray-700 ${tab === "all" ? "btn-active" : "btn-ghost"}`}
                onClick={() => setTab("all")}
              >
                全部
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-md border border-gray-300 dark:border-gray-700 ${tab === "pending" ? "btn-active" : "btn-ghost"}`}
                onClick={() => setTab("pending")}
              >
                <span className="indicator">
                  {pendingBadgeText && (
                    <span className="indicator-item badge badge-error badge-xs">
                      {pendingBadgeText}
                    </span>
                  )}
                  <span>待处理</span>
                </span>
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-md border border-gray-300 dark:border-gray-700 ${tab === "blacklist" ? "btn-active" : "btn-ghost"}`}
                onClick={() => setTab("blacklist")}
              >
                黑名单
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 内容区：中间列表 + 右侧活动 */}
      <div className="flex flex-1 min-h-0">
        {/* 中间 */}
        <div className="flex-1 min-w-0 flex flex-col px-6">
          {tab === "all" && (
            <div className="mt-2 py-2">
              <div className="relative w-full">
                <div className="border border-gray-300 dark:border-gray-700 flex h-10 items-center gap-1 bg-base-200 rounded-lg overflow-hidden">
                  <div className="flex h-full items-center flex-1 px-3">
                    <input
                      ref={friendSearchInputRef}
                      type="text"
                      placeholder="搜索好友..."
                      className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-base-content/60"
                      value={friendKeyword}
                      onChange={e => setFriendKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setFriendKeyword("");
                        }
                      }}
                    />
                    {friendKeyword && (
                      <button
                        type="button"
                        onClick={() => setFriendKeyword("")}
                        className="flex items-center justify-center text-base-content/60 hover:text-base-content transition-colors ml-2"
                        aria-label="清空"
                      >
                        <XMarkICon className="size-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="h-full px-3 flex items-center justify-center text-base-content/60 hover:text-info hover:bg-base-300 transition-colors"
                    disabled={!friendKeyword.trim()}
                    aria-label="搜索"
                    onClick={() => friendSearchInputRef.current?.focus()}
                  >
                    <SearchFilled className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {showTopSubBar && (
            <div className="py-4 border-b border-gray-300 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium opacity-80">
                  {topSubBarLabel}
                  {" "}
                  -
                  {" "}
                  {topSubBarCount}
                </div>

              </div>
            </div>
          )}
          {notice && (
            <div className="pt-3">
              <div className={`alert ${noticeType === "success" ? "alert-success" : "alert-warning"} py-2`}>
                <span className="text-sm">{notice}</span>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto pb-2">
            {tab === "all" && (
              <div className="flex flex-col gap-2 w-full py-2">
                {filteredFriends.map((friend, index) => (
                  <div
                    key={friend?.userId || index}
                    className="w-full text-left flex items-center justify-between hover:bg-base-300 rounded-md h-16"
                    onClick={() => navigate(`/chat/private/${friend?.userId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget)
                        return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/chat/private/${friend?.userId}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 justify-between w-full">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="avatar w-12">
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
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 items-center">
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
                          <HomeIcon className="size-6" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-warning"
                          disabled={blockFriendMutation.isPending || !friend?.userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!friend?.userId) {
                              return;
                            }
                            // eslint-disable-next-line no-alert
                            const ok = window.confirm(`确定拉黑好友「${friend?.username || friend.userId}」吗？`);
                            if (!ok)
                              return;
                            blockFriendMutation.mutate(
                              { targetUserId: friend.userId },
                              {
                                onSuccess: () => {
                                  showNotice("已加入黑名单", "success");
                                },
                                onError: (error) => {
                                  showNotice(getErrorMessage(error) || "拉黑失败，请稍后重试", "warning");
                                },
                              },
                            );
                          }}
                          aria-label="拉黑好友"
                          title="拉黑好友"
                        >
                          拉黑
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square text-error"
                          disabled={deleteFriendMutation.isPending || !friend?.userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!friend?.userId) {
                              return;
                            }
                            // eslint-disable-next-line no-alert
                            const ok = window.confirm(`确定删除好友「${friend?.username || friend.userId}」吗？`);
                            if (!ok)
                              return;
                            deleteFriendMutation.mutate({ targetUserId: friend.userId });
                          }}
                          aria-label="删除好友"
                          title="删除好友"
                        >
                          <BaselineDeleteOutline className="size-6" />
                        </button>
                      </div>
                    </div>
                    <div className="w-2"></div>
                  </div>
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

            {/* 黑名单 */}
            {tab === "blacklist" && (
              <div className="flex flex-col gap-2 w-full py-2">
                {blackListUserInfos.map((friend, index) => (
                  <div
                    key={friend?.userId || index}
                    className="w-full text-left flex items-center justify-between rounded-md h-16"
                  >
                    <div className="flex items-center gap-3 min-w-0 justify-between w-full">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="avatar w-12">
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
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 items-center">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          onClick={() => navigate(`/profile/${friend?.userId}`)}
                          aria-label="查看主页"
                          title="前往主页"
                        >
                          <HomeIcon className="size-6" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-success"
                          disabled={unblockFriendMutation.isPending || !friend?.userId}
                          onClick={() => {
                            if (!friend?.userId) {
                              return;
                            }
                            // eslint-disable-next-line no-alert
                            const ok = window.confirm(`确定取消拉黑「${friend?.username || friend.userId}」吗？`);
                            if (!ok)
                              return;
                            unblockFriendMutation.mutate(
                              { targetUserId: friend.userId },
                              {
                                onSuccess: () => {
                                  showNotice("已移出黑名单", "success");
                                },
                                onError: (error) => {
                                  showNotice(getErrorMessage(error) || "取消拉黑失败，请稍后重试", "warning");
                                },
                              },
                            );
                          }}
                          aria-label="取消拉黑"
                          title="取消拉黑"
                        >
                          取消拉黑
                        </button>
                      </div>
                    </div>
                    <div className="w-2"></div>
                  </div>
                ))}
                {blackListUserInfos.length === 0 && (
                  <div className="flex items-center justify-center h-32 opacity-70 text-sm">
                    黑名单为空
                  </div>
                )}
              </div>
            )}

            {/* 添加好友 */}
            {tab === "add" && (
              <div className="px-4 pt-4">
                <div className="rounded-xl border border-base-300 bg-base-200/40 p-4 sm:p-6">
                  <div className="text-lg font-semibold">添加好友</div>
                  <div className="text-sm opacity-70 mt-1">通过用户ID或用户名发送好友申请。</div>

                  <div className="mt-4">
                    <div className="flex flex-col gap-2 rounded-xl border border-base-300 bg-base-100 px-3 py-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        className="input input-md w-full bg-transparent border-none focus:outline-none sm:flex-1"
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square"
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
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={searchInputKeyword}
                        >
                          <Search className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>

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
        <div className="hidden lg:flex w-80 border-l border-base-300 bg-base-200 flex-col p-4">
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
