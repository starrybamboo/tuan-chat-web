import { HouseIcon, PackageIcon, SquaresFourIcon } from "@phosphor-icons/react";

export type MaterialPackageLibrarySidebarIcon = "house" | "package" | "squares";

export type MaterialPackageLibrarySidebarItem = {
  key: string;
  label: string;
  icon: MaterialPackageLibrarySidebarIcon;
  active?: boolean;
  onClick?: () => void;
};

type MaterialPackageLibrarySidebarProps = {
  description: string;
  items: MaterialPackageLibrarySidebarItem[];
  footerDescription: string;
};

const itemBaseClass = "flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition";

function SidebarItemIcon({
  icon,
  active = false,
}: {
  icon: MaterialPackageLibrarySidebarIcon;
  active?: boolean;
}) {
  const weight = active ? "fill" : "regular";

  switch (icon) {
    case "house":
      return <HouseIcon className="size-5 shrink-0" weight={weight} />;
    case "package":
      return <PackageIcon className="size-5 shrink-0" weight={weight} />;
    case "squares":
      return <SquaresFourIcon className="size-5 shrink-0" weight={weight} />;
    default:
      return null;
  }
}

export default function MaterialPackageLibrarySidebar({
  description,
  items,
  footerDescription,
}: MaterialPackageLibrarySidebarProps) {
  return (
    <div className="flex h-full flex-col bg-base-300/70 px-4 py-5 text-base-content">
      <div className="mb-8 px-2">
        <div className="text-[11px] uppercase tracking-[0.28em] text-base-content/45">Material</div>
        <div className="mt-2 text-xl font-semibold tracking-tight text-base-content">素材包</div>
        <div className="mt-2 text-sm leading-6 text-base-content/60">
          {description}
        </div>
      </div>

      <nav className="space-y-2">
        {items.map(item => {
          const className = `${itemBaseClass} ${
            item.active
              ? "bg-base-100 text-base-content shadow-lg"
              : "text-base-content/62 hover:bg-base-200 hover:text-base-content"
          }`;

          if (!item.onClick) {
            return (
              <div
                key={item.key}
                className={className}
              >
                <SidebarItemIcon icon={item.icon} active={item.active} />
                <span className="truncate">{item.label}</span>
              </div>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              className={className}
              onClick={item.onClick}
            >
              <SidebarItemIcon icon={item.icon} active={item.active} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-base-300 bg-base-100/65 px-4 py-4">
        <div className="text-sm font-medium text-base-content/90">当前模式</div>
        <div className="mt-2 text-xs leading-5 text-base-content/62">
          {footerDescription}
        </div>
      </div>
    </div>
  );
}
