import { RoomContext } from "@/components/chat/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { RoleDetail } from "@/components/common/roleDetail";
import { getScreenSize } from "@/utils/getScreenSize";
import { use } from "react";
import {
  useGetRoleAvatarQuery,
} from "../../../api/queryHooks";

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

/**
 * 用户头像组件
 * @param avatarId
 * @param width 头像宽度尺寸
 * @param isRounded 是否显示为圆形头像（true的时候是rounded-full，false的时候是rounded）
 * @param withTitle 是否显示头像对应的标题（并非roleName）
 * @param stopPopWindow 是否禁用点击弹出角色详情窗口，默认为false
 * @param alt
 */
export default function RoleAvatarComponent({ avatarId, width, isRounded, withTitle = false, stopPopWindow = false, alt = "avatar" }: {
  avatarId: number;
  width: keyof typeof sizeMap; // 头像的宽度
  isRounded: boolean; // 是否是圆的
  withTitle?: boolean; // 是否在下方显示标题
  stopPopWindow?: boolean; // 点击后是否会产生roleDetail弹窗
  alt?: string;
}) {
  const avatarQuery = useGetRoleAvatarQuery(avatarId);
  const roleAvatar = avatarQuery.data?.data;
  const roleId = roleAvatar?.roleId;

  // 控制角色详情的popWindow
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`rolePop${roleId}`, false);

  const roomContext = use(RoomContext);
  const roomId = roomContext?.roomId ?? -1;

  return (
    <div className="flex flex-col items-center">
      <div className="avatar">
        <div className={`${sizeMap[width]} rounded${isRounded && roleAvatar?.avatarUrl ? "-full" : ""} text-center flex content-center`}>
          {!roleAvatar?.avatarUrl
            ? (
                <span className={`${sizeMap[width]} text-sm`}>{alt}</span>
              )
            : (
                <img
                  src={roleAvatar?.avatarUrl}
                  alt={alt}
                  className={`${!stopPopWindow && "hover:scale-110"} transition-transform w-full h-full object-cover`}
                  onClick={() => { !stopPopWindow && setIsOpen(true); }}
                />
              )}
        </div>
      </div>
      {
        withTitle && <div className="text-xs truncate max-w-full">{avatarQuery.data?.data?.avatarTitle}</div>
      }
      <div className="absolute">
        {
          (isOpen && !stopPopWindow && roomId) && (
            <PopWindow isOpen={isOpen} onClose={() => setIsOpen(false)} fullScreen={getScreenSize() === "sm"}>
              <div className="justify-center w-full">
                <RoleDetail roleId={roleAvatar?.roleId ?? -1}></RoleDetail>
              </div>
            </PopWindow>
          )
        }
      </div>
    </div>
  );
}
