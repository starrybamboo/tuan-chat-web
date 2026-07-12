import type { PokeTarget } from "@tuanchat/domain/poke-message";

import { getPokeTemplateStorageKey } from "@tuanchat/domain/poke-message";

import { readMobileKeyValue, writeMobileKeyValue } from "../../lib/mobile-key-value-storage";

export type MobilePokeComposerTarget = PokeTarget & {
  initiatorRoleId: number;
  initiatorRoleName: string;
};

export async function readMobilePokeTemplate(userId: number, targetRoleId: number): Promise<string | null> {
  if (!(userId > 0) || !(targetRoleId > 0)) {
    return null;
  }
  const entry = await readMobileKeyValue<string>(getPokeTemplateStorageKey(userId, targetRoleId));
  return typeof entry?.value === "string" ? entry.value : null;
}

export async function writeMobilePokeTemplate(userId: number, targetRoleId: number, content: string): Promise<void> {
  if (!(userId > 0) || !(targetRoleId > 0)) {
    return;
  }
  await writeMobileKeyValue(getPokeTemplateStorageKey(userId, targetRoleId), content);
}
