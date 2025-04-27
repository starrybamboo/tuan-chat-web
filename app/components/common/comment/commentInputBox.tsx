import { CommentContext } from "@/components/common/comment/commentContext";
import { use, useState } from "react";
import { useAddCommentMutation } from "../../../../api/queryHooks";

export default function CommentInputBox({ className, onSubmitFinish, rootCommentId = 0, parentCommentId = 0 }: {
  className?: string;
  onSubmitFinish?: () => void;
  rootCommentId?: number;
  parentCommentId?: number;
}) {
  const commentContext = use(CommentContext);
  const targetInfo = commentContext.targetInfo;

  const [inputContent, setInputContent] = useState("");
  const addCommentMutation = useAddCommentMutation();

  const handleAddComment = () => {
    addCommentMutation.mutate({
      content: inputContent,
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
  return (
    <div className={`mt-4 flex items-center bg-base-300 rounded-full p-2 ${className}`}>
      <input
        type="text"
        placeholder="说点什么..."
        value={inputContent}
        className="flex-1 bg-transparent outline-none px-3 text-sm"
        onChange={e => setInputContent(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleAddComment()}
      />
      <button
        className="btn btn-info"
        type="button"
        onClick={() => handleAddComment()}
        disabled={inputContent.length === 0}
      >
        发布
      </button>
    </div>
  );
}
