import { use, useState } from "react";

import { Button } from "@/components/common/Button";
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
    if (e.nativeEvent.isComposing)
      return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className={`
      rounded-xl border border-base-300 bg-base-100 p-3 shadow-sm transition-all
      duration-200 motion-reduce:transition-none
      ${isFocused ? `border-info/40 shadow-[0_0_0_3px] shadow-info/10` : `
        hover:border-info/20
      `}
      ${className ?? ""}
    `}>
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
        <div className="
          mt-3 flex flex-wrap items-center justify-between gap-3 border-t
          border-base-300/70 pt-3
        ">
          <div className="flex items-center gap-2 text-xs text-base-content/55">
            <span>{`已输入 ${charCount} 字`}</span>
            <span className="
              hidden text-base-content/50
              sm:inline
            ">
              Ctrl+Enter 发送
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="
                  h-9 min-h-9 rounded-full px-4
                  text-base-content/65
                  hover:bg-base-200
                "
                type="button"
                onClick={onCancel}
                disabled={addCommentMutation.isPending}
                title={addCommentMutation.isPending ? "正在发布评论" : "取消评论"}
              >
                <CloseIcon className="h-4 w-4" />
                取消
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              className="
                h-9 min-h-9 rounded-full px-4 transition-all
                duration-200 motion-reduce:transition-none
              "
              type="button"
              icon={<SendIcon className="h-4 w-4" />}
              loading={addCommentMutation.isPending}
              onClick={handleAddComment}
              disabled={!canSubmit}
              title={addCommentMutation.isPending ? "正在发布评论" : canSubmit ? "发布评论" : "请输入评论内容"}
            >
              {addCommentMutation.isPending ? "发布中..." : "发布"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
