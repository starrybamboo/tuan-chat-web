import type { CommunityContextType } from "@/components/community/communityContext";
import CommunityPostDetail from "@/components/community/communitPostDetail";
import { CommunityContext } from "@/components/community/communityContext";
import CommunityPostList from "@/components/community/communityPostList";
import { useMemo } from "react";
import { useParams } from "react-router";
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
    return <div className="p-4 text-red-500">该社区不存在</div>;
  }

  return (
    <CommunityContext value={communityContext}>
      <div className="max-w-4xl mx-auto p-5">
        {
          postId
            ? <CommunityPostDetail postId={postId}></CommunityPostDetail>
            : (
                <CommunityPostList></CommunityPostList>
              )
        }
      </div>

    </CommunityContext>
  );
}
