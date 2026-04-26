import type { UserRole } from "../../../api";

interface RoleTypeMeta {
  label: string;
  className: string;
}

export function getUserRoleTypeMeta(role: Pick<UserRole, "type" | "npc" | "role" | "diceMaiden">): RoleTypeMeta {
  if (role.type === 2 || role.npc) {
    return {
      label: "NPC",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    };
  }

  if (role.type === 1 || role.diceMaiden) {
    return {
      label: "骰娘",
      className: "border-violet-500/30 bg-violet-500/10 text-violet-700",
    };
  }

  return {
    label: "角色",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  };
}

export function RoleTypeBadge({
  role,
  className,
}: {
  role: Pick<UserRole, "type" | "npc" | "role" | "diceMaiden">;
  className?: string;
}) {
  const meta = getUserRoleTypeMeta(role);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-medium ${meta.className}${className ? ` ${className}` : ""}`}
    >
      {meta.label}
    </span>
  );
}
