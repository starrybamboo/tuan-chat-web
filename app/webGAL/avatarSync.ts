import type { RoleAvatar } from "../../api";

const AVATAR_UPDATED_EVENT = "webgal:avatar-updated";

export type WebgalAvatarUpdatedDetail = {
  avatarId: number;
  avatar: RoleAvatar;
};

export function emitWebgalAvatarUpdated(detail: WebgalAvatarUpdatedDetail): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<WebgalAvatarUpdatedDetail>(AVATAR_UPDATED_EVENT, { detail }));
}

export function onWebgalAvatarUpdated(
  handler: (detail: WebgalAvatarUpdatedDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<WebgalAvatarUpdatedDetail>;
    if (!customEvent.detail) {
      return;
    }
    handler(customEvent.detail);
  };

  window.addEventListener(AVATAR_UPDATED_EVENT, listener);
  return () => window.removeEventListener(AVATAR_UPDATED_EVENT, listener);
}
