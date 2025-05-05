import { useGetUserInfoQuery } from "../../../../api/queryHooks";

interface UserCardProps {
  userId: number;
  status?: number; // 将 status 设为可选属性，因为可能不是所有场景都需要
}

export function UserCard({ userId, status = 0 }: UserCardProps) { // 为 status 提供默认值
  const userInfoQuery = useGetUserInfoQuery(userId);
  const userInfo = userInfoQuery.data?.data;

  return (
    <div className="card card-compact w-48 bg-base-100 shadow-xl">
      <div className="flex items-center p-4">
        <div className="avatar">
          <div className="w-12 rounded-full">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton w-12 h-12"></div>
                )
              : (
                  <img src={userInfo?.avatar || "/default-avatar.png"} alt={userInfo?.username} />
                )}
          </div>
        </div>
        <div className="ml-4 flex flex-col">
          <h3 className="text-lg font-semibold">
            {userInfoQuery.isLoading
              ? (
                  <div className="skeleton h-4 w-20"></div>
                )
              : (
                  userInfo?.username || "未知用户"
                )}
          </h3>
          <button type="button" className="btn btn-primary btn-sm mt-2">
            {status === 0 ? "关注" : status === 1 ? "已关注" : "互相关注"}
          </button>
        </div>
      </div>
    </div>
  );
}
