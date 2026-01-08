import { use, useEffect, useRef, useState } from "react";
import { CommentContext } from "@/components/common/comment/commentContext";
import { useAddCommentMutation } from "../../../../api/hooks/commentQueryHooks";

export default function CommentInputBox({ className, onSubmitFinish, rootCommentId = 0, parentCommentId = 0 }: {
  className?: string;
  onSubmitFinish?: () => void;
  rootCommentId?: number;
  parentCommentId?: number;
}) {
  const commentContext = use(CommentContext);
  const targetInfo = commentContext.targetInfo;

  const [inputContent, setInputContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addCommentMutation = useAddCommentMutation();

  // 字数限制
  const MAX_CHARS = 500;
  const charCount = inputContent.length;
  const isOverLimit = charCount > MAX_CHARS;

  // 自动调整textarea高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`; // 最大高度120px
    }
  }, [inputContent]);

  const handleAddComment = () => {
    if (inputContent.trim().length === 0 || isOverLimit)
      return;

    addCommentMutation.mutate({
      content: inputContent.trim(),
      targetId: targetInfo.targetId,
      targetType: targetInfo.targetType,
      rootCommentId,
      parentCommentId,
    }, {});
    setInputContent("");
    if (onSubmitFinish) {
      onSubmitFinish();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className={`bg-base-200 rounded-lg p-3 ${className} transition-all duration-200 ring-1 ${isFocused ? "ring-1 ring-primary ring-opacity-50" : ""}`}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          placeholder="说点什么..."
          value={inputContent}
          className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed placeholder-base-content/60 min-h-[40px]"
          onChange={e => setInputContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={1}
        />

        {/* 字数统计和操作按钮区域 */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-base-300">
          <div className="flex items-center gap-2 text-xs text-base-content/60">
            <span className={`transition-colors ${isOverLimit ? "text-error" : charCount > MAX_CHARS * 0.8 ? "text-warning" : ""}`}>
              {charCount}
              /
              {MAX_CHARS}
            </span>
            <span className="text-base-content/40">
              Ctrl+Enter 发送
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 可以添加其他功能按钮，如表情、图片等 */}
            <button
              className={`btn btn-sm ${inputContent.trim().length === 0 || isOverLimit ? "btn-disabled" : "btn-primary"} transition-all duration-200`}
              type="button"
              onClick={handleAddComment}
              disabled={inputContent.trim().length === 0 || isOverLimit || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending
                ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      发布中...
                    </>
                  )
                : (
                    "发布"
                  )}
            </button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {isOverLimit && (
        <div className="mt-2 text-xs text-error">
          内容超出字数限制，请适当删减
        </div>
      )}
    </div>
  );
}
