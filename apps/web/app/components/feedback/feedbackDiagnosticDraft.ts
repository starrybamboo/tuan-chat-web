import type { FeedbackDraft } from "@/components/feedback/feedbackDraft";

type RouteErrorFeedbackDraftOptions = {
  message: string;
  details: string;
  pageUrl?: string | null;
  diagnosticFileName?: string | null;
};

type SupportIssueFeedbackDraftOptions = {
  issueTitle: string;
  issueDescription?: string | null;
  supportIssueId: string;
  faqQuestions: readonly string[];
  pageUrl?: string | null;
  diagnosticFileName?: string | null;
};

function normalizeText(value: string | null | undefined, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function buildRouteErrorFeedbackDraft({
  message,
  details,
  pageUrl,
  diagnosticFileName,
}: RouteErrorFeedbackDraftOptions): FeedbackDraft {
  const normalizedMessage = normalizeText(message, "未知错误");
  const normalizedDetails = normalizeText(details, "发生了未知错误");
  const normalizedPageUrl = normalizeText(pageUrl, "未知页面");
  const diagnosticSummary = diagnosticFileName
    ? `已自动生成诊断日志：${diagnosticFileName}`
    : "已自动生成诊断日志。";

  return {
    title: `页面报错：${normalizedMessage}`,
    content: [
      "【问题现象】",
      normalizedDetails,
      "",
      "【出错页面】",
      normalizedPageUrl,
      "",
      "【诊断日志】",
      diagnosticSummary,
      "诊断日志已自动放入本反馈附件区，提交时会随反馈一起上传。",
    ].join("\n"),
    issueType: 1,
  };
}

/** 为 Toast 帮助入口生成包含问题编号和 FAQ 的默认 Bug 草稿。 */
export function buildSupportIssueFeedbackDraft({
  issueTitle,
  issueDescription,
  supportIssueId,
  faqQuestions,
  pageUrl,
  diagnosticFileName,
}: SupportIssueFeedbackDraftOptions): FeedbackDraft {
  const normalizedTitle = normalizeText(issueTitle, "未知问题");
  const normalizedDescription = normalizeText(issueDescription, "使用帮助后问题仍未解决");
  const normalizedPageUrl = normalizeText(pageUrl, "未知页面");
  const diagnosticSummary = diagnosticFileName
    ? `已自动生成诊断日志：${diagnosticFileName}`
    : "已自动生成诊断日志。";
  const faqSummary = faqQuestions.length > 0
    ? faqQuestions.map(question => `- ${question}`).join("\n")
    : "- 暂无关联 FAQ";

  return {
    title: `问题反馈：${normalizedTitle}`,
    content: [
      "【问题现象】",
      normalizedDescription,
      "",
      "【问题编号】",
      supportIssueId,
      "",
      "【查看过的帮助】",
      faqSummary,
      "",
      "【出错页面】",
      normalizedPageUrl,
      "",
      "【诊断日志】",
      diagnosticSummary,
      "诊断日志已自动放入本反馈附件区，提交时会随反馈一起上传。",
    ].join("\n"),
    issueType: 1,
  };
}

export function buildDiagnosticLogFile(fileName: string, fileContent: string): File {
  return new File([fileContent], normalizeText(fileName, "tuanchat-console.json"), {
    type: "application/json;charset=utf-8",
  });
}
