import type { FormEvent } from "react";
import type { FeedbackIssueContent, FeedbackIssueDetail, FeedbackIssueType } from "@/components/feedback/feedbackTypes";
import { useState } from "react";

import toast from "react-hot-toast";
import {
  hasMeaningfulMediaContent,
  normalizeMediaContent,
} from "@/components/common/content/mediaContent";
import { useCreateFeedbackIssueMutation } from "@/components/feedback/feedbackHooks";
import TextMediaEditor from "@/components/common/markdown/textMediaEditor";
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
  const [content, setContent] = useState<FeedbackIssueContent>("");
  const [issueType, setIssueType] = useState<FeedbackIssueType>(1);
  const createMutation = useCreateFeedbackIssueMutation();

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIssueType(1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("标题不能为空");
      return;
    }

    const normalizedContent = normalizeMediaContent(content);
    if (!hasMeaningfulMediaContent(normalizedContent)) {
      toast.error("内容不能为空");
      return;
    }

    try {
      const issue = await createMutation.mutateAsync({
        title: title.trim(),
        content: normalizedContent,
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
        </div>

        <button
          type="button"
          className={`btn btn-sm ${isExpanded ? "btn-ghost" : "btn-primary"}`}
          onClick={() => setIsExpanded(current => !current)}
        >
          {isExpanded ? "收起" : "展开"}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-base-300 px-4 py-4">
          <form className="space-y-4" autoComplete="off" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content" htmlFor="feedback-title">
                标题
              </label>
              <input
                id="feedback-title"
                name="feedback-title-ignore-autofill"
                type="text"
                className="input input-bordered w-full rounded-md"
                value={title}
                maxLength={255}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={event => setTitle(event.target.value)}
                placeholder="例如：房间重连后消息列表顺序错乱"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-base-content">类型</div>
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
                纯文本输入，支持图片上传、截图粘贴和视频上传。
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-base-content">描述</div>
              <TextMediaEditor value={content} onChange={setContent} />
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
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "提交中..." : "提交反馈"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
