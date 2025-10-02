import { useState } from "react";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

import { useGetUserFollowersQuery, useGetUserFollowingsQuery } from "../../../../../api/hooks/userFollowQueryHooks";

export function useFollowData(userId: number) {
  const [isFFWindowOpen, setIsFFWindowOpen] = useSearchParamsState<boolean>(`userEditPop${userId}`, false);
  const [relationTab, setRelationTab] = useState<"following" | "followers">("following");

  const followingsQuery = useGetUserFollowingsQuery(userId, {
    pageNo: 1,
    pageSize: 16,
  });

  const followersQuery = useGetUserFollowersQuery(userId, {
    pageNo: 1,
    pageSize: 16,
  });

  const followStats = {
    following: followingsQuery.data?.data?.totalRecords || 0,
    followers: followersQuery.data?.data?.totalRecords || 0,
  };

  const handleFollowingClick = () => {
    setRelationTab("following");
    setIsFFWindowOpen(true);
  };

  const handleFollowersClick = () => {
    setRelationTab("followers");
    setIsFFWindowOpen(true);
  };

  const closeFollowWindow = () => {
    setIsFFWindowOpen(false);
    followingsQuery.refetch();
    followersQuery.refetch();
  };

  return {
    // 弹窗状态
    isFFWindowOpen,
    relationTab,

    // 统计数据
    followStats,

    // 操作函数
    handleFollowingClick,
    handleFollowersClick,
    closeFollowWindow,
  };
}
