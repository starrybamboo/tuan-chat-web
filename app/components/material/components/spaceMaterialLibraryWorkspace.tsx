import type { SpaceMaterialPackageResponse } from "../../../../api/models/SpaceMaterialPackageResponse";
import {
  HouseIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";

interface SpaceMaterialLibraryWorkspaceProps {
  keyword: string;
  packages: SpaceMaterialPackageResponse[];
  loading: boolean;
  onKeywordChange: (value: string) => void;
  onOpenPackage: (spacePackageId: number) => void;
  onCreatePackage: () => void;
  onImportPackage: () => void;
  onNavigateToPublic: () => void;
  onNavigateToMine: () => void;
}

const paletteList = [
  "from-[#243b55] via-[#141e30] to-[#0b0f17]",
  "from-[#4338ca] via-[#1f2937] to-[#0f172a]",
  "from-[#7c2d12] via-[#1f2937] to-[#111827]",
  "from-[#0f766e] via-[#164e63] to-[#172033]",
  "from-[#4c1d95] via-[#1f2937] to-[#0f172a]",
  "from-[#9f1239] via-[#312e81] to-[#0f172a]",
];

const skeletonIds = [
  "space-material-skeleton-1",
  "space-material-skeleton-2",
  "space-material-skeleton-3",
  "space-material-skeleton-4",
  "space-material-skeleton-5",
  "space-material-skeleton-6",
];

function getPlaceholderPalette(seed: string) {
  const normalized = seed.trim();
  if (!normalized) {
    return paletteList[0];
  }

  let total = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    total += normalized.charCodeAt(index);
  }
  return paletteList[total % paletteList.length];
}

function SpaceMaterialCard({
  item,
  onClick,
}: {
  item: SpaceMaterialPackageResponse;
  onClick: () => void;
}) {
  const name = item.name?.trim() || "未命名局内素材包";
  const subtitle = item.sourcePackageId
    ? `来源局外素材包 #${item.sourcePackageId}`
    : "当前空间的本地素材包";
  const placeholderPalette = getPlaceholderPalette(`${name}${item.spacePackageId ?? ""}`);

  return (
    <button
      type="button"
      className="group text-left"
      onClick={onClick}
    >
      <div className="overflow-hidden rounded-[26px] border border-base-300 bg-base-100/86 shadow-lg transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
        <div className="relative aspect-[1.25/1] overflow-hidden">
          {item.coverUrl
            ? (
                <img
                  src={item.coverUrl}
                  alt={name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              )
            : (
                <div className={`flex h-full w-full items-center justify-center bg-linear-to-br ${placeholderPalette}`}>
                  <div className="rounded-[22px] border border-white/12 bg-black/12 p-6 text-white/72 backdrop-blur-sm">
                    <HouseIcon className="size-10" weight="fill" />
                  </div>
                </div>
              )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-base-content/45 via-base-content/12 to-transparent" />

          <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-base-300 bg-base-100/85 px-3 py-1 text-[11px] font-medium text-base-content/82 backdrop-blur-sm">
            {item.sourcePackageId ? "导入副本" : "局内素材"}
          </div>
        </div>

        <div className="space-y-3 px-3 pb-4 pt-4">
          <div>
            <div className="line-clamp-1 text-lg font-semibold text-base-content">{name}</div>
            <div className="mt-1 line-clamp-1 text-sm text-base-content/55">{subtitle}</div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-base-content/55">
            <span>{`${item.materialCount ?? 0} 个素材`}</span>
            <span>{`${item.folderCount ?? 0} 个文件夹`}</span>
            <span>{`${item.messageCount ?? 0} 条消息`}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ShortcutCard({
  title,
  description,
  caption,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  caption: string;
  icon: typeof PlusIcon;
  onClick: () => void;
}) {
  const Icon = icon;

  return (
    <button
      type="button"
      className="group text-left"
      onClick={onClick}
    >
      <div className="flex h-full flex-col">
        <div className="flex aspect-[1.25/1] items-center justify-center rounded-[26px] border border-dashed border-primary/30 bg-base-100/30 text-primary/75 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:bg-primary/[0.06] hover:text-primary">
          <div className="rounded-[22px] border border-primary/12 bg-primary/[0.08] p-6">
            <Icon className="size-10" weight="bold" />
          </div>
        </div>
        <div className="space-y-2 px-1 pt-4">
          <div className="text-lg font-semibold text-base-content">{title}</div>
          <div className="text-sm text-base-content/62">{description}</div>
          <div className="text-xs text-base-content/45">{caption}</div>
        </div>
      </div>
    </button>
  );
}

export default function SpaceMaterialLibraryWorkspace({
  keyword,
  packages,
  loading,
  onKeywordChange,
  onOpenPackage,
  onCreatePackage,
  onImportPackage,
  onNavigateToPublic,
  onNavigateToMine,
}: SpaceMaterialLibraryWorkspaceProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto border-t border-base-300 bg-[radial-gradient(circle_at_top_left,oklch(var(--p)/0.1),transparent_26%),linear-gradient(180deg,oklch(var(--b2)/0.98),oklch(var(--b1)/1))] text-base-content">
      <div className="mx-auto w-full max-w-[1560px] px-6 py-8 md:px-10 md:py-10">
        <div className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-5 py-3 text-sm font-semibold text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
              onClick={onImportPackage}
            >
              <PackageIcon className="size-4" weight="regular" />
              <span>从局外导入</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
              onClick={onCreatePackage}
            >
              <PlusIcon className="size-4" weight="bold" />
              <span>新建局内素材包</span>
            </button>
          </div>

          <div className="rounded-[24px] border border-base-300 bg-base-100/80 px-5 py-4 shadow-lg">
            <label className="flex items-center gap-3">
              <MagnifyingGlassIcon className="size-5 shrink-0 text-base-content/38" />
              <input
                type="text"
                className="w-full rounded-md border border-transparent bg-transparent text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="搜索当前空间的素材包、导入副本或章节内容..."
                value={keyword}
                onChange={event => onKeywordChange(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <ShortcutCard
              title="前往素材广场"
              description="浏览公开分享的素材包，像查看远端仓库一样快速切换和检索。"
              caption="查看全局公开素材"
              icon={SquaresFourIcon}
              onClick={onNavigateToPublic}
            />

            <ShortcutCard
              title="前往我的素材包"
              description="切换到你的个人素材区，管理自己的局外素材包与云端沉淀内容。"
              caption="查看你自己的素材包"
              icon={PackageIcon}
              onClick={onNavigateToMine}
            />

            {loading && skeletonIds.map(skeletonId => (
              <div
                key={skeletonId}
                className="aspect-[1.25/1.42] rounded-[26px] border border-base-300 bg-base-100/55 animate-pulse"
              />
            ))}

            {!loading && packages.map(item => (
              <SpaceMaterialCard
                key={item.spacePackageId ?? `space-material-package-${item.name ?? "unknown"}`}
                item={item}
                onClick={() => {
                  if (typeof item.spacePackageId === "number") {
                    onOpenPackage(item.spacePackageId);
                  }
                }}
              />
            ))}
          </div>

          {!loading && packages.length === 0 && (
            <div className="rounded-[26px] border border-dashed border-base-300 bg-base-100/55 px-6 py-14 text-center">
              <div className="text-lg font-semibold text-base-content">当前空间还没有局内素材包</div>
              <div className="mt-3 text-sm leading-7 text-base-content/58">
                你可以先新建一个局内素材包，或者从局外素材库整包导入，把它当作当前空间的本地素材工作区。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
