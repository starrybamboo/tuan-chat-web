import type { FeedbackIssueDetail, FeedbackIssueType } from "@/components/feedback/feedbackTypes";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
import { useCreateFeedbackIssueMutation } from "@/components/feedback/feedbackHooks";
import { FEEDBACK_ISSUE_TYPE_OPTIONS } from "@/components/feedback/feedbackTypes";

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "提交反馈失败";
}

export default function FeedbackComposer({
  onCreated,
}: {
  onCreated?: (issue: FeedbackIssueDetail) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [issueType, setIssueType] = useState<FeedbackIssueType>(1);
  const [editorKey, setEditorKey] = useState(0);
  const createMutation = useCreateFeedbackIssueMutation();

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIssueType(1);
    setEditorKey(current => current + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("标题不能为空");
      return;
    }

    if (!content.trim()) {
      toast.error("内容不能为空");
      return;
    }

    try {
      const issue = await createMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        issueType,
      });
      toast.success("反馈已提交");
      resetForm();
      setIsExpanded(false);
      onCreated?.(issue);
    }
    catch (error) {
      toast.error(readErrorMessage(error));
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-base-content">新建反馈</div>
          <p className="text-sm text-base-content/60">
            像 GitHub issue 一样先写标题，再补正文、截图和上下文。
          </p>
        </div>

        <button
          type="button"
          className={`btn btn-sm ${isExpanded ? "btn-ghost" : "btn-primary"}`}
          onClick={() => setIsExpanded(current => !current)}
        >
          {isExpanded ? "收起" : "New issue"}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-base-300 px-4 py-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content" htmlFor="feedback-title">
                Title
              </label>
              <input
                id="feedback-title"
                name="feedback-title"
                type="text"
                className="input input-bordered w-full rounded-md"
                value={title}
                maxLength={255}
                onChange={event => setTitle(event.target.value)}
                placeholder="例如：房间重连后消息列表顺序错乱"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-base-content">Type</div>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_ISSUE_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={issueType === option.value}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      issueType === option.value
                        ? "border-info bg-info/10 text-info"
                        : "border-base-300 bg-base-100 hover:bg-base-200/60"
                    }`}
                    onClick={() => setIssueType(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="text-xs text-base-content/55">
                支持 Markdown、图片上传和粘贴图片。
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-base-content">Description</div>
              <div className="rounded-md border border-base-300 bg-base-200/20 p-3">
                <MarkdownEditor
                  key={editorKey}
                  defaultContent={content}
                  onChange={value => setContent(value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={createMutation.isPending}
                onClick={() => {
                  resetForm();
                  setIsExpanded(false);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "提交中..." : "Submit new issue"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
