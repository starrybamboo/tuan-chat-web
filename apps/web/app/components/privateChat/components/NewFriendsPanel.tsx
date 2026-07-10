import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { ImeAwareSearchInput } from "@/components/common/imeAwareSearchInput";
import { privateChatListItemMotionProps, privateChatPanelMotionProps } from "@/components/common/motion/privateChatMotion";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { Search, XMarkICon } from "@/icons";
import {
  useAcceptFriendRequestMutation,
  useCheckFriendQuery,
  useGetFriendRequestPageQuery,
  useRejectFriendRequestMutation,
  useSendFriendRequestMutation,
} from "api/hooks/friendQueryHooks";
import { useGetUserInfoByUsernameQuery, useGetUserInfoQuery } from "api/hooks/UserHooks";

type SearchMode = "id" | "username";

export default function NewFriendsPanel() {
  const [inputKeyword, setInputKeyword] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("id");
  const [searchUserId, setSearchUserId] = useState(-1);
  const [searchUsername, setSearchUsername] = useState("");
  const [searching, setSearching] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"warning" | "success">("warning");

  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const pendingReceivedRequests = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list || [];
    return list.filter((r: any) => r?.type === "received" && r?.status === 1);
  }, [friendRequestPageQuery.data]);

  const acceptFriendRequestMutation = useAcceptFriendRequestMutation();
  const rejectFriendRequestMutation = useRejectFriendRequestMutation();
  const sendFriendRequestMutation = useSendFriendRequestMutation();

  const searchUserInfoById = useGetUserInfoQuery(searchUserId).data?.data || null;
  const searchUserInfoByUsername = useGetUserInfoByUsernameQuery(searchUsername).data?.data || null;
  const searchUserInfo = searchMode === "username" ? searchUserInfoByUsername : searchUserInfoById;
  const targetUserId = searchUserInfo?.userId || -1;
  const friendCheckQuery = useCheckFriendQuery(targetUserId, searching && targetUserId > 0);
  const friendCheck = friendCheckQuery.data?.data;

  function showNotice(text: string, type: "warning" | "success" = "warning") {
    setNoticeType(type);
    setNotice(text);
  }

  function getErrorMessage(error: unknown): string | undefined {
    const anyError = error as any;
    const errMsg = anyError?.body?.errMsg || anyError?.errMsg;
    if (typeof errMsg === "string" && errMsg.trim())
      return errMsg.trim();
    const message = anyError?.message;
    if (typeof message === "string" && message.trim())
      return message.trim();
    return undefined;
  }

  function searchInputKeyword() {
    const keyword = inputKeyword.trim();
    if (!keyword)
      return;

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

  function clearSearch() {
    setInputKeyword("");
    setSearching(false);
    setSearchUserId(-1);
    setSearchUsername("");
    setSearchMode("id");
    setNotice("");
    setVerifyMsg("");
  }

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      {/* 搜索/添加好友区域 */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-base font-semibold">添加好友</div>
        <div className="text-xs opacity-70 mt-1">通过用户ID或用户名发送好友申请</div>

        <div className="mt-3">
          <label htmlFor="new-friend-search" className="sr-only">输入用户ID或用户名</label>
          <div className="
            flex items-center gap-2 rounded-lg border border-base-300
            dark:border-base-300
            bg-base-200 px-3 py-2
            focus-within:border-info/60 focus-within:ring-2
            focus-within:ring-info/20
          ">
            <ImeAwareSearchInput
              id="new-friend-search"
              type="text"
              name="newFriendSearch"
              autoComplete="off"
              className="
                bg-transparent border-none outline-none flex-1 text-sm
                placeholder:text-base-content/60
              "
              placeholder="输入用户ID或用户名"
              value={inputKeyword}
              onValueChange={(value) => {
                setInputKeyword(value);
                if (!value.trim())
                  clearSearch();
              }}
              onSubmit={searchInputKeyword}
            />
            {inputKeyword && (
              <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={clearSearch} aria-label="清空">
                <XMarkICon className="size-4" />
              </button>
            )}
            <button
              type="button"
              className="btn btn-info btn-xs"
              onClick={searchInputKeyword}
              disabled={!inputKeyword.trim()}
              aria-label="搜索用户"
            >
              <Search className="size-4" />
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-2">
            <div className={`
              alert
              ${noticeType === "success" ? "alert-success" : `alert-warning`}
              py-2
            `}>
              <span className="text-sm">{notice}</span>
            </div>
          </div>
        )}

        {searching && (
          <motion.div className="mt-3" {...privateChatPanelMotionProps}>
            {searchUserInfo
              ? (
                  <div className="
                    flex items-center justify-between rounded-md bg-base-200/40
                    p-3
                  ">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 shrink-0">
                        <UserAvatarByUser
                          user={searchUserInfo}
                          fallbackUserId={searchUserInfo?.userId}
                          width={9}
                          isRounded={true}
                          stopToastWindow={true}
                          clickEnterProfilePage={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate text-sm">{searchUserInfo?.username}</div>
                        <div className="text-xs opacity-70">{searchUserInfo?.userId}</div>
                      </div>
                      {friendCheck?.statusDesc && <span className="
                        badge badge-ghost badge-sm
                      ">{friendCheck.statusDesc}</span>}
                    </div>

                    {!friendCheck?.isFriend && friendCheck?.status !== 3 && (
                      <div className="flex items-center gap-2">
                        <label htmlFor={`friend-verify-${searchUserInfo.userId}`} className="
                          sr-only
                        ">验证信息</label>
                        <input
                          id={`friend-verify-${searchUserInfo.userId}`}
                          type="text"
                          name={`friendVerify-${searchUserInfo.userId}`}
                          autoComplete="off"
                          className="input input-xs input-bordered w-32"
                          placeholder="验证信息"
                          value={verifyMsg}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setVerifyMsg(e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-xs btn-info"
                          disabled={
                            sendFriendRequestMutation.isPending
                            || !searchUserInfo?.userId
                            || friendCheckQuery.isLoading
                            || friendCheck?.status === 1
                            || !verifyMsg.trim()
                          }
                          onClick={() => {
                            if (!searchUserInfo?.userId)
                              return;
                            const trimmed = verifyMsg.trim();
                            if (!trimmed) {
                              showNotice("请填写验证信息", "warning");
                              return;
                            }
                            sendFriendRequestMutation.mutate(
                              { targetUserId: searchUserInfo.userId, verifyMsg: trimmed },
                              {
                                onSuccess: () => showNotice("好友申请已发送", "success"),
                                onError: error => showNotice(getErrorMessage(error) || "发送失败", "warning"),
                              },
                            );
                          }}
                        >
                          {friendCheck?.status === 1 ? "已申请" : "发送申请"}
                        </button>
                      </div>
                    )}
                    {friendCheck?.status === 3 && <span className="
                      text-xs opacity-60
                    ">已拉黑，无法申请</span>}
                  </div>
                )
              : (
                  <div className="
                    flex flex-col items-center justify-center h-16 gap-1
                    text-base-content/50
                  ">
                    <span className="text-sm">未找到用户</span>
                    <span className="text-xs">请检查ID或用户名是否正确</span>
                  </div>
                )}
          </motion.div>
        )}
      </div>

      {/* 待处理好友请求 */}
      <div className="
        px-4 pt-4 pb-2 border-t border-base-300
        dark:border-base-300
        mt-2
      ">
        <div className="text-sm font-semibold mb-2">
          待处理请求 -
          {" "}
          {pendingReceivedRequests.length}
        </div>

        {pendingReceivedRequests.length === 0
          ? (
              <div className="
                flex flex-col items-center justify-center h-24 gap-1.5
                text-base-content/50
              ">
                <span className="text-sm">暂无待处理好友申请</span>
                <span className="text-xs">收到新的好友请求时将在此显示</span>
              </div>
            )
          : (
              <div className="flex flex-col gap-2">
                {pendingReceivedRequests.map((req: any, index: number) => {
                  const user = req.fromUser;
                  return (
                    <motion.div
                      key={req.id}
                      className="
                        flex items-center justify-between p-3 rounded-md
                        bg-base-200/40
                      "
                      {...privateChatListItemMotionProps(index)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 shrink-0">
                          <UserAvatarByUser
                            user={user}
                            fallbackUserId={user?.userId}
                            width={9}
                            isRounded={true}
                            stopToastWindow={true}
                            clickEnterProfilePage={false}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate text-sm">{user?.username}</div>
                          <div className="text-xs opacity-70 truncate">
                            {user?.userId}
                            {req.verifyMsg ? ` · ${req.verifyMsg}` : ""}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-xs btn-info"
                          disabled={acceptFriendRequestMutation.isPending || !req.id}
                          onClick={() => req.id && acceptFriendRequestMutation.mutate({ friendReqId: req.id })}
                        >
                          同意
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs"
                          disabled={rejectFriendRequestMutation.isPending || !req.id}
                          onClick={() => req.id && rejectFriendRequestMutation.mutate({ friendReqId: req.id })}
                        >
                          拒绝
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
}
