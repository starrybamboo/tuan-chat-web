import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

import type { StoredPost } from "@/components/community/postEditor";

import { usePublishPostMutation } from "../../../api/hooks/communityQueryHooks";

/**
 * 社区帖子发布的业务逻辑Hook
 */
export function useCommunityPostPublish(messageId?: number) {
  const [isPublishing, setIsPublishing] = useState(false);
  const navigate = useNavigate();
  const publishPostMutation = usePublishPostMutation();

  const publishPost = async (post: StoredPost & { selectedCommunityId?: number }) => {
    const { title, content, coverImage, selectedCommunityId } = post;

    // 验证必填字段
    if (!title?.trim() || !content?.trim()) {
      toast.error("标题和内容不能为空");
      return false;
    }

    if (!selectedCommunityId) {
      toast.error("请选择一个社区");
      return false;
    }

    setIsPublishing(true);

    try {
      await publishPostMutation.mutateAsync({
        communityId: selectedCommunityId,
        title: title.trim(),
        content: content.trim(),
        coverImage, // 封面图片URL
        messageId, // 转发的消息ID
      });

      toast.success("帖子发布成功！");

      // 发布成功后导航到目标社区
      setTimeout(() => {
        navigate(`/community/${selectedCommunityId}`);
      }, 1000);

      return true;
    }
    catch (error) {
      console.error("发布帖子失败:", error);
      toast.error(`发布帖子失败: ${error}`);
      return false;
    }
    finally {
      setIsPublishing(false);
    }
  };

  return {
    publishPost,
    isPublishing,
    isLoading: publishPostMutation.isPending,
  };
}
