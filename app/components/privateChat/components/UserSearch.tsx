import type { FriendResponse } from "api/models/FriendResponse";
import {
  useAcceptFriendRequestMutation,
  useCheckFriendQuery,
  useGetFriendListQuery,
  useGetFriendRequestPageQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
} from "api/hooks/friendQueryHooks";
import { useGetUserInfoByUsernameQuery, useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import { HomeIcon, Search, XMarkICon } from "@/icons";

type AddFriendSearchMode = "id" | "username";

function getErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const anyError = error as any;
    const body = anyError?.body;
    const errMsg = body?.errMsg ?? body?.message ?? anyError?.message;
    if (typeof errMsg === "string" && errMsg.trim()) {
      return errMsg.trim();
    }
  }

  return "发送失败";
}

export default function UserSearch() {
  /**
   * 搜索用户
   */
  const [inputKeyword, setInputKeyword] = useState<string>("");
  const [searchMode, setSearchMode] = useState<AddFriendSearchMode>("id");
  const [searchUserId, setSearchUserId] = useState<number>(-1);
  const [searchUsername, setSearchUsername] = useState<string>("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  // 获取并缓存好友列表
  const friendListQuery = useGetFriendListQuery({ pageNo: 1, pageSize: 100 });
  const friendUserInfos: FriendResponse[] = useMemo(
    () => (Array.isArray(friendListQuery.data?.data) ? friendListQuery.data.data : []),
    [friendListQuery.data],
  );

  // 好友申请列表（含 sent/received）
  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingReceivedRequests = useMemo(
    () => {
      const list = friendRequestPageQuery.data?.data?.list || [];
      return list.filter(r => r?.type === "received" && r?.status === 1);
    },
    [friendRequestPageQuery.data],
  );
  const acceptFriendRequestMutation = useAcceptFriendRequestMutation();
  const rejectFriendRequestMutation = useRejectFriendRequestMutation();

  const searchUserInfoById = useGetUserInfoQuery(searchUserId).data?.data || null;
  const searchUserInfoByUsername = useGetUserInfoByUsernameQuery(searchUsername).data?.data || null;
  const searchUserInfo = searchMode === "username" ? searchUserInfoByUsername : searchUserInfoById;
  const targetUserId = searchUserInfo?.userId || -1;
  const friendCheckQuery = useCheckFriendQuery(targetUserId, searching && targetUserId > 0);
  const friendCheck = friendCheckQuery.data?.data;
  const sendFriendRequestMutation = useSendFriendRequestMutation();
  const [verifyMsg, setVerifyMsg] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

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
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      searchInputKeyword();
    }
  };

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputKeyword(e.target.value);
    if (!e.target.value.trim()) {
      setSearching(false);
      setSearchUserId(-1);
      setSearchUsername("");
      setSearchMode("id");
      setNotice("");
      setVerifyMsg("");
    }
  }
  return (
    <>
      <div className="w-full px-2 pb-6 flex items-center justify-center relative">
        <input
          type="text"
          className="input input-md w-full"
          placeholder="输入用户ID或用户名，按 Enter 或搜索按钮"
          value={inputKeyword}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <div
          className="absolute right-4 cursor-pointer w-8 h-8 flex items-center justify-center rounded-box hover:bg-base-300"
          onClick={searchInputKeyword}
        >
          <Search className="size-5" />
        </div>
        <div
          className="absolute right-14 cursor-pointer w-8 h-8 flex items-center justify-center rounded-box hover:bg-base-300"
          onClick={() => {
            setInputKeyword("");
            setSearching(false);
            setSearchUserId(-1);
            setSearchUsername("");
            setSearchMode("id");
            setNotice("");
            setVerifyMsg("");
          }}
        >
          <XMarkICon className="size-5" />
        </div>
      </div>

      {pendingReceivedRequests.length > 0 && (
        <div className="w-full px-2 pb-4">
          <details className="collapse collapse-arrow bg-base-200">
            <summary className="collapse-title text-sm font-medium">
              好友申请（待处理）(
              {pendingReceivedRequests.length}
              )
            </summary>
            <div className="collapse-content">
              <div className="flex flex-col gap-2">
                {pendingReceivedRequests.map((req) => {
                  const user = req.fromUser;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2 rounded-md bg-base-100"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          className="rounded-full"
                          src={user?.avatar}
                          alt="UserAvatar"
                          width={32}
                          height={32}
                        />
                        <span className="font-bold">{user?.username}</span>
                        <span className="opacity-70">
                          (
                          {user?.userId}
                          )
                        </span>
                        {req.verifyMsg && <span className="text-xs opacity-60">{req.verifyMsg}</span>}
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
            </div>
          </details>
        </div>
      )}

      {notice && (
        <div className="w-full px-2 pb-2">
          <div className="alert alert-warning py-2">
            <span className="text-sm">{notice}</span>
          </div>
        </div>
      )}

      {searching
        ? (
            <div className="flex flex-col w-full">
              {searchUserInfo
                ? (
                    <div
                      key={searchUserInfo?.userId}
                      className="flex items-center justify-between cursor-pointer hover:bg-base-300 p-2 rounded-md border-t-2 border-base-300"
                      onClick={() => {
                        if (friendCheck?.canSendMessage === false) {
                          setNotice("当前无法发送私聊消息，请先成为好友或解除限制");
                          return;
                        }
                        setSearching(false);
                        navigate(`/chat/private/${searchUserInfo?.userId}`);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          className="rounded-full"
                          src={searchUserInfo?.avatar}
                          alt="FriendAvatar"
                          width={40}
                          height={40}
                        />
                        <span>{searchUserInfo?.userId}</span>
                        <span className="font-bold">{searchUserInfo?.username}</span>
                        {friendCheck?.statusDesc && (
                          <span className="badge badge-ghost badge-sm">{friendCheck.statusDesc}</span>
                        )}
                        {friendCheckQuery.isLoading && (
                          <span className="badge badge-ghost badge-sm">查询中</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end gap-2">
                          {!friendCheck?.isFriend && friendCheck?.status !== 3 && (
                            <>
                              <input
                                type="text"
                                className="input input-xs w-48"
                                placeholder="验证信息（必填）"
                                value={verifyMsg}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setVerifyMsg(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-xs btn-primary"
                                disabled={
                                  sendFriendRequestMutation.isPending
                                  || !searchUserInfo?.userId
                                  || friendCheckQuery.isLoading
                                  || friendCheck?.status === 1
                                  || verifyMsg.trim().length === 0
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!searchUserInfo?.userId)
                                    return;
                                  const trimmed = verifyMsg.trim();
                                  if (!trimmed) {
                                    setNotice("验证消息不能为空");
                                    return;
                                  }
                                  sendFriendRequestMutation.mutate(
                                    {
                                      targetUserId: searchUserInfo.userId,
                                      verifyMsg: trimmed,
                                    },
                                    {
                                      onSuccess: () => {
                                        toast.success("发送成功");
                                      },
                                      onError: (err) => {
                                        toast.error(getErrorMessage(err));
                                      },
                                    },
                                  );
                                }}
                              >
                                {friendCheck?.status === 1 ? "已申请" : "加好友"}
                              </button>
                            </>
                          )}

                          {friendCheck?.status === 3 && (
                            <span className="text-xs opacity-60">已拉黑，无法申请</span>
                          )}
                        </div>

                        <div
                          className="w-8 h-8 flex items-center justify-center rounded-box hover:bg-base-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${searchUserInfo?.userId}`);
                          }}
                        >
                          <HomeIcon className="size-5" />
                        </div>
                      </div>
                    </div>
                  )
                : (
                    <div className="flex items-center justify-center">
                      <span>未找到用户</span>
                    </div>
                  )}
            </div>
          )
        : (
            <div className="flex flex-col w-full">
              {
                friendUserInfos.map((friend, index) => {
                  return (
                    <div
                      key={friend?.userId || index}
                      className="flex items-center justify-between cursor-pointer hover:bg-base-300 p-2 rounded-md border-t-2 border-base-300"
                      onClick={() => navigate(`/chat/private/${friend?.userId}`)}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          className="rounded-full"
                          src={friend?.avatar}
                          alt="FriendAvatar"
                          width={40}
                          height={40}
                        />
                        <span>{friend?.userId}</span>
                        <span className="font-bold">{friend?.username}</span>
                      </div>
                      <div
                        className="w-8 h-8 flex items-center justify-center rounded-box hover:bg-base-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${friend?.userId}`);
                        }}
                      >
                        <HomeIcon className="size-5" />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
    </>
  );
}
