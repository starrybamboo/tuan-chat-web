import type { StoredPost } from "@/components/community/postEditor";
import type { Route } from "./+types/home";
import PostEditor from "@/components/community/postEditor";
import React from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router";
import { usePublishPostMutation } from "../../api/hooks/communityQueryHooks";

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

  const publishPostMutation = usePublishPostMutation();

  const handlePublishPost = async (post: StoredPost & { selectedCommunityId?: number }) => {
    const { title, content, selectedCommunityId } = post;

    if (!title?.trim() || !content?.trim()) {
      return false;
    }

    if (!selectedCommunityId) {
      toast.error("请选择一个社区");
      return false;
    }

    try {
      await publishPostMutation.mutateAsync({
        communityId: selectedCommunityId,
        title: title.trim(),
        content: content.trim(),
        messageId, // 添加messageId参数
      });
      toast.success("帖子发布成功！");

      // 发布成功后导航到目标社区
      setTimeout(() => {
        navigate(`/community/${selectedCommunityId}`);
      }, 1000);

      return true;
    }
    catch (error) {
      toast.error(`发布帖子失败, ${error}`);
      return false;
    }
  };

  const handleClose = () => {
    // 关闭时导航到首页
    navigate("/");
  };

  return (
    <div className="h-full bg-base-200">
      <PostEditor
        onClose={handleClose}
        onSubmit={handlePublishPost}
        enableCommunitySelection={true}
        defaultCommunityId={undefined}
      />
    </div>
  );
}
