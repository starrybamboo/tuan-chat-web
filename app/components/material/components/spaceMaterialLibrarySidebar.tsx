import { HouseIcon, PackageIcon, SquaresFourIcon } from "@phosphor-icons/react";

interface SpaceMaterialLibrarySidebarProps {
  spaceId: number;
  onNavigateToPublic: () => void;
  onNavigateToMine: () => void;
}

const itemBaseClass = "flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition";

export default function SpaceMaterialLibrarySidebar({
  spaceId,
  onNavigateToPublic,
  onNavigateToMine,
}: SpaceMaterialLibrarySidebarProps) {
  return (
    <div className="flex h-full flex-col bg-base-300/70 px-4 py-5 text-base-content">
      <div className="mb-8 px-2">
        <div className="text-[11px] uppercase tracking-[0.28em] text-base-content/45">Material</div>
        <div className="mt-2 text-xl font-semibold tracking-tight text-base-content">素材包</div>
        <div className="mt-2 text-sm leading-6 text-base-content/60">
          局内素材包和局外素材包保持同一种工作区体验，当前只在访问路径和数据来源上区分。
        </div>
      </div>

      <nav className="space-y-2">
        <div className={`${itemBaseClass} bg-base-100 text-base-content shadow-lg`}>
          <HouseIcon className="size-5 shrink-0" weight="fill" />
          <span className="truncate">{`当前空间 · Space ${spaceId}`}</span>
        </div>

        <button
          type="button"
          className={`${itemBaseClass} text-base-content/62 hover:bg-base-200 hover:text-base-content`}
          onClick={onNavigateToPublic}
        >
          <SquaresFourIcon className="size-5 shrink-0" />
          <span className="truncate">素材广场</span>
        </button>

        <button
          type="button"
          className={`${itemBaseClass} text-base-content/62 hover:bg-base-200 hover:text-base-content`}
          onClick={onNavigateToMine}
        >
          <PackageIcon className="size-5 shrink-0" />
          <span className="truncate">我的素材包</span>
        </button>
      </nav>

      <div className="mt-auto rounded-2xl border border-base-300 bg-base-100/65 px-4 py-4">
        <div className="text-sm font-medium text-base-content/90">当前模式</div>
        <div className="mt-2 text-xs leading-5 text-base-content/62">
          当前页面展示的是当前空间的本地素材包副本区，可以像管理本地仓库一样组织和编辑素材。
        </div>
      </div>
    </div>
  );
}
