import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import { ChevronRight } from "@/icons";

export default function TopInfo({ currentContactUserInfo }: { setIsOpenLeftDrawer?: (isOpen: boolean) => void; currentContactUserInfo: any }) {
  const { handleOpenPrivate } = useChatPageLayoutContext();

  return (
    <div className="
      border-base-300
      dark:border-base-300
      border-b flex justify-between items-center overflow-visible relative z-10
    ">
      <div
        className="
          flex justify-between items-center w-full px-2 h-10 bg-white/40
          dark:bg-base-300/25
          backdrop-blur-xl border border-white/40
          dark:border-white/10
        "
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="sm:hidden">
            <button
              type="button"
              aria-label="打开好友列表"
              className="btn btn-ghost btn-square btn-sm"
              onClick={() => handleOpenPrivate()}
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
          <span className="
            text-base font-bold truncate leading-none min-w-0 text-left ml-1
          " title={currentContactUserInfo?.username ?? "好友列表"}>
            {currentContactUserInfo ? `「 ${currentContactUserInfo.username} 」` : "好友列表"}
          </span>
        </div>
        <div className="flex gap-2 items-center overflow-visible shrink-0" />
      </div>
    </div>
  );
}
