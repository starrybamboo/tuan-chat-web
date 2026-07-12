import type { UserRole } from "../../../api";

import type { StatusTone } from "@/components/common/StatusPrimitives";

import { Badge } from "@/components/common/StatusPrimitives";

type RoleTypeMeta = {
  label: string;
  tone: StatusTone;
}

export function getUserRoleTypeMeta(role: Pick<UserRole, "type">): RoleTypeMeta {
  if (role.type === 2) {
    return {
      label: "NPC",
      tone: "warning",
    };
  }

  if (role.type === 1) {
    return {
      label: "骰娘",
      tone: "info",
    };
  }

  return {
    label: "角色",
    tone: "neutral",
  };
}

export function RoleTypeBadge({
  role,
  className,
}: {
  role: Pick<UserRole, "type">;
  className?: string;
}) {
  const meta = getUserRoleTypeMeta(role);

  return (
    <Badge tone={meta.tone} className={`shrink-0 ${className ?? ""}`}>
      {meta.label}
    </Badge>
  );
}
