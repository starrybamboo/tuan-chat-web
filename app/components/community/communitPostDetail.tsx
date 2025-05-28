import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGetPostDetailQuery } from "../../../api/hooks/communityQueryHooks";

export default function CommunityPostDetail({ postId }: { postId: number }) {
  const postDetailQuery = useGetPostDetailQuery(postId);
  const post = postDetailQuery.data?.data;
  return (
    <div className="gap-4">
      <h2 className="text-2xl font-semibold text-center">
        {post?.title || "无标题"}
        <div className="text-sm text-gray-500">
          发布于
          {" "}
          {new Date(post?.createTime ?? "").toLocaleString()}
        </div>
      </h2>
      <div className="bg-base-100 rounded-lg p-6 w-full gap-10">
        <div className="flex flex-row items-center gap-2">
          <UserAvatarComponent userId={post?.userId ?? -1} width={10} isRounded={true} withName={true}></UserAvatarComponent>
        </div>
        <MarkDownViewer content={post?.content ?? ""}></MarkDownViewer>
      </div>
    </div>
  );
}
