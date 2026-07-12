import RoleAvatarComponent from "@/components/common/roleAvatar";
import { IconButton } from "@/components/common/IconButton";
import { Skeleton } from "@/components/common/StatusPrimitives";

import type { Role } from "../types";

// 1. 从 Props 接口中移除 onSelect
type RoleListItemProps = {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e?: React.MouseEvent) => void;
  isSelectionMode?: boolean;
}

// 2. 从函数参数中移除 onSelect
export function RoleListItem({
  role,
  isSelected,
  onSelect,
  onDelete,
  isSelectionMode,
}: RoleListItemProps) {
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer group
        ${
        isSelected ? "bg-base-100" : "hover:bg-base-100"
      }
      `}
    >
      <button type="button" className="
        flex min-w-0 flex-1 items-center gap-3 text-left
      " onClick={onSelect}>
        <RoleAvatarComponent
          avatarId={role.avatarId}
          avatarUrl={role.avatar}
          avatarThumbUrl={role.avatarThumb}
          roleId={role.id}
          roleType={role.type}
          width={14}
          isRounded={true}
          stopToastWindow={true}
          alt={role.name || "default avatar"}
          imageLoading="lazy"
        />
        <div className="flex-1 min-w-0 max-w-32 overflow-hidden">
          <h3 className="font-medium truncate">{role.name || "新角色"}</h3>
          <p className="text-xs text-base-content/70 mt-1">
            {(role.description || "暂无描述").length > 25
              ? `${(role.description || "暂无描述").slice(0, 25)}...`
              : role.description || "暂无描述"}
          </p>
        </div>

        {isSelectionMode
          ? (
              <div className={`
                flex items-center justify-center size-4 rounded-full border-2
                transition-all duration-200
                ${isSelected ? `bg-info border-info` : `
                  border-base-content/30
                  hover:border-info
                `}
              `}>
                {isSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    className="text-info-content"
                  >
                    <path
                      fill="currentColor"
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    />
                  </svg>
                )}
              </div>
            )
          : null}
      </button>

      {!isSelectionMode && (
        <IconButton
          size="xs"
          label={`删除角色${role.name || "新角色"}`}
          className="
            text-error hover:bg-error/10 md:opacity-0
            md:group-hover:opacity-100
            opacity-70 rounded-full p-1
          "
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(e);
          }}
          title={`删除角色${role.name || "新角色"}`}
          icon={(
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          )}
        />
      )}
    </div>
  );
}

export function RoleListItemSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3"
      aria-hidden="true"
    >
      <div className="shrink-0">
        <Skeleton className="size-12 md:size-14" rounded="full" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
        <Skeleton className="h-4 w-28" rounded="full" />
        <Skeleton className="h-3 w-40 max-w-full" rounded="full" />
      </div>
      <Skeleton className="size-4 opacity-70" rounded="full" />
    </div>
  );
}
