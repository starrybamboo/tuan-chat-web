export const DEFAULT_SPACE_INVITE_DURATION_DAYS = 7;
export const MAX_SPACE_INVITE_DURATION_DAYS = 365;
export const MIN_SPACE_INVITE_DURATION_DAYS = 1;
export const SPACE_INVITE_ORIGIN = "https://tuan.chat";

export type SpaceInviteMode = "player" | "spectator";

/** 将邀请链接有效期约束到后端支持的天数范围。 */
export function clampSpaceInviteDurationDays(value: number, fallback = DEFAULT_SPACE_INVITE_DURATION_DAYS) {
  const normalizedFallback = Number.isFinite(fallback)
    ? Math.floor(fallback)
    : DEFAULT_SPACE_INVITE_DURATION_DAYS;
  const normalizedValue = Number.isFinite(value) ? Math.floor(value) : normalizedFallback;
  return Math.min(MAX_SPACE_INVITE_DURATION_DAYS, Math.max(MIN_SPACE_INVITE_DURATION_DAYS, normalizedValue));
}

/** 根据当前权限选择与 Web 端一致的默认邀请身份。 */
export function getDefaultSpaceInviteMode(canInvitePlayers: boolean): SpaceInviteMode {
  return canInvitePlayers ? "player" : "spectator";
}

/** 将移动端邀请身份映射为后端邀请码类型。 */
export function getSpaceInviteCodeType(mode: SpaceInviteMode): 0 | 1 {
  return mode === "player" ? 1 : 0;
}

/** 生成可在 Web 邀请路由打开的完整空间邀请链接。 */
export function buildSpaceInviteLink(code: string | null | undefined, origin = SPACE_INVITE_ORIGIN) {
  const normalizedCode = code?.trim();
  if (!normalizedCode) {
    return "";
  }
  const normalizedOrigin = origin.trim().replace(/\/+$/u, "") || SPACE_INVITE_ORIGIN;
  return `${normalizedOrigin}/invite/${encodeURIComponent(normalizedCode)}`;
}

/** 与 Web 端共享相同的邀请码缓存键结构。 */
export function getSpaceInviteCodeQueryKey(spaceId: number, type: 0 | 1, duration: number) {
  return ["inviteCode", spaceId, type, duration] as const;
}
