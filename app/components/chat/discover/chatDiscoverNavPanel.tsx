import { Link } from "react-router";
import { SidebarSimpleIcon } from "@/icons";

export interface ChatDiscoverNavPanelProps {
  onCloseLeftDrawer: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;
  activeMode: "square" | "my";
}

export default function ChatDiscoverNavPanel({ onCloseLeftDrawer, onToggleLeftDrawer, isLeftDrawerOpen, activeMode }: ChatDiscoverNavPanelProps) {
  const leftDrawerLabel = isLeftDrawerOpen ? "收起侧边栏" : "展开侧边栏";

  return (
    <div className="flex flex-col gap-2 w-full h-full flex-1 bg-base-200 min-h-0 min-w-0 rounded-tl-xl border-l border-t border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between h-10 gap-2 min-w-0 border-b border-gray-300 dark:border-gray-700 rounded-tl-xl px-2">
        <div className="min-w-0 font-bold truncate">发现</div>
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

      <div className="px-2 pb-2">
        <div className="px-2 pt-1 pb-2 text-xs font-semibold text-base-content/60">
          已归档群聊
        </div>
        <ul className="menu p-0">
          <li>
            <Link to="/chat/discover" className={activeMode === "square" ? "active" : undefined} onClick={onCloseLeftDrawer}>
              广场
            </Link>
          </li>
          <li>
            <Link to="/chat/discover/my" className={activeMode === "my" ? "active" : undefined} onClick={onCloseLeftDrawer}>
              我的归档
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
