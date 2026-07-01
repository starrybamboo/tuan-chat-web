import type { FeedbackDraft } from "@/components/feedback/feedbackDraft";

type RouteErrorFeedbackDraftOptions = {
  message: string;
  details: string;
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

export function buildDiagnosticLogFile(fileName: string, fileContent: string): File {
  return new File([fileContent], normalizeText(fileName, "tuanchat-console.json"), {
    type: "application/json;charset=utf-8",
  });
}
