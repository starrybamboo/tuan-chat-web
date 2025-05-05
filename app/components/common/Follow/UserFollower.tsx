import { useMemo, useState } from "react";
import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../../api/hooks/userFollowQueryHooks";
import { UserCard } from "./UserCard";

export function UserFollower({ activeTab, userId }: { activeTab: "following" | "followers"; userId: number }) {
  const [pageState, setPageState] = useState({
    current: 1,
    pageSize: 16,
  });

  const followingsQuery = useGetUserFollowingsQuery(userId, {
    pageNo: pageState.current,
    pageSize: pageState.pageSize,
  });

  const followersQuery = useGetUserFollowersQuery(userId, {
    pageNo: pageState.current,
    pageSize: pageState.pageSize,
  });

  const currentQuery = activeTab === "following" ? followingsQuery : followersQuery;
  const userList = useMemo(() => {
    return (currentQuery.data?.data?.list || []).filter(user => user.userId != null);
  }, [currentQuery.data]);

  // 添加页面控制函数
  const handlePrevPage = () => {
    if (pageState.current > 1) {
      setPageState(prev => ({ ...prev, current: prev.current - 1 }));
    }
  };

  const handleNextPage = () => {
    if (!currentQuery.data?.data?.isLast) {
      setPageState(prev => ({ ...prev, current: prev.current + 1 }));
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-bold">
        {activeTab === "following" ? "关注列表：" : "粉丝列表："}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
        {userList.map(user => (
          user.userId && <UserCard key={user.userId} userId={user.userId} initialStatus={user.status} />
        ))}
      </div>
      <div className="join mt-4 justify-center">
        <button
          type="button"
          className={`join-item btn ${pageState.current <= 1 ? "btn-disabled" : ""}`}
          onClick={handlePrevPage}
        >
          «
        </button>
        <button
          type="button"
          className="join-item btn"
        >
          第
          {" "}
          {pageState.current}
          {" "}
          页
        </button>
        <button
          type="button"
          className={`join-item btn ${currentQuery.data?.data?.isLast ? "btn-disabled" : ""}`}
          onClick={handleNextPage}
        >
          »
        </button>
      </div>
    </div>
  );
}
