import { Link } from "@tanstack/react-router";

export type ChatDiscoverNavItem = "repository-square" | "repository-my" | "material-public" | "material-mine";

type ChatDiscoverNavPanelProps = {
  onCloseLeftDrawer: () => void;
  activeItem: ChatDiscoverNavItem;
}

export default function ChatDiscoverNavPanel({ onCloseLeftDrawer, activeItem }: ChatDiscoverNavPanelProps) {
  const navItemBase = "group flex items-center gap-2 rounded-md border border-transparent px-2 py-2 text-sm font-medium transition-colors";
  const navItemInactive = "text-base-content/70 hover:bg-base-300/60 hover:text-base-content";
  const navItemActive = "is-active border-info/40 text-info";

  return (
    <div className="
      flex flex-col size-full flex-1 min-h-0 min-w-0 rounded-tl-xl border-l
      border-t border-base-300
      dark:border-base-300
      bg-base-200 text-base-content
    ">
      <div className="
        flex items-center justify-between h-12 gap-2 min-w-0 border-b
        border-base-300
        dark:border-base-300
        rounded-tl-xl px-3
      ">
        <div className="min-w-0 font-semibold truncate">发现</div>
      </div>

      <div className="px-3 pt-3 pb-2">
        <div className="
          px-1 pb-2 text-[11px] font-semibold tracking-wider
          text-base-content/50
        ">
          局外素材
        </div>

        <div className="space-y-1">
          <Link
            to="/chat/discover/material"
            className={`
              ${navItemBase}
              ${activeItem === "material-public" ? navItemActive : navItemInactive}
            `}
            onClick={onCloseLeftDrawer}
          >
            <span className="
              size-2 rounded-full bg-warning opacity-70
              group-[.is-active]:bg-info group-[.is-active]:opacity-100
              group-hover:opacity-100
            " />
            素材广场
          </Link>
          <Link
            to="/chat/discover/material/my"
            className={`
              ${navItemBase}
              ${activeItem === "material-mine" ? navItemActive : navItemInactive}
            `}
            onClick={onCloseLeftDrawer}
          >
            <span className="
              size-2 rounded-full bg-base-content/30 opacity-70
              group-[.is-active]:bg-info group-[.is-active]:opacity-100
              group-hover:opacity-100
            " />
            我的素材包
          </Link>
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="
          px-1 pb-2 text-[11px] font-semibold tracking-wider
          text-base-content/50
        ">
          归档仓库
        </div>

        <div className="space-y-1">
          <Link
            to="/chat/discover"
            className={`
              ${navItemBase}
              ${activeItem === "repository-square" ? navItemActive : navItemInactive}
            `}
            onClick={onCloseLeftDrawer}
          >
            <span className="
              size-2 rounded-full bg-success opacity-70
              group-[.is-active]:bg-info group-[.is-active]:opacity-100
              group-hover:opacity-100
            " />
            广场
          </Link>
          <Link
            to="/chat/discover/my"
            className={`
              ${navItemBase}
              ${activeItem === "repository-my" ? navItemActive : navItemInactive}
            `}
            onClick={onCloseLeftDrawer}
          >
            <span className="
              size-2 rounded-full bg-info opacity-70
              group-[.is-active]:bg-info group-[.is-active]:opacity-100
              group-hover:opacity-100
            " />
            我的归档
          </Link>
        </div>
      </div>
    </div>
  );
}
