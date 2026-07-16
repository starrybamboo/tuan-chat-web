import { useMemo } from "react";

import { Avatar, AVATAR_HOVER_IMAGE_CLASS, AVATAR_HOVER_SHELL_CLASS } from "@/components/common/Avatar";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { NarratorIcon } from "@/icons";
import { imageLowUrl as buildAvatarThumbUrl, avatarUrl as buildAvatarUrl } from "@/utils/media/mediaUrl";

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

type MessageEditorSpeakerHeaderViewProps = MessageEditorSpeakerHeaderProps & {
  avatarFileId?: number;
  avatarTitle?: unknown;
  roleName?: string;
  showAvatar: boolean;
};

function MessageEditorSpeakerHeaderView({
  avatarFileId,
  avatarTitle,
  className,
  message,
  roleName,
  showAvatar,
}: MessageEditorSpeakerHeaderViewProps) {
  const roleId = toFiniteNumber(message.roleId);
  const avatarId = toFiniteNumber(message.avatarId);
  const explicitAvatarId = toPositiveNumber(avatarId);
  const explicitRoleId = toPositiveNumber(roleId);
  const speakerLabel = resolveMessageEditorSpeakerLabel({
    avatarTitle,
    customRoleName: message.customRoleName,
    roleId,
    roleName,
  });
  const avatarTitleLabel = resolveMessageEditorAvatarTitleLabel(avatarTitle);
  const avatarBadgeLabel = createTwoCharacterAvatarLabel(avatarTitle);
  const fallbackLabel = explicitRoleId
    ? `角色 #${explicitRoleId}`
    : (explicitAvatarId ? `头像 #${explicitAvatarId}` : "");
  const displayLabel = speakerLabel || fallbackLabel || "旁白";
  const titleLabel = avatarTitleLabel && displayLabel && !displayLabel.includes(avatarTitleLabel)
    ? `${displayLabel}（${avatarTitleLabel}）`
    : displayLabel;
  const avatarUrl = buildAvatarThumbUrl(avatarFileId) || buildAvatarUrl(avatarFileId) || ROLE_DEFAULT_AVATAR_URL;

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
              <Avatar
                src={avatarUrl}
                alt="avatar"
                size={6}
                rounded={true}
                fallbackSrc={ROLE_DEFAULT_AVATAR_URL}
                shellClassName={AVATAR_HOVER_SHELL_CLASS}
                imgClassName={AVATAR_HOVER_IMAGE_CLASS}
                hoverToScale={false}
                imageLoading="lazy"
                imageDecoding="async"
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

function MessageEditorAvatarSpeakerHeader(props: MessageEditorSpeakerHeaderProps & {
  avatarId: number;
  roleId?: number;
}) {
  const roleRequest = useGetRoleQuery(props.roleId ?? 0, {
    enabled: Boolean(props.roleId),
  });
  const avatarRequest = useGetRoleAvatarQuery(props.avatarId);
  const avatar = avatarRequest.data?.data;

  return (
    <MessageEditorSpeakerHeaderView
      {...props}
      avatarFileId={avatar?.avatarFileId}
      avatarTitle={avatar?.avatarTitle}
      roleName={roleRequest.data?.data?.roleName}
      showAvatar={true}
    />
  );
}

function MessageEditorRoleSpeakerHeader(props: MessageEditorSpeakerHeaderProps & {
  roleId: number;
}) {
  const roleRequest = useGetRoleQuery(props.roleId);
  const avatarsRequest = useGetRoleAvatarsQuery(props.roleId);
  const fallbackAvatar = useMemo(() => {
    return pickDefaultAvatar(avatarsRequest.data?.data ?? []);
  }, [avatarsRequest.data?.data]);

  return (
    <MessageEditorSpeakerHeaderView
      {...props}
      avatarFileId={fallbackAvatar?.avatarFileId}
      avatarTitle={fallbackAvatar?.avatarTitle}
      roleName={roleRequest.data?.data?.roleName}
      showAvatar={true}
    />
  );
}

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
  if (explicitAvatarId) {
    return (
      <MessageEditorAvatarSpeakerHeader
        avatarId={explicitAvatarId}
        className={className}
        message={message}
        roleId={explicitRoleId}
      />
    );
  }

  if (explicitRoleId) {
    return (
      <MessageEditorRoleSpeakerHeader
        className={className}
        message={message}
        roleId={explicitRoleId}
      />
    );
  }

  return (
    <MessageEditorSpeakerHeaderView
      className={className}
      message={message}
      showAvatar={false}
    />
  );
}
