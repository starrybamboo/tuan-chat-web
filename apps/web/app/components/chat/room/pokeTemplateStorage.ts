import { getPokeTemplateStorageKey } from "@tuanchat/domain/poke-message";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readPokeTemplate(userId: number, targetRoleId: number): string | null {
  if (!(userId > 0) || !(targetRoleId > 0) || !canUseLocalStorage()) {
    return null;
  }
  return window.localStorage.getItem(getPokeTemplateStorageKey(userId, targetRoleId));
}

export function writePokeTemplate(userId: number, targetRoleId: number, content: string): void {
  if (!(userId > 0) || !(targetRoleId > 0) || !canUseLocalStorage()) {
    return;
  }
  window.localStorage.setItem(getPokeTemplateStorageKey(userId, targetRoleId), content);
}
