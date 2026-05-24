import type { ReactNode } from "react";
import { MagnifyingGlassIcon, UserPlusIcon, UsersIcon } from "@phosphor-icons/react";
import { use, useMemo, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { CheckIcon, CopyIcon, InfoIcon, Link } from "@/icons";
import { useGetSpaceMembersQuery, useSpaceInviteCodeQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetFriendListQuery } from "../../../../api/hooks/friendQueryHooks";

interface MemberLike {
  userId?: number;
  username?: string;
  avatar?: string;
  avatarThumbUrl?: string;
}

interface AddMemberWindowProps {
  handleAddMember: (userId: number) => void;
  showSpace?: boolean;
  inviteCodeType?: 0 | 1;
  targetType?: "room" | "space";
  title?: string;
  subtitle?: string;
  embedded?: boolean;
  headerExtra?: ReactNode;
}

/**
 * 添加成员窗口：统一承载好友邀请、空间内添加和邀请链接。
 */
export default function AddMemberWindow({
  embedded = false,
  handleAddMember,
  headerExtra,
  inviteCodeType = 0,
  showSpace = false,
  subtitle,
  targetType = "room",
  title,
}: AddMemberWindowProps) {
  const spaceContext = use(SpaceContext);
  const roomContext = use(RoomContext);
  const roomMembers = roomContext.roomMembers ?? [];
  const spaceMembersQuery = useGetSpaceMembersQuery(spaceContext.spaceId ?? -1);
  const spaceMembers = spaceMembersQuery.data?.data ?? [];

  const [duration, setDuration] = useState<number>(7);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingInvite, setIsEditingInvite] = useState<boolean>(false);
  const [editDurationDays, setEditDurationDays] = useState<number>(7);
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const invite = useSpaceInviteCodeQuery(spaceContext.spaceId ?? -1, inviteCodeType, duration);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const currentInviteLink = invite.data?.data ? `${origin}/invite/${invite.data.data}` : "生成中...";
  const inviteRoleLabel = inviteCodeType === 1 ? "玩家" : "观战";
  const defaultTitle = targetType === "space" ? "邀请空间成员" : "邀请成员";
  const defaultSubtitle = targetType === "space"
    ? "通过好友列表或邀请链接把成员加入当前空间。"
    : "邀请好友加入当前房间，也可以从空间成员中快速添加。";

  const friendListQuery = useGetFriendListQuery({ pageNo: 1, pageSize: 100 });
  const friends = useMemo(() => friendListQuery.data?.data ?? [], [friendListQuery.data?.data]);
  const filteredFriends = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return friends;
    }
    return friends.filter((friend) => {
      const username = friend?.username;
      return typeof username === "string" && username.toLowerCase().includes(keyword);
    });
  }, [friends, searchKeyword]);

  const checkIsAdded = (userId: number) => {
    if (targetType === "space") {
      return spaceMembers.some(member => member.userId === userId);
    }
    return roomMembers.some(member => member.userId === userId);
  };

  const copyToClipboard = async () => {
    if (!currentInviteLink || currentInviteLink === "生成中...") {
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(currentInviteLink);
      }
      else {
        const tempInput = document.createElement("input");
        tempInput.value = currentInviteLink;
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999);
        const successful = document.execCommand("copy");
        document.body.removeChild(tempInput);
        if (!successful) {
          throw new Error("复制失败");
        }
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
    catch (err) {
      console.error("复制失败:", err);
    }
  };

  const inviteSettings = (
    <div className="space-y-4">
      <PanelSection
        icon={<Link className="size-5" />}
        title="邀请链接"
        description={`复制${inviteRoleLabel}邀请链接，在其他应用里发送。`}
      >
        <label className="mb-2 block text-xs font-medium text-base-content/60" htmlFor="invite-link-input">
          链接
        </label>
        <div className="flex flex-col gap-2">
          <input
            id="invite-link-input"
            type="text"
            className="input input-bordered min-w-0 bg-base-100 text-sm"
            aria-label="邀请链接"
            value={currentInviteLink}
            readOnly={true}
            placeholder="生成中..."
          />
          <button
            type="button"
            className={`btn w-full ${copied ? "btn-success" : "btn-primary"}`}
            onClick={() => {
              void copyToClipboard();
            }}
            disabled={currentInviteLink === "生成中..."}
          >
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            {copied ? "已复制" : "复制链接"}
          </button>
        </div>
      </PanelSection>

      <PanelSection
        icon={<InfoIcon className="size-5" />}
        title="有效期"
        description={`当前邀请链接将在 ${duration} 天后过期。`}
      >
        {isEditingInvite
          ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-base-content/60" htmlFor="invite-duration-input">
                  有效期（天）
                </label>
                <input
                  id="invite-duration-input"
                  type="number"
                  className="input input-bordered w-full bg-base-100"
                  placeholder="天数"
                  aria-label="邀请链接有效期（天）"
                  min={1}
                  max={365}
                  value={editDurationDays}
                  onChange={event => setEditDurationDays(Number(event.currentTarget.value))}
                />
                <button
                  type="button"
                  className="btn btn-primary w-full"
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
            )
          : (
              <button
                type="button"
                className="btn btn-outline w-full"
                onClick={() => {
                  setIsEditingInvite(true);
                  setEditDurationDays(duration);
                }}
              >
                编辑有效期
              </button>
            )}
      </PanelSection>
    </div>
  );

  const memberSelection = (
    <div className="flex h-full min-h-[460px] flex-col">
      <div className="hidden-scrollbar flex-1 space-y-5 overflow-y-auto py-5">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold leading-6">好友邀请</h4>
            <span className="text-xs text-base-content/45">
              {filteredFriends.length}
              {" "}
              人
            </span>
          </div>
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/45" />
            <input
              type="text"
              className="input input-bordered w-full bg-base-100 pl-9"
              placeholder="搜索好友"
              aria-label="搜索好友"
              value={searchKeyword}
              onChange={(event) => {
                setSearchKeyword(event.currentTarget.value);
              }}
            />
          </div>

          <div className="hidden-scrollbar max-h-[320px] overflow-y-auto rounded-lg border border-base-300/70 bg-base-100">
            {filteredFriends.length > 0
              ? (
                  filteredFriends.map(friend => (
                    typeof friend.userId === "number" && (
                      <MemberRow
                        key={`friend-${friend.userId}`}
                        user={friend}
                        actionText="邀请"
                        isAdded={checkIsAdded(friend.userId)}
                        onClickAddMember={() => handleAddMember(friend.userId ?? -1)}
                      />
                    )
                  ))
                )
              : (
                  <EmptyState>
                    {friendListQuery.isLoading ? "正在加载好友..." : "未找到匹配的好友"}
                  </EmptyState>
                )}
          </div>
        </section>

        {showSpace && (
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="size-4 text-primary" weight="regular" />
                <h4 className="text-sm font-semibold leading-6">从空间添加</h4>
              </div>
              <span className="text-xs text-base-content/45">
                {spaceMembers.length}
                {" "}
                人
              </span>
            </div>
            <div className="hidden-scrollbar grid max-h-[260px] gap-2 overflow-y-auto sm:grid-cols-2">
              {spaceMembers.length > 0
                ? (
                    spaceMembers.map(member => (
                      typeof member.userId === "number" && (
                        <MemberCard
                          key={`space-${member.userId}`}
                          user={member}
                          isAdded={checkIsAdded(member.userId)}
                          onClickAddMember={() => handleAddMember(member.userId ?? -1)}
                        />
                      )
                    ))
                  )
                : (
                    <div className="sm:col-span-2">
                      <EmptyState>{spaceMembersQuery.isLoading ? "正在加载空间成员..." : "暂无可添加的空间成员"}</EmptyState>
                    </div>
                  )}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return memberSelection;
  }

  return (
    <div className="flex max-h-[min(84vh,780px)] w-[min(1040px,calc(100vw-2rem))] flex-col overflow-hidden bg-base-100 text-base-content lg:grid lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="hidden-scrollbar flex shrink-0 flex-col overflow-y-auto border-b border-base-300/70 bg-base-200/45 p-5 pr-14 lg:min-h-0 lg:border-b-0 lg:border-r lg:p-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold leading-tight">{title ?? defaultTitle}</h2>
        </div>

        {headerExtra && <div className="mt-4">{headerExtra}</div>}

        <div className="mt-5">
          {inviteSettings}
        </div>
      </aside>

      <main className="hidden-scrollbar min-h-0 flex-1 overflow-y-auto bg-base-100 p-5 pr-14 lg:p-6 lg:pr-14">
        {memberSelection}
      </main>
    </div>
  );
}

function PanelSection({
  children,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-base-300/70 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200/55 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-6">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-base-content/60">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MemberRow({
  actionText,
  isAdded,
  onClickAddMember,
  user,
}: {
  actionText: string;
  isAdded: boolean;
  onClickAddMember: () => void;
  user: MemberLike;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-base-300/60 px-3 py-2.5 last:border-b-0 hover:bg-base-200/55">
      <MemberIdentity user={user} />
      {isAdded
        ? (
            <button className="btn btn-ghost btn-sm min-w-20" type="button" disabled={true}>
              已加入
            </button>
          )
        : (
            <button className="btn btn-primary btn-sm min-w-20" type="button" onClick={onClickAddMember}>
              {actionText}
            </button>
          )}
    </div>
  );
}

function MemberCard({
  isAdded,
  onClickAddMember,
  user,
}: {
  isAdded: boolean;
  onClickAddMember: () => void;
  user: MemberLike;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300/70 bg-base-200/30 px-3 py-3">
      <MemberIdentity user={user} />
      {isAdded
        ? (
            <button className="btn btn-ghost btn-sm min-w-20" type="button" disabled={true}>
              已加入
            </button>
          )
        : (
            <button className="btn btn-outline btn-sm min-w-20" type="button" onClick={onClickAddMember}>
              添加
            </button>
          )}
    </div>
  );
}

function MemberIdentity({ user }: { user: MemberLike }) {
  const username = user.username?.trim() || `用户 ${user.userId ?? ""}`.trim();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <UserAvatarByUser
        user={user}
        width={10}
        isRounded={true}
        stopToastWindow={true}
        clickEnterProfilePage={false}
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{username}</div>
        {typeof user.userId === "number" && (
          <div className="text-xs text-base-content/45">
            UID
            {" "}
            {user.userId}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 items-center justify-center px-3 py-8 text-center text-sm text-base-content/55">
      {children}
    </div>
  );
}
