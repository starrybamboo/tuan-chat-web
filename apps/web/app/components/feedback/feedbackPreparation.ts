import type { FeedbackDraft } from "@/components/feedback/feedbackDraft";

import { writeFeedbackAttachmentDraft } from "@/components/feedback/feedbackAttachmentDraft";
import { buildDiagnosticLogFile } from "@/components/feedback/feedbackDiagnosticDraft";
import { writeFeedbackDraft } from "@/components/feedback/feedbackDraft";
import {
  buildDiagnosticConsoleFileContent,
  buildDiagnosticConsoleFileName,
  buildDiagnosticConsoleReport,
} from "@/utils/diagnosticConsole";

/** 反馈准备过程使用的可替换浏览器依赖。 */
export type FeedbackPreparationDeps = {
  createDiagnosticFile: () => { fileName: string; file: File };
  writeAttachmentDraft: (files: readonly File[]) => boolean;
  writeDraft: (draft: FeedbackDraft) => boolean;
};

/** 创建诊断日志、附件草稿和正文草稿所需的默认依赖。 */
export function createDefaultFeedbackPreparationDeps(): FeedbackPreparationDeps {
  return {
    createDiagnosticFile: () => {
      const report = buildDiagnosticConsoleReport();
      const fileName = buildDiagnosticConsoleFileName();
      return {
        fileName,
        file: buildDiagnosticLogFile(fileName, buildDiagnosticConsoleFileContent(report)),
      };
    },
    writeAttachmentDraft: writeFeedbackAttachmentDraft,
    writeDraft: writeFeedbackDraft,
  };
}

/** 生成诊断文件并把它与调用方构造的 Bug 草稿一起写入现有反馈入口。 */
export function prepareDiagnosticFeedback(
  buildDraft: (diagnosticFileName: string) => FeedbackDraft,
  deps: FeedbackPreparationDeps = createDefaultFeedbackPreparationDeps(),
) {
  const { fileName, file } = deps.createDiagnosticFile();
  const attachmentWritten = deps.writeAttachmentDraft([file]);
  const draftWritten = deps.writeDraft(buildDraft(fileName));

  return {
    ok: attachmentWritten && draftWritten,
    attachmentWritten,
    draftWritten,
    diagnosticFileName: fileName,
  };
}
