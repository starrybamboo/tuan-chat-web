import type { Role } from "./types";

interface RoleListItemProps {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isSelectionMode?: boolean; // 新增属性
}

export function RoleListItem({ role, isSelected, onSelect, onDelete, isSelectionMode }: RoleListItemProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer group ${isSelected ? "bg-base-100" : "hover:bg-base-100"
      } w-full truncate`}
      onClick={onSelect}
    >
      <div className="avatar shrink-0">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full">
          {role.avatar
            ? (
                <img src={role.avatar} alt={role.name} />
              )
            : (
                <img src="/favicon.ico" alt="default avatar" />
              )}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="font-medium truncate">{role.name || "新角色"}</h3>
        <p className="text-xs text-base-content/70 mt-1">
          {(role.description || "暂无描述").length > 25
            ? `${(role.description || "暂无描述").slice(0, 25)}...`
            : role.description || "暂无描述"}
        </p>
      </div>
      {isSelectionMode
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
                onDelete();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          )}
    </div>
  );
}
