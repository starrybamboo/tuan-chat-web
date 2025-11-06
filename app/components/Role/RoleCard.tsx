import type { Role } from "../types";

interface RoleListItemProps {
  role: Role;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  isSelectionMode?: boolean; // 新增属性
}

export function RoleCard({ role }: RoleListItemProps) {
  return (
    <div className="card bg-base-100 w-50 shadow-xl p-3 rounded-none">
      <figure>
        {role.avatar
          ? (
              <img src={role.avatar} alt={role.name} />
            )
          : (
              <img src="/favicon.ico" alt="default avatar" />
            )}
      </figure>
      <div className="text-center mt-2 ">
        <div className="inline-block border-2 font-extrabold p-1">{role.name}</div>
      </div>
      <p className="text-xs mt-1">
        {(role.description || "暂无描述").length > 25
          ? `${(role.description || "暂无描述").slice(0, 25)}...`
          : role.description || "暂无描述"}
      </p>

    </div>
  );
}
