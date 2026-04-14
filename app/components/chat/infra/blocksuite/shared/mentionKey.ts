export type BlocksuiteMentionTarget
  = | { kind: "user"; id: string }
    | { kind: "role"; id: string };

const ROLE_MENTION_PREFIX = "role:";

export function buildBlocksuiteRoleMentionKey(roleId: number | string): string {
  const normalized = String(roleId ?? "").trim();
  if (!normalized) {
    throw new Error("roleId is required");
  }
  return `${ROLE_MENTION_PREFIX}${normalized}`;
}

export function parseBlocksuiteMentionKey(value: unknown): BlocksuiteMentionTarget | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith(ROLE_MENTION_PREFIX)) {
    return { kind: "user", id: normalized };
  }

  const roleId = normalized.slice(ROLE_MENTION_PREFIX.length).trim();
  if (!/^\d+$/.test(roleId)) {
    return null;
  }

  return { kind: "role", id: roleId };
}

export function getBlocksuiteRoleHref(roleId: string): string {
  return `/role/${encodeURIComponent(roleId)}`;
}
