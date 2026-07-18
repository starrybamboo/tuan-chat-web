import type { SupportIssueId } from "@/components/support/supportCatalog";

/** 打开帮助时从原 Toast 延续的用户可见上下文。 */
export type OpenSupportCenterOptions = {
  issueId: SupportIssueId;
  toastTitle?: string;
  toastDescription?: string;
};

/** 帮助弹窗只在用户主动打开时加载，避免所有 Toast 调用方承担弹窗代码。 */
export async function openSupportCenter(options: OpenSupportCenterOptions) {
  const { showSupportCenter } = await import("@/components/support/supportCenter");
  showSupportCenter(options);
}
