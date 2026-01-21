import type { Route } from "./+types/communityCreatePost";
import React from "react";
import { useNavigate, useSearchParams } from "react-router";
import PostEditor from "@/components/community/postEditor";
import { useCommunityPostPublish } from "@/components/community/useCommunityPostPublish";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "创建帖子 - tuan-chat" },
    { name: "description", content: "在社区中创建新帖子" },
  ];
}

/**
 * 创建社区帖子页面
 */
export default function CommunityCreatePost() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 获取转发的消息ID
  const messageId = searchParams.get("messageId") ? Number(searchParams.get("messageId")) : undefined;

  // 使用自定义hook处理发布逻辑
  const { publishPost } = useCommunityPostPublish(messageId);

  const handleClose = () => {
    // 关闭时导航到首页
    navigate("/");
  };

  return (
    <div className="h-full bg-base-200">
      <PostEditor
        onClose={handleClose}
        onSubmit={publishPost}
        enableCommunitySelection={true}
        defaultCommunityId={undefined}
        messageId={messageId}
      />
    </div>
  );
}
