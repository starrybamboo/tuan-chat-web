import type { Role } from "../types";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { SidebarCard } from "./SidebarCard";

// 1. 从 Props 接口中移除 onSelect
interface RoleListItemProps {
  role: Role;
  isSelected: boolean;
  onDelete: (e?: React.MouseEvent) => void;
  isSelectionMode?: boolean;
}

// 2. 从函数参数中移除 onSelect
export function RoleListItem({
  role,
  isSelected,
  onDelete,
  isSelectionMode,
}: RoleListItemProps) {
  const avatarSrc = role.avatarThumb || role.avatar || ROLE_DEFAULT_AVATAR_URL;
  const description = (role.description || "暂无描述").length > 25
    ? `${(role.description || "暂无描述").slice(0, 25)}...`
    : role.description || "暂无描述";
  const action = isSelectionMode
    ? (
        <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 transition-all duration-200 ${isSelected ? "bg-info border-info" : "border-base-content/30 hover:border-primary"}`}>
          {isSelected && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              className="text-accent-content"
            >
              <path
                fill="currentColor"
                d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
              />
            </svg>
          )}
        </div>
      )
    : (
        <button
          type="button"
          className="btn btn-ghost btn-xs text-error hover:bg-error/10 md:opacity-0 md:group-hover:opacity-100 opacity-70 rounded-full p-1"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(e);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      );

  return (
    <SidebarCard
      active={isSelected}
      leading={(
        <div className="avatar shrink-0">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full">
            <img src={avatarSrc} alt={role.name || "default avatar"} loading="lazy" />
          </div>
        </div>
      )}
      title={role.name || "新角色"}
      description={description}
      action={action}
      descriptionClassName="mt-1 truncate text-xs text-base-content/70"
    />
  );
}
