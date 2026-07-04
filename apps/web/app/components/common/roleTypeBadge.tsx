import type { UserRole } from "../../../api";

type RoleTypeMeta = {
  label: string;
  className: string;
}

export function getUserRoleTypeMeta(role: Pick<UserRole, "type">): RoleTypeMeta {
  if (role.type === 2) {
    return {
      label: "NPC",
      className: "border-warning/30 bg-warning/10 text-warning",
    };
  }

  if (role.type === 1) {
    return {
      label: "骰娘",
      className: "border-info/30 bg-info/10 text-info",
    };
  }

  return {
    label: "角色",
    className: "border-base-content/15 bg-base-200 text-base-content/70",
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
    <span
      className={[
        "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-medium",
        meta.className,
        className,
      ].filter(Boolean).join(" ")}
    >
      {meta.label}
    </span>
  );
}
