import type { MaterialPackageLibraryCardModel, MaterialPackageLibraryPlaceholderIcon } from "./materialPackageLibraryModels";
import {
  HouseIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { ContentCard } from "@/components/repository/home/RepositoryHome";

type MaterialPackageLibraryAction = {
  key: string;
  label: string;
  icon: "package" | "plus";
  variant?: "primary" | "secondary";
  onClick: () => void;
};

type MaterialPackageLibraryShortcut = {
  key: string;
  title: string;
  description: string;
  caption: string;
  icon?: "package" | "plus";
  onClick: () => void;
};

type MaterialPackageLibraryWorkspaceProps = {
  upperLabel: string;
  title: string;
  description: string;
  searchPlaceholder: string;
  keyword: string;
  items: MaterialPackageLibraryCardModel[];
  headerActions?: MaterialPackageLibraryAction[];
  shortcuts?: MaterialPackageLibraryShortcut[];
  emptyTitle: string;
  emptyDescription: string;
  loading: boolean;
  embedded?: boolean;
  skeletonPrefix: string;
  onKeywordChange: (value: string) => void;
  onOpenItem: (index: number) => void;
};

const paletteList = [
  "from-[#243b55] via-[#141e30] to-[#0b0f17]",
  "from-[#4338ca] via-[#1f2937] to-[#0f172a]",
  "from-[#7c2d12] via-[#1f2937] to-[#111827]",
  "from-[#0f766e] via-[#164e63] to-[#172033]",
  "from-[#4c1d95] via-[#1f2937] to-[#0f172a]",
  "from-[#9f1239] via-[#312e81] to-[#0f172a]",
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

function ActionIcon({
  icon,
  className = "size-4",
  weight = "bold",
}: {
  icon: "house" | "package" | "plus";
  className?: string;
  weight?: "bold" | "fill" | "regular";
}) {
  switch (icon) {
    case "house":
      return <HouseIcon className={className} weight={weight} />;
    case "package":
      return <PackageIcon className={className} weight={weight} />;
    case "plus":
      return <PlusIcon className={className} weight={weight} />;
    default:
      return null;
  }
}

function MaterialCard({
  item,
  onClick,
}: {
  item: MaterialPackageLibraryCardModel;
  onClick: () => void;
}) {
  const placeholderPalette = getPlaceholderPalette(item.placeholderSeed);
  const placeholderIcon: MaterialPackageLibraryPlaceholderIcon = item.placeholderIcon;
  const metadata = [
    `${item.materialCount} 个素材`,
    `${item.folderCount} 个文件夹`,
    `${item.messageCount} 条消息`,
  ];

  return (
    <ContentCard
      image={item.coverUrl}
      title={item.name}
      subtitle={item.subtitle}
      content={item.description || "暂无描述"}
      badgeLabel={item.badgeLabel}
      hoverMetadata={metadata}
      imageAspect="square"
      hoverHint="点击查看素材包"
      placeholder={(
        <div className={`flex h-full w-full items-center justify-center bg-linear-to-br ${placeholderPalette}`}>
          <div className="rounded-[22px] border border-white/12 bg-black/12 p-6 text-white/72 backdrop-blur-sm">
            <ActionIcon
              icon={placeholderIcon}
              className="size-10"
              weight="fill"
            />
          </div>
        </div>
      )}
      onClick={onClick}
    />
  );
}

function ShortcutCard({
  title,
  description,
  caption,
  icon = "plus",
  onClick,
}: MaterialPackageLibraryShortcut) {
  return (
    <button
      type="button"
      className="group text-left"
      onClick={onClick}
    >
      <div className="flex h-full flex-col">
        <div className="flex aspect-[1.25/1] items-center justify-center rounded-[26px] border border-dashed border-primary/30 bg-base-100/30 text-primary/75 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:bg-primary/[0.06] hover:text-primary">
          <div className="rounded-[22px] border border-primary/12 bg-primary/[0.08] p-6">
            <ActionIcon icon={icon} className="size-10" />
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

export default function MaterialPackageLibraryWorkspace({
  upperLabel,
  title,
  description,
  searchPlaceholder,
  keyword,
  items,
  headerActions = [],
  shortcuts = [],
  emptyTitle,
  emptyDescription,
  loading,
  embedded = false,
  skeletonPrefix,
  onKeywordChange,
  onOpenItem,
}: MaterialPackageLibraryWorkspaceProps) {
  const topBarInfo = loading ? "加载中" : `${items.length} 个素材包`;

  return (
    <div className={`h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,oklch(var(--p)/0.1),transparent_26%),linear-gradient(180deg,oklch(var(--b2)/0.98),oklch(var(--b1)/1))] text-base-content ${embedded ? "" : "border-t border-base-300"}`}>
      {embedded && (
        <div className="sticky top-0 z-20 border-t border-b border-gray-300 bg-base-200 dark:border-gray-700">
          <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-4 px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="truncate text-sm font-semibold text-base-content">{title}</div>
              <span className="hidden rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[11px] text-base-content/68 sm:inline-flex">
                {topBarInfo}
              </span>
            </div>

            <div className="flex min-w-0 items-center justify-end gap-3">
              {headerActions.length > 0 && (
                <div className="hidden items-center gap-2 sm:flex">
                  {headerActions.map(action => (
                    <button
                      key={action.key}
                      type="button"
                      className={action.variant === "secondary"
                        ? "inline-flex h-8 items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-3 text-xs font-semibold text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                        : "inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/35 bg-primary px-3 text-xs font-semibold text-primary-content transition hover:border-primary/45 hover:brightness-105"}
                      onClick={action.onClick}
                    >
                      <ActionIcon icon={action.icon} className="size-3.5" />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative w-full max-w-90">
                <label className="flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2">
                  <MagnifyingGlassIcon className="size-4 shrink-0 text-base-content/38" />
                  <input
                    type="text"
                    className="w-full bg-transparent text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none"
                    placeholder={searchPlaceholder}
                    value={keyword}
                    onChange={event => onKeywordChange(event.target.value)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`mx-auto w-full ${embedded ? "max-w-6xl px-5 py-6 md:px-8" : "max-w-[1560px] px-6 py-8 md:px-10 md:py-10"}`}>
        <div className="space-y-8">
          {!embedded && (
            <>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">
                    {upperLabel}
                  </div>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-base-content md:text-6xl">{title}</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/62 md:text-base">
                    {description}
                  </p>
                </div>

                {headerActions.length > 0 && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    {headerActions.map(action => (
                      <button
                        key={action.key}
                        type="button"
                        className={action.variant === "secondary"
                          ? "inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-5 py-3 text-sm font-semibold text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                          : "inline-flex items-center gap-2 rounded-md border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"}
                        onClick={action.onClick}
                      >
                        <ActionIcon icon={action.icon} />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-base-300 bg-base-100/80 px-5 py-4 shadow-lg">
                <label className="flex items-center gap-3">
                  <MagnifyingGlassIcon className="size-5 shrink-0 text-base-content/38" />
                  <input
                    type="text"
                    className="w-full rounded-md border border-transparent bg-transparent text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder={searchPlaceholder}
                    value={keyword}
                    onChange={event => onKeywordChange(event.target.value)}
                  />
                </label>
              </div>
            </>
          )}

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {shortcuts.map(shortcut => (
              <ShortcutCard
                key={shortcut.key}
                title={shortcut.title}
                description={shortcut.description}
                caption={shortcut.caption}
                icon={shortcut.icon}
                onClick={shortcut.onClick}
              />
            ))}

            {loading && Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`${skeletonPrefix}-${index}`}
                className="aspect-[1.25/1.42] animate-pulse rounded-[26px] border border-base-300 bg-base-100/55"
              />
            ))}

            {!loading && items.map((item, index) => (
              <MaterialCard
                key={item.key}
                item={item}
                onClick={() => onOpenItem(index)}
              />
            ))}
          </div>

          {!loading && items.length === 0 && (
            <div className="rounded-[26px] border border-dashed border-base-300 bg-base-100/55 px-6 py-14 text-center">
              <div className="text-lg font-semibold text-base-content">{emptyTitle}</div>
              <div className="mt-3 text-sm leading-7 text-base-content/58">
                {emptyDescription}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
