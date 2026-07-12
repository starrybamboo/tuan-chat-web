import type { FormEvent } from "react";
import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { TextInput } from "@/components/common/FormField";

import { useId, useRef, useState } from "react";

import type { FeedbackIssueContent, FeedbackIssueDetail, FeedbackIssueType } from "@/components/feedback/feedbackTypes";

import {
  hasMeaningfulMediaContent,
  normalizeMediaContent,
} from "@/components/common/content/mediaContent";
import TextMediaEditor from "@/components/common/markdown/textMediaEditor";
import { CollapsibleMotion } from "@/components/common/motion/CollapsibleMotion";
import { consumeFeedbackAttachmentDraft } from "@/components/feedback/feedbackAttachmentDraft";
import {
  appendFeedbackAttachmentTokens,
  formatFeedbackAttachmentSize,
  uploadFeedbackAttachments,
} from "@/components/feedback/feedbackAttachments";
import { useCreateFeedbackIssueMutation } from "@/components/feedback/feedbackHooks";
import { FEEDBACK_ISSUE_TYPE_OPTIONS } from "@/components/feedback/feedbackTypes";
import { UploadUtils } from "@/utils/media/UploadUtils";

function readErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "提交反馈失败";
}

export default function FeedbackComposer({
  initialDraft,
  onCreated,
}: {
  initialDraft?: {
    title: string;
    content: FeedbackIssueContent;
    issueType: FeedbackIssueType;
  } | null;
  onCreated?: (issue: FeedbackIssueDetail) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(() => initialDraft != null);
  const [title, setTitle] = useState(() => initialDraft?.title ?? "");
  const [content, setContent] = useState<FeedbackIssueContent>(() => initialDraft?.content ?? "");
  const [issueType, setIssueType] = useState<FeedbackIssueType>(() => initialDraft?.issueType ?? 1);
  const [attachments, setAttachments] = useState(() => consumeFeedbackAttachmentDraft()?.files ?? []);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const uploadUtilsRef = useRef(new UploadUtils());
  const createMutation = useCreateFeedbackIssueMutation();
  const isSubmitting = createMutation.isPending || isUploadingAttachments;
  const formRegionId = useId();

  const resetForm = () => {
    setTitle("");
    setContent("");
    setIssueType(1);
    setAttachments([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      appToast.error("标题不能为空");
      return;
    }

    const normalizedContent = normalizeMediaContent(content);
    if (!hasMeaningfulMediaContent(normalizedContent) && attachments.length === 0) {
      appToast.error("内容不能为空");
      return;
    }

    setIsUploadingAttachments(true);
    try {
      const uploadedAttachments = await uploadFeedbackAttachments(attachments, uploadUtilsRef.current);
      const contentWithAttachments = appendFeedbackAttachmentTokens(normalizedContent, uploadedAttachments);
      if (!hasMeaningfulMediaContent(contentWithAttachments)) {
        appToast.error("内容不能为空");
        return;
      }

      const issue = await createMutation.mutateAsync({
        title: title.trim(),
        content: contentWithAttachments,
        issueType,
      });
      appToast.success({
        title: "反馈已提交",
        description: "我们会在反馈中心跟进这个问题。",
        actions: [{
          label: "查看反馈中心",
          onClick: () => {
            window.location.href = "/feedback";
          },
        }],
      });
      resetForm();
      setIsExpanded(false);
      onCreated?.(issue);
    }
    catch (error) {
      appToast.error({
        title: "提交反馈失败",
        description: readErrorMessage(error),
      });
    }
    finally {
      setIsUploadingAttachments(false);
    }
  };

  return (
    <section className="
      overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm
    ">
      <div className="
        flex flex-col gap-3 px-4 py-4
        md:flex-row md:items-center md:justify-between
      ">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-base-content">新建反馈</div>
        </div>

        <Button
          aria-controls={formRegionId}
          aria-expanded={isExpanded}
          variant={isExpanded ? "ghost" : "outline"}
          size="sm"
          className={isExpanded ? undefined : "border-warning/45 text-warning hover:border-warning/70 hover:bg-warning/10"}
          onClick={() => setIsExpanded(current => !current)}
        >
          {isExpanded ? "收起" : "展开"}
        </Button>
      </div>

      <CollapsibleMotion open={isExpanded}>
        <div id={formRegionId} className="border-t border-base-300 px-4 py-4">
          <form className="space-y-4" autoComplete="off" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content" htmlFor="feedback-title">
                标题
              </label>
              <TextInput
                id="feedback-title"
                name="feedback-title-ignore-autofill"
                type="text"
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
                  <Button
                    key={option.value}
                    aria-pressed={issueType === option.value}
                    variant="ghost"
                    size="sm"
                    className={`
                      rounded-md border px-3 py-2 text-sm transition
                      ${
                      issueType === option.value
                        ? "border-info bg-info/10 text-info"
                        : `
                          border-base-300 bg-base-100
                          hover:bg-base-200/60
                        `
                    }
                    `}
                    onClick={() => setIssueType(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-base-content/55">
                纯文本输入，支持图片上传、截图粘贴、视频上传和附件。
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-base-content">描述</div>
              <TextMediaEditor value={content} onChange={setContent} />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-base-content">附件</div>
                <div className="rounded-md border border-base-300 bg-base-200/40">
                  {attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="
                        flex items-center justify-between gap-3 border-b border-base-300 px-3 py-2
                        last:border-b-0
                      "
                    >
                      <div className="min-w-0">
                        <div
                          className="truncate text-sm font-medium text-base-content"
                          title={attachment.file.name || "未命名附件"}
                        >
                          {attachment.file.name || "未命名附件"}
                        </div>
                        <div className="text-xs text-base-content/55">
                          {formatFeedbackAttachmentSize(attachment.file.size)}
                        </div>
                      </div>
                      <Button
                        aria-label={`移除附件 ${attachment.file.name || "未命名附件"}`}
                        variant="ghost"
                        size="xs"
                        disabled={isSubmitting}
                        onClick={() => setAttachments(current => current.filter(item => item.id !== attachment.id))}
                      >
                        移除
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  resetForm();
                  setIsExpanded(false);
                }}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                提交反馈
              </Button>
            </div>
          </form>
        </div>
      </CollapsibleMotion>
    </section>
  );
}
