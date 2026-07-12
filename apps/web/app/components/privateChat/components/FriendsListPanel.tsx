import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { motion } from "motion/react";
import { useMemo, useRef } from "react";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import { formControlShellClassName } from "@/components/common/FormField";
import { ImeAwareSearchInput, useImeSearchValue } from "@/components/common/imeAwareSearchInput";
import { privateChatListItemMotionProps } from "@/components/common/motion/privateChatMotion";
import { StateView } from "@/components/common/StateView";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { SearchFilled, XMarkICon } from "@/icons";
import { useGetFriendListQuery } from "api/hooks/friendQueryHooks";

export default function FriendsListPanel() {
  const { setActiveRoomId, setPrivateChatTab } = useChatPageLayoutContext();
  const { clear: clearKeyword, committedValue: keyword, inputProps, inputValue } = useImeSearchValue();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const friendListQuery = useGetFriendListQuery({ pageNo: 1, pageSize: 100 });
  const friendUserInfos: FriendResponse[] = useMemo(
    () => (Array.isArray(friendListQuery.data?.data) ? friendListQuery.data.data : []),
    [friendListQuery.data],
  );

  const filteredFriends = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k)
      return friendUserInfos;
    return friendUserInfos.filter((f) => {
      const name = `${f?.username ?? ""}`.toLowerCase();
      const id = `${f?.userId ?? ""}`;
      return name.includes(k) || id.includes(k);
    });
  }, [keyword, friendUserInfos]);

  function handleClickFriend(userId: number) {
    setActiveRoomId(userId);
    setPrivateChatTab("chat");
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-3 pt-3 pb-2">
        <label htmlFor="private-friend-search" className="sr-only">搜索好友</label>
        <div className={formControlShellClassName({
          surface: "muted",
          className: "h-8 overflow-hidden bg-base-200/60 dark:bg-base-200/40",
        })}>
          <div className="flex h-full items-center flex-1 px-2.5">
            <ImeAwareSearchInput
              appearance="bare"
              id="private-friend-search"
              ref={searchInputRef}
              type="text"
              name="privateFriendSearch"
              autoComplete="off"
              placeholder="搜索好友…"
              className="
                bg-transparent border-none outline-none flex-1 text-sm
                placeholder:text-base-content/50
              "
              {...inputProps}
              onEscape={clearKeyword}
            />
            {inputValue && (
              <button
                type="button"
                onClick={clearKeyword}
                className="
                  flex items-center justify-center text-base-content/50
                  hover:text-base-content
                  transition-colors ml-1
                "
                aria-label="清空"
              >
                <XMarkICon className="size-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            className="
              h-full px-2.5 flex items-center justify-center
              text-base-content/50
              hover:text-info hover:bg-base-300/60
              transition-colors
            "
            aria-label="聚焦好友搜索框"
            title="聚焦好友搜索框"
            onClick={() => searchInputRef.current?.focus()}
          >
            <SearchFilled className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="
        px-3 pb-1.5 text-xs font-medium text-base-content/50 uppercase
        tracking-wide
      ">
        好友 —
        {" "}
        {friendUserInfos.length}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-1">
        {friendListQuery.isLoading
          ? (
              <StateView loading title="加载好友列表..." className="h-32 py-0" />
            )
          : filteredFriends.length === 0
            ? (
                <div className="
                  flex flex-col items-center justify-center h-32 gap-2
                  text-base-content/50
                ">
                  <span className="text-sm">{keyword ? "未找到匹配好友" : "暂无好友"}</span>
                  {!keyword && (
                    <span className="text-xs">添加好友后将在此显示</span>
                  )}
                </div>
              )
            : (
                <div className="flex flex-col gap-0.5">
                  {filteredFriends.map((friend, index) => (
                    <motion.div
                      key={friend?.userId || index}
                      {...privateChatListItemMotionProps(index)}
                    >
                      <button
                        type="button"
                        className="
                          w-full text-left flex items-center gap-3
                          hover:bg-base-200/60
                          dark:hover:bg-base-300/20
                          rounded-lg px-2 py-1.5 cursor-pointer
                          transition-colors duration-150
                        "
                        aria-label={`打开与 ${friend?.username || `用户${friend?.userId}`}（ID ${friend?.userId ?? "未知"}）的私聊`}
                        onClick={() => friend?.userId && handleClickFriend(friend.userId)}
                      >
                        <div className="w-9 h-9 flex-shrink-0">
                          <UserAvatarByUser
                            user={friend}
                            fallbackUserId={friend?.userId}
                            width={9}
                            isRounded={true}
                            stopToastWindow={true}
                            clickEnterProfilePage={false}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate text-sm">
                            {friend?.username || `用户${friend?.userId}`}
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
      </div>
    </div>
  );
}
