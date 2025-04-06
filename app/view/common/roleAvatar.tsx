import { PopWindow } from "@/view/common/popWindow";
import { RoleDetail } from "@/view/common/roleDetail";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { tuanchat } from "../../../api/instance";

const sizeMap = {
  6: "w-6 h-6", // 24px
  8: "w-8 h-8", // 32px
  10: "w-10 h-10", // 40px
  12: "w-12 h-12", // 48px
  14: "w-14 h-14", // 56px
  16: "w-16 h-16", // 64px
  18: "w-18 h-18", // 72px
  20: "w-20 h-20", // 80px
  24: "w-24 h-24", // 96px
  30: "w-30 h-30", // 120px
  32: "w-32 h-32", // 128px
  36: "w-36 h-36", // 144px
} as const;

export default function RoleAvatarComponent({ avatarId, width, isRounded, withTitle, stopPopWindow = false }: { avatarId: number; width: keyof typeof sizeMap; isRounded: boolean; withTitle: boolean; stopPopWindow?: boolean }) {
  const avatarQuery = useQuery(
    {
      queryKey: ["avatarController.getRoleAvatar", avatarId],
      queryFn: () => tuanchat.avatarController.getRoleAvatar(avatarId),
      staleTime: 600000,
    },
  );

  // 控制角色详情的popWindow
  const [isOpen, setIsOpen] = useState(false);
  const roleAvatar = avatarQuery.data?.data;

  return (
    <div className="flex flex-col items-center space-x-2 space-y-2">
      <div className="avatar">
        <div className={`${sizeMap[width]} rounded${isRounded ? "-full" : ""}`}>
          <img
            src={avatarQuery.isPending || avatarQuery.error || !avatarQuery.data?.data?.avatarUrl ? undefined : roleAvatar?.avatarUrl}
            alt="Avatar"
            className="hover:scale-110 transition-transform"
            onClick={() => setIsOpen(true)}
          />
        </div>
      </div>
      {
        withTitle && <div className="text-xs truncate max-w-full">{avatarQuery.data?.data?.avatarTitle}</div>
      }
      <div className="absolute">
        {
          (isOpen && !stopPopWindow) && (
            <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)}>
              <RoleDetail roleId={roleAvatar?.roleId ?? -1}></RoleDetail>
            </PopWindow>
          )
        }
      </div>
    </div>
  );
}
