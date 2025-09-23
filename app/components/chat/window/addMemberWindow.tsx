import { RoomContext } from "@/components/chat/roomContext";
import { SpaceContext } from "@/components/chat/spaceContext";
import UserAvatarComponent from "@/components/common/userAvatar";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useEffect, useMemo, useState } from "react";
import { useGetSpaceMembersQuery, useSpaceInviteCodeQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetUserFollowingsQuery } from "../../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

function MemberBox({ userId, onClickAddMember }: { userId: number; onClickAddMember: () => void }) {
  const roomContext = use(RoomContext);
  const roomMembers = roomContext.roomMembers;
  const canNotAdd = roomMembers.find(member => member.userId === userId);
  return (
    <div
      className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
      key={userId}
    >
      <div className="card-body items-center p-4">
        <UserAvatarComponent
          userId={userId}
          width={12}
          isRounded={true}
          withName={true}
        />
        {
          canNotAdd
            ? (
                <button
                  className="btn btn-sm btn-info mt-2 btn-ghost"
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
                  onClick={onClickAddMember}
                >
                  添加
                </button>
              )
        }
      </div>
    </div>
  );
}

/**
 *
 * @param handleAddMember
 * @param showSpace 设置为true后，显示一个面板，从空间中添加成员
 */
export default function AddMemberWindow({ handleAddMember, showSpace = false }:
{
  handleAddMember: (userId: number) => void;
  showSpace?: boolean;
}) {
  const spaceContext = use(SpaceContext);
  const spaceMembers = useGetSpaceMembersQuery(spaceContext.spaceId ?? -1).data?.data ?? [];
  const globalContext = useGlobalContext();
  const followingQuery = useGetUserFollowingsQuery(globalContext.userId ?? -1, { pageNo: 1, pageSize: 100 });
  const friends = followingQuery.data?.data?.list?.filter(user => user.status === 2) ?? [];
  const [inputUserId, setInputUserId] = useState<number>(-1);
  const inputUserInfo = useGetUserInfoQuery(inputUserId).data?.data;

  // 当前选择的 duration
  const [duration, setDuration] = useState<number>(7);
  const [copied, setCopied] = useState<boolean>(false);

  // 为每个 duration 分别请求 invite code
  const invite1 = useSpaceInviteCodeQuery(spaceContext.spaceId ?? -1, 1);
  const invite3 = useSpaceInviteCodeQuery(spaceContext.spaceId ?? -1, 3);
  const invite7 = useSpaceInviteCodeQuery(spaceContext.spaceId ?? -1, 7);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // 根据当前选中 duration 取得展示的链接
  const currentInviteLink = useMemo(() => {
    const linkFor = (code: string | undefined) => (code ? `${origin}/invite/${code}` : "生成中...");
    if (duration === 1)
      return linkFor(invite1.data?.data);
    if (duration === 3)
      return linkFor(invite3.data?.data);
    return linkFor(invite7.data?.data);
  }, [duration, invite1.data?.data, invite3.data?.data, invite7.data?.data, origin]);

  // duration 变更时重置 copied
  useEffect(() => {
    setCopied(false);
  }, [duration]);

  const copyToClipboard = async () => {
    if (currentInviteLink && currentInviteLink !== "生成中...") {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(currentInviteLink);
          setCopied(true);
        }
        else {
          const tempInput = document.createElement("input");
          document.body.appendChild(tempInput);
          tempInput.value = currentInviteLink;
          tempInput.select();
          tempInput.setSelectionRange(0, 99999);

          const successful = document.execCommand("copy");
          if (successful) {
            setCopied(true);
          }
          else {
            throw new Error("复制失败");
          }

          document.body.removeChild(tempInput);
        }
        setTimeout(() => setCopied(false), 2000);
      }
      catch (err) {
        console.error("复制失败:", err);
      }
    }
  };

  return (
    <div className="space-y-6 bg-base-100 rounded-xl">
      <div className="tabs tabs-lift">
        {/* --- 从好友列表添加 --- */}
        <input type="radio" name="add_member_tabs" className="tab" aria-label="从好友添加" defaultChecked />
        <div className="tab-content bg-base-100 border-base-300 rounded-box p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
            {friends.map(friend => (
              friend.userId && (
                <MemberBox
                  userId={friend.userId}
                  onClickAddMember={() => handleAddMember(friend.userId ?? -1)}
                  key={`friend-${friend.userId}`}
                />
              )
            ))}
          </div>
        </div>

        {/* --- 从空间添加 --- */}
        {
          showSpace && (
            <>
              <input type="radio" name="add_member_tabs" className="tab" aria-label="从空间添加" />
              <div className="tab-content bg-base-100 border-base-300 rounded-box p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
                  {spaceMembers.map(member => (
                    member.userId && (
                      <MemberBox
                        userId={member.userId}
                        onClickAddMember={() => handleAddMember(member.userId ?? -1)}
                        key={`space-${member.userId}`}
                      />
                    )
                  ))}
                </div>
              </div>
            </>
          )
        }

        {/* --- 搜索ID添加 --- */}
        <input type="radio" name="add_member_tabs" className="tab" aria-label="搜索ID添加" />
        <div className="tab-content bg-base-100 border-base-300 rounded-box p-6">
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-lg font-semibold text-center">按用户 ID 搜索</h3>
            <div className="form-control">
              <input
                type="number"
                placeholder="输入用户ID..."
                className="input input-bordered w-full"
                min="1"
                onInput={e => setInputUserId(Number(e.currentTarget.value))}
              />
            </div>

            {inputUserId > 0 && inputUserInfo && (
              <div className="card bg-base-200 shadow-md mt-4">
                <div className="card-body items-center text-center space-y-4">
                  <UserDetail userId={inputUserId} />
                  <div className="card-actions justify-end w-full">
                    <button
                      className="btn btn-info w-full"
                      type="button"
                      onClick={() => handleAddMember(Number(inputUserId))}
                    >
                      确认添加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 邀请链接部分 */}
      {!showSpace
        && (
          <div className="bg-base-200 p-4 rounded-lg ">
            <h3 className="text-lg font-semibold mb-3">生成邀请链接（邀请的用户默认为观战）</h3>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="join">
                <button
                  type="button"
                  className={`join-item btn ${duration === 1 ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setDuration(1)}
                >
                  1天
                </button>
                <button
                  type="button"
                  className={`join-item btn ${duration === 3 ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setDuration(3)}
                >
                  3天
                </button>
                <button
                  type="button"
                  className={`join-item btn ${duration === 7 ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setDuration(7)}
                >
                  7天
                </button>
              </div>

              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={currentInviteLink}
                  readOnly
                  placeholder="点击生成链接..."
                />
                <button
                  type="button"
                  className={`btn ${copied ? "btn-success" : "btn-info"}`}
                  onClick={copyToClipboard}
                  disabled={currentInviteLink === "生成中..."}
                >
                  {copied ? "已复制!" : "复制链接"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
