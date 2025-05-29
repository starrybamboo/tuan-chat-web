import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";
import { CommunityContext } from "@/components/community/communityContext";
import { use, useEffect, useState } from "react";
import { usePublishPostMutation } from "../../../api/hooks/communityQueryHooks";

export default function PostWriter({ onClose }: { onClose?: () => void }) {
  const communityContext = use(CommunityContext);
  const communityId = communityContext.communityId ?? -1;
  const publishPostMutation = usePublishPostMutation();
  const isPublishing = publishPostMutation.isPending;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 处理快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key) {
        const textarea = document.activeElement as HTMLTextAreaElement;
        if (!textarea || textarea.tagName !== "TEXTAREA")
          return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            setContent(`${content.substring(0, start)} **${selectedText}** ${content.substring(end)}`);
            break;
          case "i":
            e.preventDefault();
            setContent(`${content.substring(0, start)} _${selectedText}_ ${content.substring(end)}`);
            break;
          case "k":
            e.preventDefault();
            setContent(`${content.substring(0, start)}[${selectedText}](url)${content.substring(end)}`);
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim())
      return;

    publishPostMutation.mutate(
      {
        communityId,
        title: title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          if (onClose) {
            onClose();
          }
        },
      },
    );
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">创建帖子</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="flex flex-col md:flex-row gap-4 relative min-h-[400px]">
            {/* 编辑器 */}
            <div className="flex-1 md:w-auto">
              <label className="label">
                <span className="label-text">内容 (支持Markdown)</span>
                <span className="label-text-alt text-xs opacity-70">
                  Ctrl+B: 加粗, Ctrl+I: 斜体
                </span>
              </label>
              <textarea
                placeholder="写下你的想法..."
                className="textarea textarea-bordered w-full h-full min-h-[200px]"
                value={content}
                onChange={e => setContent(e.target.value)}
                required
              />
            </div>

            {/* 预览 */}
            <div className="flex-1 md:w-auto">
              <label className="label">
                <span className="label-text">预览</span>
              </label>
              <div className="border border-base-300 rounded-box pl-4 pr-4 h-full overflow-auto">
                <MarkDownViewer content={content} />
              </div>
            </div>
          </div>

          <div className="card-actions justify-end">
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
                    "Publish Post"
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
