import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
import React, { useEffect, useState } from "react";
import { useListCommunitiesQuery } from "../../../api/hooks/communityQueryHooks";

export interface StoredPost {
  title?: string;
  content?: string;
  selectedCommunityId?: number;
}

interface PostEditorProps {
  onClose?: () => void;
  onSubmit: (post: StoredPost) => Promise<boolean>;
  enableCommunitySelection?: boolean; // 是否启用社区选择
  defaultCommunityId?: number; // 默认社区ID
}

/**
 * 帖子编辑器，也就是一个markdown编辑器
 * @param props 组件属性
 * @param props.onClose 关闭窗口的时候的回调函数
 * @param props.onSubmit 提交按钮的回调函数，异步执行, 传入帖子的标题和内容。如果发送成功，返回true，否则返回false。
 * @param props.enableCommunitySelection 是否启用社区选择功能
 * @param props.defaultCommunityId 默认社区ID
 * @constructor
 */
export default function PostEditor({
  onClose,
  onSubmit,
  enableCommunitySelection = false,
  defaultCommunityId,
}: PostEditorProps) {
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const [storedPost, setStoredPost] = useLocalStorage<StoredPost>("saveWritingPost", {});

  const [title, setTitle] = useState(storedPost.title ?? "");
  const [content, setContent] = useState(storedPost.content ?? "");
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | undefined>(
    storedPost.selectedCommunityId ?? defaultCommunityId,
  );

  // 获取社区列表（仅在启用社区选择时）
  const listCommunitiesQuery = useListCommunitiesQuery();
  const communityList = listCommunitiesQuery.data?.data ?? [];

  useEffect(() => {
    setStoredPost({
      title,
      content,
      selectedCommunityId: enableCommunitySelection ? selectedCommunityId : undefined,
    });
  }, [title, content, selectedCommunityId, setStoredPost, enableCommunitySelection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enableCommunitySelection && !selectedCommunityId) {
      return;
    }

    setIsPublishing(true);
    const isSuccess = await onSubmit({
      title,
      content,
      selectedCommunityId: enableCommunitySelection ? selectedCommunityId : undefined,
    });
    setIsPublishing(false);
    if (!isSuccess)
      return;
    setTitle("");
    setContent("");
    setSelectedCommunityId(defaultCommunityId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="card bg-base-100 shadow-md h-full w-full">
      <div className="card-body flex h-full">
        <h2 className="card-title">
          创建帖子
          <span className="text-sm font-normal text-base-content/70 flex items-center badge badge-outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              className="mr-1 fill-info"
            >
              <path
                d="M12 1c6.075 0 11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1Zm0 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-9v8h-2V7h2Z"
              />
            </svg>
            所有改动都会实时保存到浏览器本地
          </span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <div>
            <label className="label">
              <span className="label-text">标题</span>
            </label>
            <input
              type="text"
              placeholder="标题"
              className="input input-bordered w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 社区选择器 */}
          {enableCommunitySelection && (
            <div>
              <label className="label">
                <span className="label-text">发布到社区</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedCommunityId || ""}
                onChange={e => setSelectedCommunityId(Number(e.target.value) || undefined)}
                required
              >
                <option value="">请选择社区</option>
                {communityList.map(community => (
                  <option key={community.communityId} value={community.communityId}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <MarkdownEditor onChange={(value) => { setContent(value); }} className="flex-1" defaultContent={content}></MarkdownEditor>
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-info"
              disabled={isPublishing}
            >
              {isPublishing
                ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      发布中...
                    </>
                  )
                : (
                    "发布帖子"
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
