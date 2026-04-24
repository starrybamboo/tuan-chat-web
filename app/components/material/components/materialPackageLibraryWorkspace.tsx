import type { MaterialPackageLibraryCardModel, MaterialPackageLibraryPlaceholderIcon } from "./materialPackageLibraryModels";
import {
  HouseIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlusIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { ContentCard } from "@/components/repository/home/RepositoryHome";

interface MaterialPackageLibraryAction {
  key: string;
  label: string;
  icon: "package" | "plus";
  variant?: "primary" | "secondary";
  onClick: () => void;
}

interface MaterialPackageLibraryShortcut {
  key: string;
  title: string;
  description: string;
  caption: string;
  icon?: "package" | "plus";
  onClick: () => void;
}

interface MaterialPackageLibraryWorkspaceProps {
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
}

const paletteList = [
  "from-[#243b55] via-[#141e30] to-[#0b0f17]",
  "from-[#4338ca] via-[#1f2937] to-[#0f172a]",
  "from-[#7c2d12] via-[#1f2937] to-[#111827]",
  "from-[#0f766e] via-[#164e63] to-[#172033]",
  "from-[#4c1d95] via-[#1f2937] to-[#0f172a]",
  "from-[#9f1239] via-[#312e81] to-[#0f172a]",
];

const EMPTY_HEADER_ACTIONS: MaterialPackageLibraryAction[] = [];
const EMPTY_SHORTCUTS: MaterialPackageLibraryShortcut[] = [];

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
      className="group w-full rounded-md text-left transition-all duration-300 ease-in-out"
      onClick={onClick}
    >
      <div className="flex h-full flex-col">
        <div className="relative overflow-hidden rounded-md border border-dashed border-primary/30 bg-base-200 text-primary/75 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:bg-primary/6 group-hover:text-primary">
          <div className="flex aspect-square w-full items-center justify-center">
            <div className="rounded-md border border-primary/12 bg-primary/8 p-6 shadow-sm">
              <ActionIcon icon={icon} className="size-10" />
            </div>
          </div>
        </div>
        <div className="px-1 text-base">
          <div className="mt-4 text-lg font-bold leading-7 text-base-content line-clamp-2">
            {title}
          </div>
          <div className="mt-3 text-sm leading-relaxed text-base-content/80 line-clamp-3">
            {description}
          </div>
          <div className="mt-3 text-xs text-base-content/55 line-clamp-2">
            {caption}
          </div>
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
  headerActions = EMPTY_HEADER_ACTIONS,
  shortcuts = EMPTY_SHORTCUTS,
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
    <div className={`h-full min-h-0 overflow-y-auto text-base-content ${embedded ? "bg-base-300/40" : "bg-[radial-gradient(circle_at_top_left,oklch(var(--p)/0.1),transparent_26%),linear-gradient(180deg,oklch(var(--b2)/0.98),oklch(var(--b1)/1))] border-t border-base-300"}`}>
      {embedded && (
        <div className="sticky top-0 z-20 border-t border-b border-gray-300 bg-base-200/95 backdrop-blur dark:border-gray-700">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="truncate text-sm font-semibold text-base-content">{title}</div>
              <span className="hidden rounded-full border border-base-300 bg-base-100 px-2 py-0.5 text-[11px] text-base-content/68 sm:inline-flex">
                {topBarInfo}
              </span>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              {headerActions.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {headerActions.map(action => (
                    <button
                      key={action.key}
                      type="button"
                      className={action.variant === "secondary"
                        ? "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-base-300 bg-base-100 px-3 text-xs font-semibold text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                        : "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary px-3 text-xs font-semibold text-primary-content transition hover:border-primary/45 hover:brightness-105"}
                      onClick={action.onClick}
                    >
                      <ActionIcon icon={action.icon} className="size-3.5" />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative w-full sm:w-[22rem]">
                <label className="flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
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

      <div className={`mx-auto w-full ${embedded ? "max-w-6xl px-4 py-5 sm:px-6 md:px-8 md:py-6" : "max-w-390 px-4 py-6 sm:px-6 md:px-10 md:py-10"}`}>
        <div className="space-y-8">
          {embedded && (
            <div className="relative overflow-hidden rounded-xl border border-base-300 bg-info/10">
              <SparkleIcon
                aria-hidden="true"
                weight="duotone"
                className="pointer-events-none absolute -right-24 -top-24 hidden h-88 w-88 text-primary/15 sm:block"
              />
              <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-10">
                <div className="text-2xl font-extrabold tracking-tight text-base-content sm:text-4xl">
                  {title === "我的素材包" ? "这里是你的素材包" : "探索公开的素材包"}
                </div>
                <div className="mt-3 max-w-2xl text-sm text-base-content/70 sm:text-base">
                  {title === "我的素材包"
                    ? "管理和沉淀你自己的素材包，随时回到熟悉的内容集合继续编辑与整理。"
                    : "浏览公开分享的素材包，快速查看结构、内容规模和可复用的灵感素材。"}
                </div>
              </div>
            </div>
          )}

          {!embedded && (
            <>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">
                    {upperLabel}
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-base-content sm:text-4xl md:text-6xl">{title}</h1>
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
                          ? "inline-flex w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-5 py-3 text-sm font-semibold text-base-content transition hover:border-primary/30 hover:bg-base-100/90 sm:w-auto"
                          : "inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)] sm:w-auto"}
                        onClick={action.onClick}
                      >
                        <ActionIcon icon={action.icon} />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-base-300 bg-base-100/80 px-4 py-3 shadow-lg sm:px-5 sm:py-4">
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

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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

            {loading && Array.from({ length: 6 }, (_, slot) => slot).map(slot => (
              <div
                key={`${skeletonPrefix}-${slot}`}
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
            <div className="rounded-[26px] border border-dashed border-base-300 bg-base-100/55 px-5 py-12 text-center sm:px-6 sm:py-14">
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
