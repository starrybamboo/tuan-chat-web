import type { CommunityContextType } from "@/components/community/communityContext";
import CommunityPostDetail from "@/components/community/communitPostDetail";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityPostList from "@/components/community/communityPostList";
import { UsersIcon } from "@/icons";
import React, { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useListCommunitiesQuery } from "../../../api/hooks/communityQueryHooks";

/**
 * 社区界面
 */
export default function CommunityPage() {
  const { communityId: urlCommunityId, postId: urlPostId } = useParams();
  const communityId = Number(urlCommunityId);
  const postId = urlPostId ? Number(urlPostId) : undefined;

  // 获取社区列表和当前社区信息
  const listCommunitiesQuery = useListCommunitiesQuery();
  const communityList = listCommunitiesQuery.data?.data ?? [];

  const communityContext: CommunityContextType = useMemo(() => {
    return { communityId };
  }, [communityId]);

  if (listCommunitiesQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg "></span>
      </div>
    );
  }

  return (
    <CommunityContext value={communityContext}>
      <div className="flex flex-col md:flex-row gap-6 mx-auto p-4 md:p-6">
        {/* 侧边栏 - 社区列表 */}
        <div className="w-full md:w-[20%]">
          <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 p-4 md:p-5">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-base-200">
              <UsersIcon className="h-5 w-5 text-info" />
              <h2 className="text-xl font-bold">社区列表</h2>
            </div>

            {communityList.length > 0
              ? (
                  <ul className="space-y-3">
                    {communityList.map(community => (
                      <li key={community.communityId}>
                        <Link
                          to={`/community/${community.communityId}`}
                          className={`flex items-center p-3 rounded-xl transition-all duration-200
                        ${
                      community.communityId === communityId
                        ? "bg-info/10 text-info border border-info/20 shadow-sm"
                        : "bg-base-100 hover:bg-base-200"
                      }`}
                        >
                          <div className="avatar">
                            <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center">
                              <img
                                src={community.avatar}
                                alt={community.name}
                                className="rounded-full w-full h-full object-cover"
                                onError={e => (e.currentTarget.style.display = "none")}
                              />
                            </div>
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="font-medium truncate">{community.name}</p>
                          </div>
                          {community.communityId === communityId && (
                            <div className="w-2 h-2 rounded-full bg-info ml-2"></div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )
              : (
                  <div className="py-4 text-center">
                    <p className="text-base-content/60">暂无社区</p>
                  </div>
                )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 min-w-0">
          {postId
            ? (
                <CommunityPostDetail postId={postId} />
              )
            : (
                <CommunityPostList />
              )}
        </div>
      </div>
    </CommunityContext>
  );
}
