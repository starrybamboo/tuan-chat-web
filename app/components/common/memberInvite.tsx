import { useGetUserInfoQuery } from "api/queryHooks";

interface MemberInviteProps {
  userId: number;
}

export default function MemberInviteComponent({ userId }: MemberInviteProps) {
  const userQuery = useGetUserInfoQuery(userId);
  const userInfo = userQuery.data?.data;

  return (
    <div className="flex items-center gap-2">
      <img
        src={userInfo?.avatar}
        alt="Avatar"
        className="w-8 h-8 rounded-full"
      />
      <span className="text-sm font-medium">
        {userInfo?.username}
      </span>
    </div>
  );
}
