import { RoomContext } from "@/components/chat/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import UserAvatarComponent from "@/components/common/userAvatar";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useState } from "react";
import { useGetUserFollowingsQuery } from "../../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

export default function AddMemberWindow({ handleAddMember }: { handleAddMember: (userId: number) => void }) {
  const roomContext = use(RoomContext);
  const roomMembers = roomContext.roomMembers; // 用户已加进去的角色
  const globalContext = useGlobalContext();
  const followingQuery = useGetUserFollowingsQuery(globalContext.userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];
  const [inputUserId, setInputUserId] = useState<number>(-1);
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;
  const [addFromIdWindow, setAddFromIdWindow] = useSearchParamsState<boolean>(`addMemberPop`, false);

  return (
    <div className="space-y-6 p-4 overflow-auto max-h-[80vh]">
      {/* 好友列表 */}
      <div className="space-y-4 flex flex-col items-center">
        <h2 className="text-xl font-semibold">从好友列表添加</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-center w-max">
          {friends.map(friend => (
            friend.userId && (
              <div
                className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
                key={friend.userId}
                onClick={() => handleAddMember(friend.userId ?? -1)}
              >
                <div className="card-body items-center p-4">
                  <UserAvatarComponent
                    userId={friend.userId}
                    width={12}
                    isRounded={true}
                    withName={true}
                  />
                  {
                    roomMembers.find(member => member.userId === friend.userId)
                      ? (
                          <button
                            className="btn btn-sm btn-info mt-2"
                            type="button"
                            disabled={true}
                          >
                            已加入
                          </button>
                        )
                      : (
                          <button
                            className="btn btn-sm btn-info mt-2"
                            type="button"
                            onClick={() => handleAddMember(friend.userId ?? -1)}
                          >
                            添加
                          </button>
                        )
                  }
                </div>
              </div>
            )
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn btn-info" onClick={() => setAddFromIdWindow(true)} type="button">
          通过用户ID加入
        </button>
      </div>

      <PopWindow isOpen={addFromIdWindow} onClose={() => setAddFromIdWindow(false)}>
        <div className="max-w-md mx-auto space-y-4">
          <h3 className="text-lg font-semibold text-center">输入要加入的用户的ID</h3>
          <input
            type="number"
            placeholder="输入用户ID"
            className="input input-bordered w-full"
            min="1"
            onInput={e => setInputUserId(Number(e.currentTarget.value))}
          />

          {inputUserId > 0 && inputUserInfo && (
            <div className="card bg-base-100 shadow-md mt-4">
              <div className="card-body items-center text-center space-y-4">
                <UserDetail userId={inputUserId} size="compact" />
                <button
                  className="btn btn-info"
                  type="button"
                  onClick={() => handleAddMember(Number(inputUserId))}
                >
                  确认添加
                </button>
              </div>
            </div>
          )}
        </div>
      </PopWindow>
    </div>
  );
}
