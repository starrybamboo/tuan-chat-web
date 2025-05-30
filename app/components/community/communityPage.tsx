import type { CommunityContextType } from "@/components/community/communityContext";
import CommunityPostDetail from "@/components/community/communitPostDetail";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityPostList from "@/components/community/communityPostList";
import React, { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useListCommunitiesQuery } from "../../../api/hooks/communityQueryHooks";

export default function CommunityPage() {
  const { communityId: urlCommunityId, postId: urlPostId } = useParams();
  const communityId = Number(urlCommunityId);
  const postId = Number(urlPostId);

  // 获取社区列表和当前社区信息
  const listCommunitiesQuery = useListCommunitiesQuery();
  const communityList = listCommunitiesQuery.data?.data ?? [];

  const communityContext: CommunityContextType = useMemo(() => {
    return { communityId };
  }, [communityId]);

  if (!communityList.find(community => community.communityId === communityId)) {
    return <div className="">该社区不存在</div>;
  }

  return (
    <CommunityContext value={communityContext}>
      <div className="flex mx-auto p-5">
        {/* 侧边栏 */}
        <div className="w-[20%]  mr-6 bg-base-100 rounded-lg shadow p-4 card h-max">
          <h2 className="text-lg font-semibold mb-4">选择社区</h2>
          <ul className="space-y-2">
            {communityList.map(community => (
              <li key={community.communityId}>
                <Link
                  to={`/community/${community.communityId}`}
                  className={`flex items-center p-2 rounded-md bg-base-100 hover:bg-base-300 duration-150 hover:shadow-lg hover:-translate-y-0.5 
                  ${community.communityId === communityId ? "bg-info/30" : ""}`}
                >
                  <img
                    src={community.avatar}
                    alt={community.name}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <span>{community.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {/* 原有内容 */}
        <div className="flex-1">
          {
            postId
              ? <CommunityPostDetail postId={postId}></CommunityPostDetail>
              : <CommunityPostList></CommunityPostList>
          }
        </div>
      </div>
    </CommunityContext>
  );
}
