import CommunityPostDetailComponent from "@/components/community/communitPostDetail";
import { Link, useNavigate, useParams } from "react-router";

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

  if (!postIdNumber || Number.isNaN(postIdNumber)) {
    return (
      <div className="h-full bg-base-200 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">帖子不存在</h1>
          <p className="text-base-content/60">您访问的帖子可能已被删除或不存在</p>
          {communityIdNumber && (
            <Link
              to={`/community/${communityIdNumber}`}
              className="btn btn-primary mt-4"
            >
              返回社区
            </Link>
          )}
        </div>
      </div>
    );
  }

  const handleBack = () => {
    if (communityIdNumber) {
      navigate(`/community/${communityIdNumber}`);
    }
    else {
      navigate(-1);
    }
  };

  return (
    <div className="h-full bg-base-200 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <CommunityPostDetailComponent
          postId={postIdNumber}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
