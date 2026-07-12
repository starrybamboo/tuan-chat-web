import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";
import { appToast } from "@/components/common/appToast/appToast";

import { useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Button } from "@/components/common/Button";
import { Disclosure } from "@/components/common/Disclosure";
import { TextInput } from "@/components/common/FormField";
import { Badge, InlineAlert } from "@/components/common/StatusPrimitives";
import { IconButton } from "@/components/common/IconButton";
import { ImeAwareSearchInput } from "@/components/common/imeAwareSearchInput";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { HomeIcon, Search, XMarkICon } from "@/icons";
import {
  useAcceptFriendRequestMutation,
  useCheckFriendQuery,
  useGetFriendListQuery,
  useGetFriendRequestPageQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
} from "api/hooks/friendQueryHooks";
import { useGetUserInfoByUsernameQuery, useGetUserInfoQuery } from "api/hooks/UserHooks";

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
  const router = useRouter();
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
  function handleInputChange(value: string) {
    setInputKeyword(value);
    if (!value.trim()) {
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
      <div className="
        w-full px-2 pb-6 flex items-center justify-center relative
      ">
        <ImeAwareSearchInput
          density="default"
          type="text"
          autoComplete="off"
          aria-label="搜索用户"
          placeholder="输入用户ID或用户名，按 Enter 或搜索按钮"
          value={inputKeyword}
          onSubmit={searchInputKeyword}
          onValueChange={handleInputChange}
        />
        <button
          type="button"
          className="
            absolute right-4 cursor-pointer w-8 h-8 flex items-center
            justify-center rounded-md
            hover:bg-base-300
          "
          onClick={searchInputKeyword}
          aria-label="搜索用户"
        >
          <Search className="size-5" />
        </button>
        <button
          type="button"
          className="
            absolute right-14 cursor-pointer w-8 h-8 flex items-center
            justify-center rounded-md
            hover:bg-base-300
          "
          onClick={() => {
            setInputKeyword("");
            setSearching(false);
            setSearchUserId(-1);
            setSearchUsername("");
            setSearchMode("id");
            setNotice("");
            setVerifyMsg("");
          }}
          aria-label="清空搜索"
        >
          <XMarkICon className="size-5" />
        </button>
      </div>

      {pendingReceivedRequests.length > 0 && (
        <div className="w-full px-2 pb-4">
          <Disclosure
            className="bg-base-200"
            titleClassName="text-sm font-medium"
            title={(
              <>
              好友申请（待处理）(
              {pendingReceivedRequests.length}
              )
              </>
            )}
          >
              <div className="flex flex-col gap-2">
                {pendingReceivedRequests.map((req) => {
                  const user = req.fromUser;
                  return (
                    <div
                      key={req.id}
                      className="
                        flex items-center justify-between p-2 rounded-md
                        bg-base-100
                      "
                    >
                      <div className="flex items-center gap-2">
                        <UserAvatarByUser
                          user={user}
                          fallbackUserId={user?.userId}
                          width={8}
                          isRounded={true}
                          stopToastWindow={true}
                          clickEnterProfilePage={false}
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
                        <Button
                          variant="info"
                          size="xs"
                          disabled={acceptFriendRequestMutation.isPending || !req.id}
                          onClick={() => {
                            if (!req.id)
                              return;
                            acceptFriendRequestMutation.mutate({ friendReqId: req.id });
                          }}
                        >
                          同意
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={rejectFriendRequestMutation.isPending || !req.id}
                          onClick={() => {
                            if (!req.id)
                              return;
                            rejectFriendRequestMutation.mutate({ friendReqId: req.id });
                          }}
                        >
                          拒绝
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
          </Disclosure>
        </div>
      )}

      {notice && (
        <div className="w-full px-2 pb-2">
          <InlineAlert tone="warning" className="py-2">
            <span className="text-sm">{notice}</span>
          </InlineAlert>
        </div>
      )}

      {searching
        ? (
            <div className="flex flex-col w-full">
              {searchUserInfo
                ? (
                    <div
                      key={searchUserInfo?.userId}
                      className="
                        flex items-center justify-between rounded-md border-t-2
                        border-base-300 p-2
                        hover:bg-base-300
                      "
                    >
                      <button
                        type="button"
                        className="
                          flex min-w-0 flex-1 items-center gap-2 text-left
                        "
                        onClick={() => {
                          if (friendCheck?.canSendMessage === false) {
                            setNotice("当前无法发送私聊消息，请先成为好友或解除限制");
                            return;
                          }
                          setSearching(false);
                          router.history.push(`/chat/private/${searchUserInfo?.userId}`);
                        }}
                      >
                        <UserAvatarByUser
                          user={searchUserInfo}
                          fallbackUserId={searchUserInfo?.userId}
                          width={10}
                          isRounded={true}
                          stopToastWindow={true}
                          clickEnterProfilePage={false}
                        />
                        <span>{searchUserInfo?.userId}</span>
                        <span className="font-bold">{searchUserInfo?.username}</span>
                        {friendCheck?.statusDesc && (
                          <Badge appearance="ghost">{friendCheck.statusDesc}</Badge>
                        )}
                        {friendCheckQuery.isLoading && (
                          <Badge appearance="ghost">查询中</Badge>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end gap-2">
                          {!friendCheck?.isFriend && friendCheck?.status !== 3 && (
                            <>
                              <TextInput
                                density="compact"
                                type="text"
                                autoComplete="off"
                                aria-label="验证信息"
                                className="w-48"
                                placeholder="验证信息（必填）"
                                value={verifyMsg}
                                onClick={e => e.stopPropagation()}
                                onChange={e => setVerifyMsg(e.target.value)}
                              />
                              <Button
                                variant="info"
                                size="xs"
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
                                        appToast.success("发送成功");
                                      },
                                      onError: (err) => {
                                        appToast.error(getErrorMessage(err));
                                      },
                                    },
                                  );
                                }}
                              >
                                {friendCheck?.status === 1 ? "已申请" : "加好友"}
                              </Button>
                            </>
                          )}

                          {friendCheck?.status === 3 && (
                            <span className="text-xs opacity-60">已拉黑，无法申请</span>
                          )}
                        </div>

                        <IconButton
                          icon={<HomeIcon className="size-5" />}
                          label="查看用户主页"
                          variant="ghost"
                          size="sm"
                          shape="square"
                          className="w-8 h-8 rounded-md hover:bg-base-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.history.push(`/profile/${searchUserInfo?.userId}`);
                          }}
                        />
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
                      className="
                        flex items-center justify-between rounded-md border-t-2
                        border-base-300 p-2
                        hover:bg-base-300
                      "
                    >
                      <button
                        type="button"
                        className="
                          flex min-w-0 flex-1 items-center gap-2 text-left
                        "
                        onClick={() => router.history.push(`/chat/private/${friend?.userId}`)}
                      >
                        <UserAvatarByUser
                          user={friend}
                          fallbackUserId={friend?.userId}
                          width={10}
                          isRounded={true}
                          stopToastWindow={true}
                          clickEnterProfilePage={false}
                        />
                        <span>{friend?.userId}</span>
                        <span className="font-bold">{friend?.username}</span>
                      </button>
                      <IconButton
                        icon={<HomeIcon className="size-5" />}
                        label="查看用户主页"
                        variant="ghost"
                        size="sm"
                        shape="square"
                        className="w-8 h-8 rounded-md hover:bg-base-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.history.push(`/profile/${friend?.userId}`);
                        }}
                      />
                    </div>
                  );
                })
              }
            </div>
          )}
    </>
  );
}
