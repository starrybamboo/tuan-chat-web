import { useNavigate, useParams } from "react-router";
import CommunityPostDetail from "@/components/community/communitPostDetail";
import { useGetCommunityInfoQuery } from "../../api/hooks/communityQueryHooks";

export function meta() {
  return [
    { title: "帖子详情 - tuan-chat" },
    { name: "description", content: "查看社区帖子详情页面" },
  ];
}

export default function CommunityPostDetailPage() {
  const { communityId, postId } = useParams();
  const navigate = useNavigate();
  const postIdNumber = postId ? Number(postId) : undefined;
  const communityIdNumber = communityId ? Number(communityId) : undefined;

  // 检查社区是否存在和可访问
  const communityInfoQuery = useGetCommunityInfoQuery(communityIdNumber ?? -1);
  const community = communityInfoQuery.data?.data;
  const isCommunityLoading = communityInfoQuery.isLoading;
  const isCommunityError = communityInfoQuery.isError;

  // 检查参数有效性
  if (!postIdNumber || Number.isNaN(postIdNumber) || !communityIdNumber || Number.isNaN(communityIdNumber)) {
    return (
      <div className="h-full bg-base-200 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">帖子不存在</h1>
          <p className="text-base-content/60">您访问的帖子可能已被删除或不存在</p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => navigate("/")}
          >
            回到首页
          </button>
        </div>
      </div>
    );
  }

  // 社区加载中
  if (isCommunityLoading) {
    return (
      <div className="h-full bg-base-200 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg mb-4"></span>
          <p className="text-base-content/60">正在加载社区信息...</p>
        </div>
      </div>
    );
  }

  // 社区不存在或被封禁
  if (isCommunityError || !community) {
    return (
      <div className="h-full bg-base-200 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">社区不可访问</h1>
          <p className="text-base-content/60">该社区可能已被封禁、删除或不存在</p>
          <div className="flex gap-4 justify-center mt-6">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/")}
            >
              回到首页
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate("/community")}
            >
              浏览其他社区
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 返回上一页即可
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-full bg-base-200 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <CommunityPostDetail postId={postIdNumber} onBack={handleBack} />
      </div>
    </div>
  );
}
