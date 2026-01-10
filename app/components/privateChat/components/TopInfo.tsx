import { ChevronRight } from "@/icons";

export default function TopInfo({ setIsOpenLeftDrawer, currentContactUserInfo }: { setIsOpenLeftDrawer: (isOpen: boolean) => void; currentContactUserInfo: any }) {
  return (
    <div className="border-gray-300 dark:border-gray-700 border-b border-t flex justify-between items-center overflow-visible relative z-10">
      <div
        className="flex justify-between items-center w-full px-2 h-10
        bg-white/40 dark:bg-slate-950/25 backdrop-blur-xl
        border border-white/40 dark:border-white/10"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="sm:hidden">
            <button
              type="button"
              aria-label="打开左侧边栏"
              className="btn btn-ghost btn-square btn-sm"
              onClick={() => setIsOpenLeftDrawer(true)}
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
          <span className="text-base font-bold truncate leading-none min-w-0 text-left ml-1">
            {currentContactUserInfo ? `「 ${currentContactUserInfo.username} 」` : "好友列表"}
          </span>
        </div>
        <div className="flex gap-2 items-center overflow-visible flex-shrink-0" />
      </div>
    </div>
  );
}
