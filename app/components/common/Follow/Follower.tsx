// import type { PageBaseRespUserFollowResponse } from "../../../api/models/PageBaseRespUserFollowResponse";
import type { UserFollowResponse } from "../../../../api/models/UserFollowResponse";
import { useEffect, useState } from "react";
import { useGetUserFollowersMutation, useGetUserFollowingsMutation } from "../../../../api/hooks/userFollowQueryHooks";
import { UserCard } from "./UserCard";

export function UserFollower({ activeTab, userId }: { activeTab: "following" | "followers"; userId: number }) {
  const { mutate: FollowingsMutation } = useGetUserFollowingsMutation();
  const { mutate: FollowiersMutation } = useGetUserFollowersMutation();
  const [userList, setUserList] = useState<UserFollowResponse[]>([]);

  // 添加页面状态
  const [pageState, setPageState] = useState({
    current: 1,
    pageSize: 16,
    total: 0,
    isLast: false,
  });

  const getUserList = () => {
    const mutation = activeTab === "following" ? FollowingsMutation : FollowiersMutation;

    mutation({
      targetUserId: userId,
      requestBody: {
        pageNo: pageState.current,
        pageSize: pageState.pageSize,
      },
    }, {
      onSuccess: (response) => {
        setUserList(response.data?.list || []);
        setPageState(prev => ({
          ...prev,
          total: response.data?.totalRecords || 0,
          isLast: response.data?.isLast || false,
        }));
      },
    });
  };

  useEffect(() => {
    getUserList();
  }, []);

  // 添加页面控制函数
  const handlePrevPage = () => {
    if (pageState.current > 1) {
      setPageState(prev => ({ ...prev, current: prev.current - 1 }));
    }
  };

  const handleNextPage = () => {
    const maxPage = Math.ceil(pageState.total / pageState.pageSize);
    if (pageState.current < maxPage) {
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
          className={`join-item btn ${pageState.current >= Math.ceil(pageState.total / pageState.pageSize) ? "btn-disabled" : ""}`}
          onClick={handleNextPage}
        >
          »
        </button>
      </div>
    </div>
  );
}
