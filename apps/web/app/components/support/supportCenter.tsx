import { XIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";

import type { SupportIssueId } from "@/components/support/supportCatalog";
import type { OpenSupportCenterOptions } from "@/components/support/supportCenterLauncher";

import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { buildSupportIssueFeedbackDraft } from "@/components/feedback/feedbackDiagnosticDraft";
import { prepareDiagnosticFeedback } from "@/components/feedback/feedbackPreparation";
import {
  getSupportFaq,
  getSupportIssue,
  getSupportTerm,
} from "@/components/support/supportCatalog";

/** 问题帮助弹窗的纯内容区域，保持目录内容与容器逻辑分离。 */
export function SupportCenterContent({
  issueId,
  onClose,
  onFeedback,
}: {
  issueId: SupportIssueId;
  onClose: () => void;
  onFeedback: () => void;
}) {
  const issue = getSupportIssue(issueId);
  const terms = issue.termIds.map(termId => ({ id: termId, ...getSupportTerm(termId) }));
  const faqs = issue.faqIds.map(faqId => ({ id: faqId, ...getSupportFaq(faqId) }));

  return (
    <div className="w-[min(88vw,40rem)] text-base-content">
      <header className="flex items-start gap-4 border-b border-base-300 pb-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-base-content/55">问题帮助</div>
          <h2 className="mt-1 text-xl font-semibold leading-7">{issue.title}</h2>
          <p className="mt-2 text-sm leading-6 text-base-content/70">{issue.explanation}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          shape="square"
          icon={<XIcon className="size-5" aria-hidden="true" />}
          aria-label="关闭问题帮助"
          title="关闭问题帮助"
          onClick={onClose}
        />
      </header>

      <section className="mt-5">
        <h3 className="text-sm font-semibold">建议先这样处理</h3>
        <ol className="mt-3 space-y-2">
          {issue.suggestions.map((suggestion, index) => (
            <li key={suggestion} className="flex gap-3 text-sm leading-6 text-base-content/75">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-info/12 text-xs font-semibold text-info">
                {index + 1}
              </span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">术语说明</h3>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {terms.map(term => (
            <div key={term.id} className="rounded-md border border-base-300 bg-base-200/45 p-3">
              <dt className="text-sm font-medium">{term.name}</dt>
              <dd className="mt-1 text-xs leading-5 text-base-content/65">{term.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold">常见问题</h3>
        <div className="mt-3 space-y-2">
          {faqs.map(faq => (
            <details key={faq.id} className="rounded-md border border-base-300 bg-base-100 px-3 py-2">
              <summary className="cursor-pointer select-none text-sm font-medium leading-6">
                {faq.question}
              </summary>
              <div className="pb-1 pt-2 text-sm leading-6 text-base-content/70">
                <p>{faq.answer}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {faq.steps.map(step => <li key={step}>{step}</li>)}
                </ol>
              </div>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-6 flex flex-col gap-3 border-t border-base-300 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-base-content/55">这些办法仍然没有解决问题？</p>
        <Button variant="errorOutline" size="sm" onClick={onFeedback}>
          提交 Bug 反馈
        </Button>
      </footer>
    </div>
  );
}

function SupportCenterDialog({
  issueId,
  toastTitle,
  toastDescription,
  onClose,
}: OpenSupportCenterOptions & { onClose: () => void }) {
  const navigate = useNavigate();
  const issue = getSupportIssue(issueId);
  const faqQuestions = issue.faqIds.map(faqId => getSupportFaq(faqId).question);

  const handleFeedback = () => {
    const result = prepareDiagnosticFeedback(diagnosticFileName => buildSupportIssueFeedbackDraft({
      issueTitle: toastTitle ?? issue.title,
      issueDescription: toastDescription ?? issue.explanation,
      supportIssueId: issueId,
      faqQuestions,
      pageUrl: typeof window === "undefined" ? undefined : window.location.href,
      diagnosticFileName,
    }));

    if (!result.ok) {
      appToast.error({
        title: "反馈草稿写入失败",
        description: "请到反馈页手动补充问题信息。",
      });
    }
    onClose();
    void navigate({ to: "/feedback" });
  };

  return (
    <SupportCenterContent
      issueId={issueId}
      onClose={onClose}
      onFeedback={handleFeedback}
    />
  );
}

/** 通过现有 ToastWindow 打开问题帮助，并保持路由上下文。 */
export function showSupportCenter(options: OpenSupportCenterOptions) {
  toastWindow(
    close => <SupportCenterDialog {...options} onClose={close} />,
    {
      ariaLabel: "问题帮助",
      panelClassName: "w-auto max-w-[calc(100vw-2rem)]",
    },
  );
}
