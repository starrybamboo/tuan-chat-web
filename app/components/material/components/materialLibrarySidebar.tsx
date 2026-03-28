import { PackageIcon, SquaresFourIcon } from "@phosphor-icons/react";

type MaterialLibrarySidebarProps = {
  activeTab: "public" | "mine";
  onSelectTab: (tab: "public" | "mine") => void;
};

const itemBaseClass = "flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-sm font-medium transition";

export default function MaterialLibrarySidebar({
  activeTab,
  onSelectTab,
}: MaterialLibrarySidebarProps) {
  return (
    <div className="flex h-full flex-col bg-base-300/70 px-4 py-5 text-base-content">
      <div className="mb-8 px-2">
        <div className="text-[11px] uppercase tracking-[0.28em] text-base-content/45">Material</div>
        <div className="mt-2 text-xl font-semibold tracking-tight text-base-content">素材包</div>
        <div className="mt-2 text-sm leading-6 text-base-content/60">
          在这里切换素材广场与我的素材包。
        </div>
      </div>

      <nav className="space-y-2">
        <button
          type="button"
          className={`${itemBaseClass} ${
            activeTab === "public"
              ? "bg-base-100 text-base-content shadow-lg"
              : "text-base-content/62 hover:bg-base-200 hover:text-base-content"
          }`}
          onClick={() => onSelectTab("public")}
        >
          <SquaresFourIcon className="size-5 shrink-0" weight={activeTab === "public" ? "fill" : "regular"} />
          <span className="truncate">素材广场</span>
        </button>

        <button
          type="button"
          className={`${itemBaseClass} ${
            activeTab === "mine"
              ? "bg-base-100 text-base-content shadow-lg"
              : "text-base-content/62 hover:bg-base-200 hover:text-base-content"
          }`}
          onClick={() => onSelectTab("mine")}
        >
          <PackageIcon className="size-5 shrink-0" weight={activeTab === "mine" ? "fill" : "regular"} />
          <span className="truncate">我的素材包</span>
        </button>
      </nav>

      <div className="mt-auto rounded-2xl border border-base-300 bg-base-100/65 px-4 py-4">
        <div className="text-sm font-medium text-base-content/90">当前模式</div>
        <div className="mt-2 text-xs leading-5 text-base-content/62">
          {activeTab === "mine"
            ? "你可以新建、编辑、删除自己的素材包。"
            : "这里展示公开的素材包，默认以只读方式查看。"}
        </div>
      </div>
    </div>
  );
}
