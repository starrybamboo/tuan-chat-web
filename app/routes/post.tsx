import CommunityPostDetail from "@/components/community/communitPostDetail";
import { useNavigate, useParams } from "react-router";
import { useGetPostDetailQuery } from "../../api/hooks/communityQueryHooks";

export function meta() {
  return [
    { title: "帖子详情 - tuan-chat" },
    { name: "description", content: "查看帖子详情页面" },
  ];
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const postIdNumber = postId ? Number(postId) : undefined;

  // 获取帖子详情以便获取社区信息
  const postDetailQuery = useGetPostDetailQuery(postIdNumber ?? -1);
  const post = postDetailQuery.data?.data;
  const communityId = post?.post?.communityId;

  if (!postIdNumber || Number.isNaN(postIdNumber)) {
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

  // 智能返回逻辑
  const handleBack = () => {
    // 如果能获取到社区ID，优先返回到所属社区
    if (communityId) {
      navigate(`/community/${communityId}`);
    }
    else {
      // 否则返回上一页，如果没有历史记录则回到首页
      if (window.history.length > 1) {
        navigate(-1);
      }
      else {
        navigate("/");
      }
    }
  };

  return (
    <div className="h-full bg-base-200 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CommunityPostDetail postId={postIdNumber} onBack={handleBack} />
      </div>
    </div>
  );
}
