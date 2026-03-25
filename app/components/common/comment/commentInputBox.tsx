import { use, useState } from "react";
import { CommentContext } from "@/components/common/comment/commentContext";
import {
  hasMeaningfulMediaContent,
  measureMediaContentLength,
} from "@/components/common/content/mediaContent";
import TextMediaEditor from "@/components/common/markdown/textMediaEditor";
import { CloseIcon, SendIcon } from "@/icons";
import { useAddCommentMutation } from "../../../../api/hooks/commentQueryHooks";

export default function CommentInputBox({
  className,
  onSubmitFinish,
  onCancel,
  rootCommentId = 0,
  parentCommentId = 0,
}: {
  className?: string;
  onSubmitFinish?: () => void;
  onCancel?: () => void;
  rootCommentId?: number;
  parentCommentId?: number;
}) {
  const commentContext = use(CommentContext);
  const targetInfo = commentContext.targetInfo;

  const [inputContent, setInputContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const addCommentMutation = useAddCommentMutation();

  const charCount = measureMediaContentLength(inputContent);
  const canSubmit = hasMeaningfulMediaContent(inputContent) && !addCommentMutation.isPending;

  const handleAddComment = () => {
    if (!canSubmit)
      return;

    addCommentMutation.mutate({
      content: inputContent,
      targetId: targetInfo.targetId,
      targetType: targetInfo.targetType,
      rootCommentId,
      parentCommentId,
    }, {
      onSuccess: () => {
        setInputContent("");
        onSubmitFinish?.();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className={`rounded-xl border border-base-300 bg-base-100 p-3 shadow-sm transition-all duration-200 ${isFocused ? "border-primary/40 shadow-[0_0_0_3px] shadow-primary/10" : "hover:border-primary/20"} ${className ?? ""}`}>
      <div className="relative">
        <TextMediaEditor
          value={inputContent}
          onChange={setInputContent}
          variant="bare"
          title="评论"
          helperText="支持粘贴图片与上传视频"
          placeholder="说点什么..."
          minHeightClassName="min-h-[96px]"
          onFocusChange={setIsFocused}
          onKeyDown={handleKeyDown}
        />

        {/* 字数统计和操作按钮区域 */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-base-300/70 pt-3">
          <div className="flex items-center gap-2 text-xs text-base-content/55">
            <span>{`已输入 ${charCount} 字`}</span>
            <span className="hidden text-base-content/40 sm:inline">
              Ctrl+Enter 发送
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <button
                className="btn btn-ghost btn-sm h-9 min-h-9 rounded-full px-4 text-base-content/65 hover:bg-base-200"
                type="button"
                onClick={onCancel}
                disabled={addCommentMutation.isPending}
              >
                <CloseIcon className="h-4 w-4" />
                取消
              </button>
            )}
            <button
              className={`btn btn-sm h-9 min-h-9 rounded-full px-4 transition-all duration-200 ${canSubmit ? "btn-primary" : "btn-disabled"}`}
              type="button"
              onClick={handleAddComment}
              disabled={!canSubmit}
            >
              {addCommentMutation.isPending
                ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      发布中...
                    </>
                  )
                : (
                    <>
                      <SendIcon className="h-4 w-4" />
                      发布
                    </>
                  )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
