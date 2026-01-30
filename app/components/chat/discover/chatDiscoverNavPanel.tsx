import { SidebarSimpleIcon } from "@/icons";

export interface ChatDiscoverNavPanelProps {
  onCloseLeftDrawer: () => void;
  onToggleLeftDrawer?: () => void;
  isLeftDrawerOpen?: boolean;
}

export default function ChatDiscoverNavPanel({ onCloseLeftDrawer, onToggleLeftDrawer, isLeftDrawerOpen }: ChatDiscoverNavPanelProps) {
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
        <ul className="menu p-0">
          <li>
            <button
              type="button"
              className="active"
              onClick={() => {
                onCloseLeftDrawer();
              }}
            >
              已归档群聊
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
