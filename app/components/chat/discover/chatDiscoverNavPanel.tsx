import { Link } from "react-router";
import { SidebarSimpleIcon } from "@/icons";

export type ChatDiscoverNavItem = "repository-square" | "repository-my" | "material-public" | "material-mine";

interface ChatDiscoverNavPanelProps {
  onCloseLeftDrawer: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;
  activeItem: ChatDiscoverNavItem;
}

export default function ChatDiscoverNavPanel({ onCloseLeftDrawer, onToggleLeftDrawer, isLeftDrawerOpen, activeItem }: ChatDiscoverNavPanelProps) {
  const leftDrawerLabel = isLeftDrawerOpen ? "收起侧边栏" : "展开侧边栏";
  const navItemBase = "group flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors";
  const navItemInactive = "text-base-content/70 hover:bg-base-300/60 hover:text-base-content";
  const navItemActive = "bg-base-300 text-base-content";

  return (
    <div className="flex flex-col w-full h-full flex-1 min-h-0 min-w-0 rounded-tl-xl border-l border-t border-gray-300 dark:border-gray-700 bg-base-200 text-base-content">
      <div className="flex items-center justify-between h-12 gap-2 min-w-0 border-b border-gray-300 dark:border-gray-700 rounded-tl-xl px-3">
        <div className="min-w-0 font-semibold truncate">发现</div>
        {onToggleLeftDrawer && (
          <div className="tooltip tooltip-bottom" data-tip={leftDrawerLabel}>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square hover:text-info"
              onClick={onToggleLeftDrawer}
              aria-label={leftDrawerLabel}
              aria-pressed={Boolean(isLeftDrawerOpen)}
            >
              <SidebarSimpleIcon />
            </button>
          </div>
        )}
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-base-content/50">
          归档仓库
        </div>

        <div className="space-y-1">
          <Link
            to="/chat/discover"
            className={`${navItemBase} ${activeItem === "repository-square" ? navItemActive : navItemInactive}`}
            onClick={onCloseLeftDrawer}
          >
            <span className="size-2 rounded-full bg-success opacity-70 group-hover:opacity-100" />
            广场
          </Link>
          <Link
            to="/chat/discover/my"
            className={`${navItemBase} ${activeItem === "repository-my" ? navItemActive : navItemInactive}`}
            onClick={onCloseLeftDrawer}
          >
            <span className="size-2 rounded-full bg-primary opacity-70 group-hover:opacity-100" />
            我的归档
          </Link>
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-base-content/50">
          局外素材
        </div>

        <div className="space-y-1">
          <Link
            to="/chat/discover/material"
            className={`${navItemBase} ${activeItem === "material-public" ? navItemActive : navItemInactive}`}
            onClick={onCloseLeftDrawer}
          >
            <span className="size-2 rounded-full bg-warning opacity-70 group-hover:opacity-100" />
            素材广场
          </Link>
          <Link
            to="/chat/discover/material/my"
            className={`${navItemBase} ${activeItem === "material-mine" ? navItemActive : navItemInactive}`}
            onClick={onCloseLeftDrawer}
          >
            <span className="size-2 rounded-full bg-secondary opacity-70 group-hover:opacity-100" />
            我的素材包
          </Link>
        </div>
      </div>
    </div>
  );
}
