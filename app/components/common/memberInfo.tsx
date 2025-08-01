import { useGetUserInfoQuery } from "api/queryHooks";

interface MemberInfoProps {
  userId: number;
}

export default function MemberInfoComponent({ userId }: MemberInfoProps) {
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
