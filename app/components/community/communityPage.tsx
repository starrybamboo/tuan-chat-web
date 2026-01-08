import type { CommunityContextType } from "@/components/community/communityContext";
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import IllegalURLPage from "@/components/common/illegalURLPage";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityList from "@/components/community/communityList";
import CommunityPostList from "@/components/community/communityPostList";
import {
  useGetCommunityInfoQuery,
  useListCommunitiesQuery,
} from "../../../api/hooks/communityQueryHooks";

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

  // 获取当前社区详细信息
  const getCommunityInfoQuery = useGetCommunityInfoQuery(communityId);
  const currentCommunity = useMemo(() => {
    return getCommunityInfoQuery.data?.data;
  }, [getCommunityInfoQuery.data?.data]);

  const communityContext: CommunityContextType = useMemo(() => {
    return { communityId };
  }, [communityId]);

  // 处理帖子点击，导航到帖子详情页
  const handlePostClick = (postId: number) => {
    navigate(`/community/${communityId}/${postId}`);
  };

  // 处理创建帖子按钮点击
  const handleCreatePost = () => {
    navigate(`/community/create`);
  };

  if (Number.isNaN(communityId)) {
    return (<IllegalURLPage info="您所找的社区不存在" />);
  }

  return (
    <CommunityContext value={communityContext}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        {/* 顶部社区列表 */}
        <CommunityList
          communityList={communityList}
          currentCommunityId={communityId}
          isLoading={listCommunitiesQuery.isLoading}
        />

        {/* 社区描述和发帖按钮 */}
        <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto w-full lg:max-w-3xl">
          <div className="flex-1">
            {getCommunityInfoQuery.isLoading
              ? (
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span className="text-base-content/60">加载中...</span>
                  </div>
                )
              : currentCommunity?.description
                ? (
                    <h2 className="text-2xl font-bold text-base-content">{currentCommunity.description}</h2>
                  )
                : (
                    <h2 className="text-2xl font-bold text-base-content">社区帖子</h2>
                  )}
          </div>
          {/* 桌面端发帖按钮 */}
          <button
            type="button"
            className="hidden md:flex btn btn-info gap-2 shadow-lg hover:shadow/30"
            onClick={handleCreatePost}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            发布新帖
          </button>
        </div>

        {/* 帖子列表 */}
        <div className="flex-1 min-w-0">
          <CommunityPostList onPostClick={handlePostClick} />
        </div>

        {/* 移动端浮动创作按钮 */}
        <button
          type="button"
          className="md:hidden fixed bottom-8 right-8 z-50 btn btn-square btn-neutral btn-lg shadow-2xl transition-all duration-300"
          onClick={handleCreatePost}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </CommunityContext>
  );
}
