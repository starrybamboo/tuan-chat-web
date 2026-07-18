export const MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS = 280;

export type MobileAvatarTapState = {
  roleId: number;
  timestamp: number;
} | null;

export function resolveMobileAvatarTap(
  previous: MobileAvatarTapState,
  roleId: number,
  timestamp: number,
): { matchedDoubleTap: boolean; next: MobileAvatarTapState } {
  const matchedDoubleTap = Boolean(
    previous
    && previous.roleId === roleId
    && timestamp - previous.timestamp >= 0
    && timestamp - previous.timestamp <= MOBILE_AVATAR_DOUBLE_TAP_WINDOW_MS,
  );
  return {
    matchedDoubleTap,
    next: matchedDoubleTap ? null : { roleId, timestamp },
  };
}
