import CommunityPostDetail from "@/components/community/communitPostDetail";
import { useParams } from "react-router";

export function meta() {
  return [
    { title: "帖子详情 - tuan-chat" },
    { name: "description", content: "查看帖子详情页面" },
  ];
}

export default function PostDetail() {
  const { postId } = useParams();
  const postIdNumber = postId ? Number(postId) : undefined;

  if (!postIdNumber || Number.isNaN(postIdNumber)) {
    return (
      <div className="h-full bg-base-200 overflow-auto flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">帖子不存在</h1>
          <p className="text-base-content/60">您访问的帖子可能已被删除或不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-base-200 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CommunityPostDetail postId={postIdNumber} />
      </div>
    </div>
  );
}
