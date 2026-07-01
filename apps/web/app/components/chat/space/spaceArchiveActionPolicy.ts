export const SPACE_ARCHIVE_ACTION_DISABLED_REASON = "归档空间功能暂不可用";

type SpaceArchiveActionState = {
  spaceId: number;
  isArchived: boolean;
  isPending: boolean;
}

export function getSpaceArchiveActionDisabledReason({
  spaceId,
  isArchived,
  isPending,
}: SpaceArchiveActionState): string | null {
  if (spaceId <= 0 || !Number.isFinite(spaceId)) {
    return "空间 ID 无效";
  }
  if (isPending) {
    return "操作进行中";
  }
  // 临时前端限制：只关闭“归档空间”，保留已归档空间的恢复编辑入口。
  if (!isArchived) {
    return SPACE_ARCHIVE_ACTION_DISABLED_REASON;
  }
  return null;
}
