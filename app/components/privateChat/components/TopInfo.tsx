import { ChevronRight } from "@/icons";

export default function TopInfo({ setIsOpenLeftDrawer, currentContactUserInfo }: { setIsOpenLeftDrawer: (isOpen: boolean) => void; currentContactUserInfo: any }) {
  return (
    <div className="h-10 w-full bg-base-100 border-b border-base-300 flex items-center px-4 relative">
      <ChevronRight
        onClick={() => setIsOpenLeftDrawer(true)}
        className="size-6 sm:hidden"
      />
      <span className="text-center font-semibold line-clamp-1 absolute left-1/2 transform -translate-x-1/2">
        {currentContactUserInfo ? `${currentContactUserInfo.username}` : "互关列表"}
      </span>
    </div>
  );
}
