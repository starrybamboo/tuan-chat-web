import type { FriendResponse } from "@tuanchat/openapi-client/models/FriendResponse";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import { MediaImage } from "@/components/common/mediaImage";
import { privateChatListItemMotionProps } from "@/components/common/motion/privateChatMotion";
import { SearchFilled, XMarkICon } from "@/icons";
import { imageLowUrl } from "@/utils/media/mediaUrl";
import { useGetFriendListQuery } from "api/hooks/friendQueryHooks";

export default function FriendsListPanel() {
  const { setActiveRoomId, setPrivateChatTab } = useChatPageLayoutContext();
  const [keyword, setKeyword] = useState("");
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
        <div className="
          border border-gray-200
          dark:border-gray-700/80
          flex h-8 items-center bg-base-200/60
          dark:bg-base-200/40
          rounded-md overflow-hidden
          focus-within:border-primary/60 focus-within:ring-2
          focus-within:ring-primary/20
        ">
          <div className="flex h-full items-center flex-1 px-2.5">
            <input
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
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape")
                  setKeyword("");
              }}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword("")}
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
            disabled={!keyword.trim()}
            aria-label="搜索"
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
              <div className="flex items-center justify-center h-32">
                <span className="loading loading-spinner loading-sm" />
                <span className="ml-2 text-xs text-base-content/60">加载好友列表...</span>
              </div>
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
                        onClick={() => friend?.userId && handleClickFriend(friend.userId)}
                      >
                        <div className="
                          avatar w-9 h-9 flex-shrink-0 overflow-hidden
                          rounded-full bg-base-300
                        ">
                          <MediaImage
                            className="h-full w-full rounded-full object-cover"
                            src={imageLowUrl(friend?.avatarFileId)}
                            alt=""
                            width={36}
                            height={36}
                            loading="lazy"
                            fallbackSrc="/favicon.ico"
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
