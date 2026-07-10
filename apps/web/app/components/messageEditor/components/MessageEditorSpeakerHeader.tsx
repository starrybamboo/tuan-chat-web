import { useMemo } from "react";

import RoleAvatarComponent from "@/components/common/roleAvatar";
import { NarratorIcon } from "@/icons";

import type { MessageEditorMessage } from "../messageEditorTypes";

import { useGetRoleAvatarQuery, useGetRoleAvatarsQuery, useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { resolveMessageEditorAvatarTitleLabel, resolveMessageEditorSpeakerLabel } from "../model/messageEditorSpeaker";

type MessageEditorSpeakerHeaderProps = {
  className?: string;
  message: MessageEditorMessage;
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toPositiveNumber(value: unknown): number | undefined {
  const normalized = toFiniteNumber(value);
  return typeof normalized === "number" && normalized > 0 ? normalized : undefined;
}

function pickDefaultAvatar<T extends { avatarId?: number; avatarTitle?: unknown }>(avatars: T[]): T | undefined {
  return avatars.find(avatar => resolveMessageEditorAvatarTitleLabel(avatar.avatarTitle) === "默认")
    ?? avatars[0];
}

function createTwoCharacterAvatarLabel(value: unknown): string {
  const label = resolveMessageEditorAvatarTitleLabel(value);
  if (!label) {
    return "";
  }
  return Array.from(label).slice(0, 2).join("");
}

const narratorAvatarFrameClassName = [
  "group/narrator inline-flex size-7 items-center justify-center rounded-full",
  "bg-base-200/65 text-base-content/70 transition-colors duration-150 ease-out",
  "motion-reduce:transition-none hover:bg-base-300/70 hover:text-base-content/85",
].join(" ");

const narratorAvatarIconClassName = [
  "size-3.5 transition-transform duration-150 ease-out motion-reduce:transition-none",
  "group-hover/narrator:scale-105",
].join(" ");

const speakerHeaderClassName = [
  "inline-flex h-8 w-16 min-w-[4rem] items-center justify-start gap-1 rounded-full p-0.5",
  "text-sm text-base-content/70 transition-colors hover:bg-base-100/35 hover:text-base-content/90",
  "motion-reduce:transition-none",
].join(" ");

const speakerAvatarSlotClassName = "inline-flex size-7 shrink-0 items-center justify-center";

const speakerAvatarBadgeClassName = [
  "pointer-events-none inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm",
  "bg-base-100/95 px-0.5 text-center text-[10px] font-medium leading-none text-base-content/70",
  "shadow-sm ring-1 ring-base-300/60 whitespace-nowrap",
].join(" ");

/**
 * 消息块前缀 speaker 标签，仅负责展示。
 */
export function MessageEditorSpeakerHeader({
  className,
  message,
}: MessageEditorSpeakerHeaderProps) {
  const roleId = toFiniteNumber(message.roleId);
  const avatarId = toFiniteNumber(message.avatarId);
  const explicitAvatarId = toPositiveNumber(avatarId);
  const explicitRoleId = toPositiveNumber(roleId);
  const roleRequest = useGetRoleQuery(explicitRoleId ?? 0);
  const avatarRequest = useGetRoleAvatarQuery(explicitAvatarId ?? 0, {
    enabled: Boolean(explicitAvatarId),
  });
  const fallbackAvatarsRequest = useGetRoleAvatarsQuery(explicitRoleId ?? 0, {
    enabled: Boolean(explicitRoleId && !explicitAvatarId),
  });
  const fallbackAvatar = useMemo(() => {
    return pickDefaultAvatar(fallbackAvatarsRequest.data?.data ?? []);
  }, [fallbackAvatarsRequest.data?.data]);
  const effectiveAvatar = avatarRequest.data?.data ?? fallbackAvatar;
  const speakerLabel = resolveMessageEditorSpeakerLabel({
    avatarTitle: effectiveAvatar?.avatarTitle,
    customRoleName: message.customRoleName,
    roleId,
    roleName: roleRequest.data?.data?.roleName,
  });
  const avatarTitleLabel = resolveMessageEditorAvatarTitleLabel(effectiveAvatar?.avatarTitle);
  const avatarBadgeLabel = createTwoCharacterAvatarLabel(effectiveAvatar?.avatarTitle);
  const fallbackLabel = explicitRoleId
    ? `角色 #${explicitRoleId}`
    : (explicitAvatarId ? `头像 #${explicitAvatarId}` : "");
  const displayLabel = speakerLabel || fallbackLabel || "旁白";
  const showAvatar = Boolean(explicitRoleId || explicitAvatarId);
  const titleLabel = avatarTitleLabel && displayLabel && !displayLabel.includes(avatarTitleLabel)
    ? `${displayLabel}（${avatarTitleLabel}）`
    : displayLabel;

  return (
    <div
      className={[
        speakerHeaderClassName,
        className ?? "",
      ].join(" ")}
      title={titleLabel || undefined}
    >
      <span className={speakerAvatarSlotClassName}>
        {showAvatar
          ? (
              <RoleAvatarComponent
                avatarId={explicitAvatarId ?? 0}
                roleId={roleId}
                width={6}
                isRounded={true}
                withTitle={false}
                stopToastWindow={true}
                hoverToScale={false}
              />
            )
          : (
              <span className={narratorAvatarFrameClassName}>
                <NarratorIcon className={narratorAvatarIconClassName} />
              </span>
            )}
      </span>
      <span
        className={[
          speakerAvatarBadgeClassName,
          avatarBadgeLabel ? "" : "invisible",
        ].join(" ")}
        aria-hidden="true"
      >
        {avatarBadgeLabel}
      </span>
    </div>
  );
}
