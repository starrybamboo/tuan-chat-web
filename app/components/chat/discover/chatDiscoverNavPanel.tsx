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
  const navItemBase = "group flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors";
  const navItemInactive = "text-[#c9cdd4] hover:bg-white/5 hover:text-white";
  const navItemActive = "bg-white/10 text-white";

  return (
    <div className="flex flex-col w-full h-full flex-1 min-h-0 min-w-0 rounded-tl-xl border-l border-t border-black/20 bg-[#1e1f22] text-white">
      <div className="flex items-center justify-between h-12 gap-2 min-w-0 border-b border-white/5 rounded-tl-xl px-3">
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
        <div className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-[#949ba4]">
          已归档群聊
        </div>

        <div className="space-y-1">
          <Link
            to="/chat/discover"
            className={`${navItemBase} ${activeMode === "square" ? navItemActive : navItemInactive}`}
            onClick={onCloseLeftDrawer}
          >
            <span className="size-2 rounded-full bg-[#3ba55c] opacity-70 group-hover:opacity-100" />
            广场
          </Link>
          <Link
            to="/chat/discover/my"
            className={`${navItemBase} ${activeMode === "my" ? navItemActive : navItemInactive}`}
            onClick={onCloseLeftDrawer}
          >
            <span className="size-2 rounded-full bg-[#5865f2] opacity-70 group-hover:opacity-100" />
            我的归档
          </Link>
        </div>
      </div>
    </div>
  );
}
