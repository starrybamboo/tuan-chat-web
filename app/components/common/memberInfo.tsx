import { resolveUserDisplayName, useResolvedUserInfo } from "@/components/common/userAccess.shared";

interface MemberInfoProps {
  user: {
    userId?: number;
    username?: string;
    avatar?: string;
    avatarThumbUrl?: string;
  };
}

export default function MemberInfoComponent({ user }: MemberInfoProps) {
  const resolvedUser = useResolvedUserInfo(user, user.userId ?? -1);
  const avatarSrc = resolvedUser.avatarThumbUrl || resolvedUser.avatar || "";
  const displayName = resolveUserDisplayName({ username: resolvedUser.username }, resolvedUser.userId > 0 ? `用户${resolvedUser.userId}` : "未知用户");

  return (
    <div className="flex items-center gap-2">
      <img
        src={avatarSrc}
        alt="Avatar"
        className="w-8 h-8 rounded-full"
      />
      <span className="text-sm font-medium">
        {displayName}
      </span>
    </div>
  );
}
