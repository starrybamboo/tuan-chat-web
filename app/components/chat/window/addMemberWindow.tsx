import { RoomContext } from "@/components/chat/roomContext";
import { SpaceContext } from "@/components/chat/spaceContext";
import UserAvatarComponent from "@/components/common/userAvatar";
import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import React, { use, useState } from "react";
import { useGetSpaceMembersQuery, useSpaceInviteCode } from "../../../../api/hooks/chatQueryHooks";
import { useGetUserFollowingsQuery } from "../../../../api/hooks/userFollowQueryHooks";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

function MemberBox({ userId, onClickAddMember }: { userId: number; onClickAddMember: () => void }) {
  const roomContext = use(RoomContext);
  const roomMembers = roomContext.roomMembers; // 用户已加进去的角色
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
 * @constructor
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

  // 邀请链接相关状态
  const [duration, setDuration] = useState<number>(7); // 默认7天
  const [copied, setCopied] = useState<boolean>(false);
  const inviteCode = useSpaceInviteCode(spaceContext.spaceId ?? -1, duration);

  // 生成完整邀请链接
  const inviteLink = inviteCode.data?.data
    ? `${window.location.origin}/invite/${inviteCode.data.data}`
    : "生成中...";

  // 复制链接到剪贴板
  const copyToClipboard = async () => {
    if (inviteLink && inviteLink !== "生成中...") {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      catch (err) {
        console.error("Failed to copy: ", err);
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
                >
                </MemberBox>
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
                      >
                      </MemberBox>
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
              value={inviteLink}
              readOnly
              placeholder="点击生成链接..."
            />
            <button
              type="button"
              className={`btn ${copied ? "btn-success" : "btn-info"}`}
              onClick={copyToClipboard}
              disabled={inviteLink === "生成中..."}
            >
              {copied ? "已复制!" : "复制链接"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
