import type { MaterialPackageResponse } from "../../../../api/models/MaterialPackageResponse";
import { MagnifyingGlassIcon, PackageIcon, PlusIcon } from "@phosphor-icons/react";

type MaterialLibraryWorkspaceProps = {
  activeTab: "public" | "mine";
  keyword: string;
  packages: MaterialPackageResponse[];
  loading: boolean;
  embedded?: boolean;
  onKeywordChange: (value: string) => void;
  onOpenPackage: (packageId: number) => void;
  onCreatePackage: () => void;
  onNavigateToMine?: () => void;
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

function MaterialCard({
  item,
  activeTab,
  onClick,
}: {
  item: MaterialPackageResponse;
  activeTab: "public" | "mine";
  onClick: () => void;
}) {
  const name = item.name?.trim() || "未命名素材包";
  const subtitle = activeTab === "mine"
    ? `已被导入 ${item.importCount ?? 0} 次`
    : `贡献人 · ${item.username?.trim() || "未知"}`;
  const placeholderPalette = getPlaceholderPalette(`${name}${item.packageId ?? ""}`);

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
                    <PackageIcon className="size-10" weight="fill" />
                  </div>
                </div>
              )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-base-content/45 via-base-content/12 to-transparent" />

          <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-base-300 bg-base-100/85 px-3 py-1 text-[11px] font-medium text-base-content/82 backdrop-blur-sm">
            {activeTab === "mine" ? "我的素材" : "公开素材"}
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
  onClick,
}: {
  title: string;
  description: string;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="group text-left"
      onClick={onClick}
    >
      <div className="flex h-full flex-col">
        <div className="flex aspect-[1.25/1] items-center justify-center rounded-[26px] border border-dashed border-primary/30 bg-base-100/30 text-primary/75 transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:bg-primary/[0.06] hover:text-primary">
          <div className="rounded-[22px] border border-primary/12 bg-primary/[0.08] p-6">
            <PlusIcon className="size-10" weight="bold" />
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

export default function MaterialLibraryWorkspace({
  activeTab,
  keyword,
  packages,
  loading,
  embedded = false,
  onKeywordChange,
  onOpenPackage,
  onCreatePackage,
  onNavigateToMine,
}: MaterialLibraryWorkspaceProps) {
  const title = activeTab === "mine" ? "我的素材包" : "素材广场";
  const description = activeTab === "mine"
    ? "管理并组织你的数字化创意资产。通过统一的浏览与编辑视图，快速找到每一个灵感瞬间。"
    : "浏览公开分享的素材包，快速查看素材结构、贡献信息与内容规模。";

  return (
    <div className={`h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,oklch(var(--p)/0.1),transparent_26%),linear-gradient(180deg,oklch(var(--b2)/0.98),oklch(var(--b1)/1))] text-base-content ${embedded ? "" : "border-t border-base-300"}`}>
      <div className={`mx-auto w-full max-w-[1560px] ${embedded ? "px-5 py-6 md:px-8" : "px-6 py-8 md:px-10 md:py-10"}`}>
        <div className="space-y-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">
                {activeTab === "mine" ? "Personal Library" : "Public Square"}
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-base-content md:text-6xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-base-content/62 md:text-base">
                {description}
              </p>
            </div>

            {activeTab === "mine" && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
                onClick={onCreatePackage}
              >
                <PlusIcon className="size-4" weight="bold" />
                <span>新建素材包</span>
              </button>
            )}
          </div>

          <div className="rounded-[24px] border border-base-300 bg-base-100/80 px-5 py-4 shadow-lg">
            <label className="flex items-center gap-3">
              <MagnifyingGlassIcon className="size-5 shrink-0 text-base-content/38" />
              <input
                type="text"
                className="w-full rounded-md border border-transparent bg-transparent text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder={activeTab === "mine" ? "搜索我的素材资产、标签或分类..." : "搜索公共素材包、标签或分类..."}
                value={keyword}
                onChange={event => onKeywordChange(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {activeTab === "mine" && (
              <ShortcutCard
                title="创建新的素材包"
                description="从一个空包开始，逐步整理和沉淀你自己的素材集合。"
                caption="创建后即可进入编辑"
                onClick={onCreatePackage}
              />
            )}

            {activeTab === "public" && onNavigateToMine && (
              <ShortcutCard
                title="前往我的素材包"
                description="切换到个人素材区，继续新建、管理和维护你的私有素材库。"
                caption="适合沉淀你自己的常用内容"
                onClick={onNavigateToMine}
              />
            )}

            {loading && Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`material-skeleton-${index}`}
                className="aspect-[1.25/1.42] rounded-[26px] border border-base-300 bg-base-100/55 animate-pulse"
              />
            ))}

            {!loading && packages.map(item => (
              <MaterialCard
                key={item.packageId ?? `material-package-${item.name ?? "unknown"}`}
                item={item}
                activeTab={activeTab}
                onClick={() => {
                  if (typeof item.packageId === "number") {
                    onOpenPackage(item.packageId);
                  }
                }}
              />
            ))}
          </div>

          {!loading && packages.length === 0 && (
            <div className="rounded-[26px] border border-dashed border-base-300 bg-base-100/55 px-6 py-14 text-center">
              <div className="text-lg font-semibold text-base-content">
                {activeTab === "mine" ? "你还没有自己的素材包" : "当前没有匹配的公开素材包"}
              </div>
              <div className="mt-3 text-sm leading-7 text-base-content/58">
                {activeTab === "mine"
                  ? "可以先新建一个素材包，开始组织你的素材与消息模板。"
                  : "换个关键词试试，或者稍后再来看看新的公开内容。"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
