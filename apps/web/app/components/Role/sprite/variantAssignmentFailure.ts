import { extractOpenApiErrorMessage } from "@/utils/openApiResult";

const UNKNOWN_FAILURE_REASON = "系统未返回具体原因，请稍后重试";

function summarizeFailureReasons(errors: unknown[]) {
  const reasonCounts = new Map<string, number>();
  errors.forEach((error) => {
    const reason = extractOpenApiErrorMessage(error, UNKNOWN_FAILURE_REASON);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  });

  return Array.from(reasonCounts, ([reason, count]) => (
    count > 1 ? `${reason}（${count} 个）` : reason
  )).join("；");
}

export function buildVariantAssignmentFailureToast(successCount: number, errors: unknown[]) {
  const failedCount = errors.length;
  const reasonSummary = summarizeFailureReasons(errors);

  if (successCount === 0) {
    return {
      title: "绑定失败",
      description: failedCount > 1
        ? `共 ${failedCount} 个头像绑定失败。原因：${reasonSummary}`
        : `原因：${reasonSummary}`,
    };
  }

  return {
    title: "部分绑定失败",
    description: `成功 ${successCount} 个，失败 ${failedCount} 个。原因：${reasonSummary}`,
  };
}
