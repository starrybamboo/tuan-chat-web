import type { CommunityContextType } from "@/components/community/communityContext";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityList from "@/components/community/communityList";
import CommunityPostList from "@/components/community/communityPostList";
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useListCommunitiesQuery } from "../../../api/hooks/communityQueryHooks";

/**
 * 社区界面
 */
export default function CommunityPage() {
  const { communityId: urlCommunityId } = useParams();
  const navigate = useNavigate();
  const communityId = Number(urlCommunityId);

  // 获取社区列表和当前社区信息
  const listCommunitiesQuery = useListCommunitiesQuery();
  const communityList = useMemo(() => {
    return listCommunitiesQuery.data?.data ?? [];
  }, [listCommunitiesQuery.data?.data]);

  const communityContext: CommunityContextType = useMemo(() => {
    return { communityId };
  }, [communityId]);

  // 处理帖子点击，导航到帖子详情页
  const handlePostClick = (postId: number) => {
    navigate(`/community/${communityId}/post/${postId}`);
  };

  return (
    <CommunityContext value={communityContext}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* 顶部社区列表 */}
        <CommunityList
          communityList={communityList}
          currentCommunityId={communityId}
          isLoading={listCommunitiesQuery.isLoading}
        />

        {/* 帖子列表 */}
        <div className="flex-1 min-w-0">
          <CommunityPostList onPostClick={handlePostClick} />
        </div>
      </div>
    </CommunityContext>
  );
}
