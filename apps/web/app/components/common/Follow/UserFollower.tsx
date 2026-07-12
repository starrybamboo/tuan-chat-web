import { useMemo, useState } from "react";

import { Button } from "@/components/common/Button";
import { ControlGroup } from "@/components/common/ControlGroup";
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
      <div className="
        grid grid-cols-2
        sm:grid-cols-3
        md:grid-cols-4
        gap-4 justify-items-center
      ">
        {userList.map(user => (
          user.userId && <UserCard key={user.userId} user={user} />
        ))}
      </div>
      <ControlGroup className="mt-4 justify-center" aria-label="关注列表分页">
        <Button
          type="button"
          onClick={handlePrevPage}
          disabled={pageState.current <= 1}
          aria-label="上一页"
          title={pageState.current <= 1 ? "已经是第一页" : "上一页"}
        >
          «
        </Button>
        <Button
          type="button"
          aria-current="page"
        >
          第
          {" "}
          {pageState.current}
          {" "}
          页
        </Button>
        <Button
          type="button"
          onClick={handleNextPage}
          disabled={Boolean(currentQuery.data?.data?.isLast)}
          aria-label="下一页"
          title={currentQuery.data?.data?.isLast ? "已经是最后一页" : "下一页"}
        >
          »
        </Button>
      </ControlGroup>
    </div>
  );
}
