/** Palette shared by contact-list avatars so fallback colors stay consistent. */
export const CONTACT_LIST_AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"] as const;

/** Contact-list avatars are visual children of the row; the row owns all press handling. */
export const CONTACT_LIST_AVATAR_POINTER_EVENTS = "none";

/** Returns the fallback initial shown when a contact avatar image is unavailable. */
export function getContactAvatarInitial(displayName: string | null | undefined) {
  return displayName?.trim().slice(0, 1) || "U";
}

/** Returns a stable fallback color for a contact id or other numeric seed. */
export function getContactAvatarColor(seed: number | null | undefined) {
  const safeSeed = Math.abs(seed ?? 0);
  return CONTACT_LIST_AVATAR_COLORS[safeSeed % CONTACT_LIST_AVATAR_COLORS.length];
}
