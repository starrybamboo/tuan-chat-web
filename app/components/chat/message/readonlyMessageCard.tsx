import type { ReactNode } from "react";
import type { ReadonlyRenderableMessage } from "./messageContentRenderer";
import { useMemo } from "react";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { NarratorIcon } from "@/icons";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { isRoleNotFoundApiError } from "@/utils/roleApiError";
import { useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import {
  CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS,
  CHAT_MESSAGE_META_ROW_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
} from "./messageCardStyle";
import MessageContentRenderer from "./messageContentRenderer";

interface ReadonlyMessageCardProps {
  message: ReadonlyRenderableMessage;
  cacheKeyBase?: string;
  className?: string;
  trailing?: ReactNode;
  caption?: ReactNode;
}

export default function ReadonlyMessageCard({
  message,
  cacheKeyBase,
  className = "",
  trailing,
  caption,
}: ReadonlyMessageCardProps) {
  const roleQuery = useGetRoleQuery(message.roleId ?? 0);
  const role = roleQuery.data?.data;
  const roleDeleted = isRoleNotFoundApiError(roleQuery.error);
  const isNarrator = !message.roleId || message.roleId <= 0;
  const isIntroText = message.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const displayRoleName = useMemo(() => getDisplayRoleName({
    roleId: message.roleId,
    roleName: role?.roleName,
    customRoleName: message.customRoleName,
    isIntroText,
    fallback: roleDeleted ? "角色已删除" : "未选择角色",
  }), [
    isIntroText,
    message.customRoleName,
    message.roleId,
    role?.roleName,
    roleDeleted,
  ]);

  return (
    <div className={`${CHAT_MESSAGE_ROW_CLASS} ${className}`.trim()}>
      <div className={`shrink-0 ${isIntroText ? "invisible" : ""}`}>
        {isNarrator
          ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200/60 sm:h-12 sm:w-12">
                <NarratorIcon className="h-4 w-4 text-base-content/70" />
              </div>
            )
          : (
              <RoleAvatarComponent
                avatarId={message.avatarId ?? 0}
                avatarUrl={message.avatarUrl}
                avatarThumbUrl={message.avatarThumbUrl}
                roleId={message.roleId ?? undefined}
                width={12}
                isRounded={true}
                withTitle={false}
                stopToastWindow={true}
                useDefaultAvatarFallback={false}
              />
            )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start">
        <div className={CHAT_MESSAGE_META_ROW_CLASS}>
          {!isIntroText && displayRoleName && (
            <div className="block min-w-0 truncate pb-0.5 text-sm font-medium text-base-content/85 sm:pb-1">
              {displayRoleName}
            </div>
          )}
        </div>

        <div className={CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS}>
          <MessageContentRenderer
            message={message}
            cacheKeyBase={cacheKeyBase}
          />
        </div>

        {caption && <div className="text-xs text-base-content/55">{caption}</div>}
      </div>

      {trailing && (
        <div className="shrink-0 pt-1">
          {trailing}
        </div>
      )}
    </div>
  );
}
