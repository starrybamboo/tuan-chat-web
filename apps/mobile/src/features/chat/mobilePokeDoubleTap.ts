export const MOBILE_POKE_DOUBLE_TAP_WINDOW_MS = 280;

export type MobilePokeTapState = {
  roleId: number;
  timestamp: number;
} | null;

export function resolveMobilePokeTap(
  previous: MobilePokeTapState,
  roleId: number,
  timestamp: number,
): { matched: boolean; next: MobilePokeTapState } {
  const matched = Boolean(
    previous
    && previous.roleId === roleId
    && timestamp - previous.timestamp >= 0
    && timestamp - previous.timestamp <= MOBILE_POKE_DOUBLE_TAP_WINDOW_MS,
  );
  return {
    matched,
    next: matched ? null : { roleId, timestamp },
  };
}
