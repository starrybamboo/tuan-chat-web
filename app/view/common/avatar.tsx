import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "../../../api/instance";

// eslint-disable-next-line react-refresh/only-export-components
export const sizeMap = {
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

export default function AvatarComponent({ avatarId, width, isRounded }: { avatarId: number; width: keyof typeof sizeMap; isRounded: boolean }) {
  const avatarQuery = useQuery(
    {
      queryKey: ["avatarController.getRoleAvatar", avatarId],
      queryFn: () => tuanchat.avatarController.getRoleAvatar(avatarId),
    },
  );

  return (
    <div className="avatar w-">
      <div className={`${sizeMap[width]} rounded${isRounded ? "-full" : ""}`}>
        <img
          src={avatarQuery.isPending || avatarQuery.error || !avatarQuery.data?.data?.avatarUrl ? "" : avatarQuery.data?.data?.avatarUrl}
          alt="Avatar"
        />
      </div>
    </div>
  );
}
