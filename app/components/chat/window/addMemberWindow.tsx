import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import UserAvatarComponent from "@/components/common/userAvatar";

import { use, useMemo, useState } from "react";

import { useGetSpaceMembersQuery, useSpaceInviteCodeQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetFriendListQuery } from "../../../../api/hooks/friendQueryHooks";

function MemberBox({ userId, onClickAddMember }: { userId: number; onClickAddMember: () => void }) {
  const roomContext = use(RoomContext);
  const roomMembers = roomContext.roomMembers;
  const canNotAdd = roomMembers.find((member: any) => member.userId === userId);
  return (
    <div
      className="card bg-base-100 shadow hover:shadow-lg transition-shadow cursor-pointer"
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

function MemberRow({ userId, onClickAddMember }: { userId: number; onClickAddMember: () => void }) {
  const roomContext = use(RoomContext);
  const roomMembers = roomContext.roomMembers;
  const canNotAdd = roomMembers.find((member: any) => member.userId === userId);
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <UserAvatarComponent
          userId={userId}
          width={10}
          isRounded={true}
          withName={true}
        />
      </div>
      {canNotAdd
        ? (
            <button
              className="btn btn-sm btn-ghost"
              type="button"
              disabled={true}
            >
              已加入
            </button>
          )
        : (
            <button
              className="btn btn-sm"
              type="button"
              onClick={onClickAddMember}
            >
              邀请
            </button>
          )}
    </div>
  );
}

/**
 * 添加成员窗口：同页展示邀请好友/按ID邀请、邀请链接（可选显示空间成员）。
 */
export default function AddMemberWindow({ handleAddMember, showSpace = false }:
{
  handleAddMember: (userId: number) => void;
  showSpace?: boolean;
}) {
  const spaceContext = use(SpaceContext);
  const spaceMembers = useGetSpaceMembersQuery(spaceContext.spaceId ?? -1).data?.data ?? [];
  const friendListQuery = useGetFriendListQuery({ pageNo: 1, pageSize: 100 });
  const friends = useMemo(() => {
    return friendListQuery.data?.data ?? [];
  }, [friendListQuery.data?.data]);

  // 当前选择的 duration
  const [duration, setDuration] = useState<number>(7);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingInvite, setIsEditingInvite] = useState<boolean>(false);
  const [editDurationDays, setEditDurationDays] = useState<number>(7);
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  // 仅按当前 duration 请求 invite code
  const invite = useSpaceInviteCodeQuery(spaceContext.spaceId ?? -1, duration);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const currentInviteLink = invite.data?.data ? `${origin}/invite/${invite.data.data}` : "生成中...";

  const filteredFriends = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw)
      return friends;
    return friends.filter((friend) => {
      const username = friend?.username;
      return typeof username === "string" && username.toLowerCase().includes(kw);
    });
  }, [friends, searchKeyword]);

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
      {/* 邀请好友 / 按ID邀请 */}
      <div className="bg-base-100 border border-base-300 rounded-box p-6">
        <h3 className="text-lg font-semibold mb-1">邀请成员</h3>
        <div className="text-sm opacity-80 mb-3">搜索好友并邀请加入</div>

        <div className="form-control mb-3">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="搜索好友"
            aria-label="搜索好友"
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.currentTarget.value);
            }}
          />
        </div>

        <div className="border border-base-300 rounded-lg bg-base-100 divide-y divide-base-300 max-h-80 overflow-auto">
          {filteredFriends.length > 0
            ? (
                filteredFriends.map(friend => (
                  friend.userId && (
                    <MemberRow
                      userId={friend.userId}
                      onClickAddMember={() => handleAddMember(friend.userId ?? -1)}
                      key={`friend-${friend.userId}`}
                    />
                  )
                ))
              )
            : (
                <div className="px-3 py-8 text-center text-sm opacity-70">
                  {searchKeyword.trim() && friendListQuery.isLoading ? "加载中..." : "未找到好友"}
                </div>
              )}
        </div>
      </div>

      {/* 从空间添加（可选） */}
      {showSpace && (
        <div className="bg-base-100 border border-base-300 rounded-box p-6">
          <h3 className="text-lg font-semibold mb-4">从空间添加</h3>
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
      )}

      {/* 生成邀请链接 */}
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="text-sm opacity-80 mb-3">或者，在其他应用里发送服务器邀请链接</div>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              aria-label="邀请链接"
              value={currentInviteLink}
              readOnly
              placeholder="生成中..."
            />
            <button
              type="button"
              className={`btn ${copied ? "btn-success" : "btn-info"}`}
              onClick={copyToClipboard}
              disabled={currentInviteLink === "生成中..."}
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm opacity-80">
            <div>
              您的邀请链接将在
              {duration}
              {" "}
              天后过期。
            </div>
            <button
              type="button"
              className="btn btn-link px-0 h-auto min-h-0"
              onClick={() => {
                setIsEditingInvite(true);
                setEditDurationDays(duration);
              }}
            >
              编辑邀请链接
            </button>
          </div>

          {isEditingInvite && (
            <div className="bg-base-100 border border-base-300 rounded-box p-3 flex flex-col sm:flex-row gap-2 items-center">
              <div className="text-sm w-full sm:w-auto">有效期（天）</div>
              <input
                type="number"
                className="input input-bordered w-full sm:w-40"
                placeholder="输入天数"
                aria-label="邀请链接有效期（天）"
                min={1}
                max={365}
                value={editDurationDays}
                onChange={e => setEditDurationDays(Number(e.currentTarget.value))}
              />
              <button
                type="button"
                className="btn btn-info w-full sm:w-auto"
                onClick={() => {
                  const next = Number.isFinite(editDurationDays) ? Math.floor(editDurationDays) : duration;
                  const clamped = Math.min(365, Math.max(1, next));
                  setDuration(clamped);
                  setCopied(false);
                  setIsEditingInvite(false);
                }}
              >
                完成
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
