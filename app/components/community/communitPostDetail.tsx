import CommentPanel from "@/components/common/comment/commentPanel";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import UserAvatarComponent from "@/components/common/userAvatar";
import React from "react";
import { useGetPostDetailQuery } from "../../../api/hooks/communityQueryHooks";

/**
 * 点开帖子后显示的界面，显示帖子详情
 * @param props - 组件属性
 * @param props.postId - 帖子ID
 * @param props.onBack - 返回回调函数，如果提供则显示返回按钮
 * @constructor
 */
export default function CommunityPostDetail({
  postId,
  onBack,
}: {
  postId: number;
  onBack?: () => void;
}) {
  const postDetailQuery = useGetPostDetailQuery(postId);
  const post = postDetailQuery.data?.data;

  return (
    <div className="gap-4 ">
      {/* 返回按钮 */}
      {onBack && (
        <div className="mb-4">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-ghost btn-sm gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-center">
        {post?.post?.title || "无标题"}
        <div className="text-sm text-gray-500">
          发布于
          {" "}
          {new Date(post?.post?.createTime ?? "").toLocaleString()}
        </div>
      </h2>
      <div className="bg-base-100 rounded-lg p-6 w-full card shadow-xl">
        <div className="flex flex-row items-center gap-2">
          <UserAvatarComponent userId={post?.post?.userId ?? -1} width={10} isRounded={true} withName={true}></UserAvatarComponent>
        </div>
        <MarkDownViewer content={post?.post?.content ?? ""}></MarkDownViewer>
      </div>
      <div className="bg-base-100 card shadow-xl p-4 mt-6 gap-4">
        <p className="text-xl font-semibold">评论</p>
        <CommentPanel targetInfo={{ targetType: "2", targetId: postId }}></CommentPanel>
      </div>

    </div>
  );
}
