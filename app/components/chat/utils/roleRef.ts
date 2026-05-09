const ROLE_REF_MIME = "application/x-tc-role-ref";
const ROLE_REF_FALLBACK_PREFIX = "tc-role-ref:";

export type RoleRefDragPayload = {
  roleId: number;
  roomId?: number;
  roleName?: string;
};

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : (typeof value === "string" && value.trim() ? Number(value) : Number.NaN);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizePayload(raw: unknown): RoleRefDragPayload | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const payload = raw as Partial<RoleRefDragPayload>;
  const roleId = toPositiveInteger(payload.roleId);
  if (!roleId) {
    return null;
  }

  const roomId = toPositiveInteger(payload.roomId);
  const roleName = typeof payload.roleName === "string" ? payload.roleName.trim() : "";
  return {
    roleId,
    ...(roomId ? { roomId } : {}),
    ...(roleName ? { roleName: roleName.slice(0, 120) } : {}),
  };
}

export function setRoleRefDragData(dataTransfer: DataTransfer, payload: RoleRefDragPayload): void {
  const normalizedPayload = normalizePayload(payload);
  if (!normalizedPayload) {
    return;
  }

  try {
    dataTransfer.setData(ROLE_REF_MIME, JSON.stringify(normalizedPayload));
  }
  catch {
    // ignore
  }

  try {
    dataTransfer.setData("text/uri-list", `${ROLE_REF_FALLBACK_PREFIX}${normalizedPayload.roleId}`);
  }
  catch {
    // ignore
  }
}

export function getRoleRefDragData(dataTransfer: DataTransfer | null | undefined): RoleRefDragPayload | null {
  if (!dataTransfer) {
    return null;
  }

  try {
    const raw = dataTransfer.getData(ROLE_REF_MIME);
    if (raw) {
      return normalizePayload(JSON.parse(raw));
    }
  }
  catch {
    // ignore
  }

  try {
    const uriList = dataTransfer.getData("text/uri-list") || "";
    const first = uriList.split(/\r?\n/).map(item => item.trim()).find(Boolean) || "";
    if (first.startsWith(ROLE_REF_FALLBACK_PREFIX)) {
      const roleId = Number.parseInt(first.slice(ROLE_REF_FALLBACK_PREFIX.length), 10);
      if (Number.isFinite(roleId) && roleId > 0) {
        return { roleId };
      }
    }
  }
  catch {
    // ignore
  }

  return null;
}

export function isRoleRefDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }

  try {
    const types = Array.from(dataTransfer.types || []);
    if (types.includes(ROLE_REF_MIME)) {
      return true;
    }
    if (types.includes("text/uri-list") && !types.includes("Files")) {
      const uriList = dataTransfer.getData("text/uri-list") || "";
      const first = uriList.split(/\r?\n/).map(item => item.trim()).find(Boolean) || "";
      if (first.startsWith(ROLE_REF_FALLBACK_PREFIX)) {
        return true;
      }
    }
    return Boolean(getRoleRefDragData(dataTransfer));
  }
  catch {
    return false;
  }
}
