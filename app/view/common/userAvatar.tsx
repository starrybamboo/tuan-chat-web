import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "../../../api/instance";

// 如果是 import 的sizeMap 就不能在className中用了, 于是复制了一份, 够丑的 :(
const sizeMap = {
  6: "w-6 h-6", // 24px
  8: "w-8 h-8", // 32px
  10: "w-10 h-10", // 40px
  12: "w-12 h-12", // 48px
  18: "w-18 h-18", // 72px
  20: "w-20 h-20", // 80px
  24: "w-24 h-24", // 96px
  30: "w-30 h-30", // 120px
  32: "w-32 h-32", // 128px
  36: "w-36 h-36", // 144px
} as const;

export default function UserAvatarComponent({ userId, width, isRounded, withName = false }: { userId: number; width: keyof typeof sizeMap; isRounded: boolean; withName: boolean }) {
  const userQuery = useQuery({
    queryKey: ["avatarController.getUserAvatar", userId],
    queryFn: () => tuanchat.userController.getUserInfo(userId),
  });

  return (
    <div className="w-full flex flex-row items-center space-x-2 space-y-2">
      <div className="avatar w-">
        <div className={`${sizeMap[width]} rounded${isRounded ? "-full" : ""}`}>
          <img
            src={userQuery.isPending || userQuery.error || !userQuery.data?.data?.avatar ? "?" : userQuery.data?.data?.avatar}
            alt="Avatar"
          />
        </div>
      </div>
      {
        withName && (
          <div className={`text-sm ${(userQuery.data?.data?.username ?? "").length > 5 ? "truncate max-w-[7em]" : ""}`}>
            {userQuery.data?.data?.username}
          </div>
        )
      }
    </div>

  );
}
