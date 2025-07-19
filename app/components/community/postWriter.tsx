import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";

import React, { useEffect, useState } from "react";

export interface StoredPost {
  title?: string;
  content?: string;
}

/**
 * 帖子编辑器，也就是一个markdown编辑器
 * @param onClose 关闭窗口的时候的回调函数
 * @param onSubmit 提交按钮的回调函数，异步执行, 传入帖子的标题和内容。如果发送成功，返回true，否则返回false。
 * @constructor
 */
export default function PostWriter({ onClose, onSubmit }:
{
  onClose?: () => void;
  onSubmit: (post: StoredPost) => Promise<boolean>;
}) {
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const [storedPost, setStoredPost] = useLocalStorage<StoredPost>("saveWritingPost", {});

  const [title, setTitle] = useState(storedPost.title ?? "");
  const [content, setContent] = useState(storedPost.content ?? "");

  useEffect(() => {
    setStoredPost({
      title,
      content,
    });
  }, [title, content, setStoredPost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    const isSuccess = await onSubmit({ title, content });
    setIsPublishing(false);
    if (!isSuccess)
      return;
    setTitle("");
    setContent("");
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
          <MarkdownEditor onChange={(value) => { setContent(value); }}></MarkdownEditor>
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
