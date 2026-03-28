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
    <div className="flex h-full flex-col bg-[#070c13] px-4 py-5 text-white">
      <div className="mb-8 px-2">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/35">Material</div>
        <div className="mt-2 text-xl font-semibold tracking-tight text-white/92">素材包</div>
        <div className="mt-2 text-sm leading-6 text-white/40">
          在这里切换素材广场与我的素材包。
        </div>
      </div>

      <nav className="space-y-2">
        <button
          type="button"
          className={`${itemBaseClass} ${
            activeTab === "public"
              ? "bg-white/[0.08] text-white shadow-[0_10px_24px_rgba(15,23,42,0.32)]"
              : "text-white/62 hover:bg-white/[0.04] hover:text-white/88"
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
              ? "bg-white/[0.08] text-white shadow-[0_10px_24px_rgba(15,23,42,0.32)]"
              : "text-white/62 hover:bg-white/[0.04] hover:text-white/88"
          }`}
          onClick={() => onSelectTab("mine")}
        >
          <PackageIcon className="size-5 shrink-0" weight={activeTab === "mine" ? "fill" : "regular"} />
          <span className="truncate">我的素材包</span>
        </button>
      </nav>

      <div className="mt-auto rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-4">
        <div className="text-sm font-medium text-white/82">当前模式</div>
        <div className="mt-2 text-xs leading-5 text-white/42">
          {activeTab === "mine"
            ? "你可以新建、编辑、删除自己的素材包。"
            : "这里展示公开的素材包，默认以只读方式查看。"}
        </div>
      </div>
    </div>
  );
}
