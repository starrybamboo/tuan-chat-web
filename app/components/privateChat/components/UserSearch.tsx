import type { UserFollowResponse } from "api/models/UserFollowResponse";
import { useGlobalContext } from "@/components/globalContextProvider";
import { HomeIcon, Search, XMarkICon } from "@/icons";
import { useGetFriendsUserInfoQuery } from "api/hooks/MessageDirectQueryHooks";
import { useGetUserFriendsQuery } from "api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export default function UserSearch() {
  /**
   * 搜索用户
   */
  const [inputUserId, setInputUserId] = useState<number>(-1);
  const [searchUserId, setSearchUserId] = useState<number>(-1);
  const [searching, setSearching] = useState(false);
  const globalContext = useGlobalContext();
  const userId = globalContext.userId || -1;
  const navigate = useNavigate();
  // 获取并缓存好友列表
  const followingQuery = useGetUserFriendsQuery(userId, { pageNo: 1, pageSize: 100 });
  const friends: UserFollowResponse[] = useMemo(() => Array.isArray(followingQuery.data?.data?.list) ? followingQuery.data.data.list : [], [followingQuery.data]);
  const friendUserQueries = useGetFriendsUserInfoQuery(friends.map(f => f.userId));
  const friendUserInfos = friendUserQueries.map(f => f.data?.data);

  const searchUserInfo = useGetUserInfoQuery(searchUserId).data?.data || null;

  function searchInputUserId() {
    if (inputUserId && inputUserId > 0) {
      setSearching(true);
      setSearchUserId(inputUserId);
    }
  }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      searchInputUserId();
    }
  };

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputUserId(Number.parseInt(e.target.value));
    if (!e.target.value) {
      setSearching(false);
    }
  }
  return (
    <>
      <div className="w-full px-2 pb-6 flex items-center justify-center relative">
        <input
          type="text"
          className="input input-md w-full"
          placeholder="输入用户ID，按 Enter 或搜索按钮"
          value={inputUserId > 0 ? inputUserId : ""}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <div
          className="absolute right-4 cursor-pointer w-8 h-8 flex items-center justify-center rounded-box hover:bg-base-300"
          onClick={searchInputUserId}
        >
          <Search className="size-5" />
        </div>
        <div
          className="absolute right-14 cursor-pointer w-8 h-8 flex items-center justify-center rounded-box hover:bg-base-300"
          onClick={() => {
            setInputUserId(-1);
            setSearching(false);
          }}
        >
          <XMarkICon className="size-5" />
        </div>
      </div>
      {searching
        ? (
            <div className="flex flex-col w-full">
              {searchUserInfo
                ? (
                    <div
                      key={searchUserInfo?.userId}
                      className="flex items-center justify-between cursor-pointer hover:bg-base-300 p-2 rounded-md border-t-2 border-base-300"
                      onClick={() => {
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
