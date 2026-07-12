import type { ReactNode } from "react";

import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "@/icons";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { Divider, Skeleton } from "@/components/common/StatusPrimitives";

import type { CharacterDetailLeftPanelProps } from "./CharacterDetailLeftPanel";

import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";
import { hasRoleVoiceMedia } from "./roleVoiceMedia";

export default function CharacterDetailLeftPanelHorizontal({
  isQueryLoading,
  isDiceMaiden,
  localRole,
  roleAvatars,
  selectedAvatarId,
  selectedAvatarUrl,
  selectedSpriteUrl,
  maxDescriptionLength,
  maxRoleNameLength,
  currentRuleName,
  currentDicerRoleId,
  dicerRoleError,
  linkedDicerRoleName,
  onOpenRuleModal,
  onOpenAudioModal,
  onOpenDiceMaidenLinkModal,
  onAvatarChange,
  onAvatarSelect,
  onAvatarUpload,
  onBaseRoleSave,
}: CharacterDetailLeftPanelProps) {
  const renderCompactActionButton = ({
    id,
    title,
    subtitle,
    subtitleClassName,
    actionLabel,
    icon,
    onClick,
  }: {
    id: string;
    title: string;
    subtitle: string;
    subtitleClassName: string;
    actionLabel: string;
    icon: ReactNode;
    onClick: () => void;
  }) => (
    <button
      key={id}
      type="button"
      className="
        flex min-w-0 items-center justify-between gap-3 rounded-xl border
        border-base-content/10 bg-base-100/70 px-3 py-2.5 text-left
        transition-colors
        hover:bg-base-300/50
      "
      aria-label={`${actionLabel}：${title}，${subtitle}`}
      title={`${title}，${subtitle}`}
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-semibold" title={title}>{title}</div>
          <div className={`
            truncate text-xs/5 font-medium
            ${subtitleClassName}
          `} title={subtitle}>
            {subtitle}
          </div>
        </div>
      </div>
      <div className="
        flex shrink-0 items-center whitespace-nowrap pl-2 text-base-content/50
      ">
        <ChevronRightIcon className="size-4" />
      </div>
    </button>
  );

  const actionCards: Array<{
    id: string;
    title: string;
    subtitle: string;
    subtitleClassName: string;
    actionLabel: string;
    onClick: () => void;
    icon: ReactNode;
  }> = [
    {
      id: "rule",
      title: "当前规则",
      subtitle: currentRuleName || "未选择规则",
      subtitleClassName: "text-info",
      actionLabel: "切换",
      onClick: onOpenRuleModal,
      icon: (
        <div className="
          flex size-8 items-center justify-center rounded-full bg-info/10
        ">
          <GearOutline className="size-4 text-info" />
        </div>
      ),
    },
    ...(!isDiceMaiden
      ? [{
          id: "dicer",
          title: "关联骰娘",
          subtitle: currentDicerRoleId
            ? dicerRoleError || linkedDicerRoleName || `ID: ${currentDicerRoleId}`
            : "选择使用的骰娘角色",
          subtitleClassName: dicerRoleError ? "text-error" : "text-base-content/70",
          actionLabel: currentDicerRoleId ? "更改" : "设置",
          onClick: onOpenDiceMaidenLinkModal,
          icon: (
            <div className="
              flex size-8 items-center justify-center rounded-full bg-base-200
            ">
              <DiceFiveIcon className="size-4 text-base-content/70" />
            </div>
          ),
        }]
      : []),
    {
      id: "audio",
      title: "上传音频",
      subtitle: hasRoleVoiceMedia(localRole) ? "已上传音频" : "用于AI生成角色音色",
      subtitleClassName: "text-base-content/70",
      actionLabel: "上传",
      onClick: onOpenAudioModal,
      icon: (
        <div className="
          flex size-8 items-center justify-center rounded-full bg-base-200
        ">
          <MicrophoneIcon className="size-4 text-base-content/70" />
        </div>
      ),
    },
  ];

  return (
    <div className={surfaceClassName({ level: "content", className: "shadow-xs md:border-2 md:border-base-content/10" })}>
      <div className="
        p-4
        md:h-64
      ">
        <div className="md:hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className={`
              col-start-1 col-span-2 row-start-1
              ${isDiceMaiden ? `row-span-2` : `row-span-3`}
              flex min-w-0 flex-col items-center justify-start gap-2
            `}>
              {!isQueryLoading && (
                <RoleBasicInfoEditor
                  localRole={localRole}
                  maxRoleNameLength={maxRoleNameLength}
                  maxDescriptionLength={maxDescriptionLength}
                  onBaseRoleSave={onBaseRoleSave}
                  showDescription={false}
                  align="center"
                  className="w-full space-y-0 text-center"
                  nameClassName="max-w-full truncate text-center text-xl font-semibold"
                  nameDisplayClassName="block w-full px-1 py-0.5"
                />
              )}
              {isQueryLoading
                ? (
                    <div className="flex flex-col items-center gap-3">
                      <Skeleton className="size-28 rounded-xl sm:size-32" />
                    </div>
                  )
                : (
                    <CharacterAvatar
                      role={localRole}
                      roleAvatars={roleAvatars}
                      selectedAvatarId={selectedAvatarId}
                      selectedAvatarUrl={selectedAvatarUrl}
                      selectedSpriteUrl={selectedSpriteUrl}
                      avatarSizeClassName="w-32 sm:w-36"
                      onchange={onAvatarChange}
                      onAvatarSelect={onAvatarSelect}
                      onAvatarUpload={onAvatarUpload}
                      useUrlState={false}
                    />
                  )}
            </div>

            <button
              type="button"
              className="
                col-start-3 col-span-2 row-start-1 rounded-xl bg-base-100/70
                border border-base-content/10 px-3 py-2.5 min-h-12 flex
                items-center justify-between
                hover:bg-base-300/50
                transition-colors
              "
              aria-label="打开规则选择"
              onClick={onOpenRuleModal}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="
                  size-7 rounded-full bg-info/10 flex items-center
                  justify-center
                ">
                  <GearOutline className="size-4 text-info" />
                </span>
                <span className="
                  min-w-0 truncate whitespace-nowrap font-semibold text-sm
                ">当前规则</span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-base-content/50" />
            </button>

            {!isDiceMaiden && (
              <button
                type="button"
                className="
                  col-start-3 col-span-2 row-start-2 rounded-xl bg-base-100/70
                  border border-base-content/10 px-3 py-2.5 min-h-12 flex
                  items-center justify-between
                  hover:bg-base-300/50
                  transition-colors
                "
                aria-label={currentDicerRoleId ? "更改关联骰娘" : "设置关联骰娘"}
                onClick={onOpenDiceMaidenLinkModal}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="
                    size-7 rounded-full bg-base-200 flex items-center
                    justify-center
                  ">
                    <DiceFiveIcon className="size-4 text-base-content/70" />
                  </span>
                  <span className="
                    min-w-0 truncate whitespace-nowrap font-semibold text-sm
                  ">关联骰娘</span>
                </span>
                <ChevronRightIcon className="
                  size-4 shrink-0 text-base-content/50
                " />
              </button>
            )}

            <button
              type="button"
              className={`
                col-start-3 col-span-2
                ${isDiceMaiden ? "row-start-2" : `row-start-3`}
                rounded-xl bg-base-100/70 border border-base-content/10 px-3
                py-2.5 min-h-12 flex items-center justify-between
                hover:bg-base-300/50
                transition-colors
              `}
              aria-label={hasRoleVoiceMedia(localRole) ? "更换角色音频" : "上传角色音频"}
              onClick={onOpenAudioModal}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="
                  size-7 rounded-full bg-base-200 flex items-center
                  justify-center
                ">
                  <MicrophoneIcon className="size-4 text-base-content/70" />
                </span>
                <span className="
                  min-w-0 truncate whitespace-nowrap font-semibold text-sm
                ">上传音频</span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-base-content/50" />
            </button>
          </div>

          <Divider className="my-3" />

          <RoleBasicInfoEditor
            localRole={localRole}
            maxRoleNameLength={maxRoleNameLength}
            maxDescriptionLength={maxDescriptionLength}
            onBaseRoleSave={onBaseRoleSave}
            showName={false}
            className="space-y-0"
            descriptionDisplayClassName="text-sm leading-6 whitespace-pre-wrap wrap-break-words line-clamp-5 overflow-hidden text-ellipsis"
            descriptionButtonClassName="px-0 py-0"
            descriptionEditorClassName="space-y-0"
          />
        </div>

        <div className="
          hidden h-full min-w-0
          md:grid md:grid-cols-[13rem_minmax(15rem,1fr)_minmax(0,15.5rem)]
          md:gap-4
        ">
          <div className="grid h-full min-w-0">
            {isQueryLoading
              ? (
                  <div className="flex min-h-0 items-center justify-center p-4">
                    <Skeleton className="aspect-square w-44 rounded-xl ring ring-info/20 ring-offset-2 ring-offset-base-100" />
                  </div>
                )
              : (
                  <div className="flex min-h-0 items-center justify-center p-4">
                    <CharacterAvatar
                      role={localRole}
                      roleAvatars={roleAvatars}
                      selectedAvatarId={selectedAvatarId}
                      selectedAvatarUrl={selectedAvatarUrl}
                      selectedSpriteUrl={selectedSpriteUrl}
                      avatarSizeClassName="w-44"
                      onchange={onAvatarChange}
                      onAvatarSelect={onAvatarSelect}
                      onAvatarUpload={onAvatarUpload}
                      useUrlState={false}
                    />
                  </div>
                )}
          </div>

          <div className="
            grid h-full min-h-0 min-w-0
          ">
            <div className="flex max-h-full flex-col overflow-hidden pt-6">
              <RoleBasicInfoEditor
                localRole={localRole}
                maxRoleNameLength={maxRoleNameLength}
                maxDescriptionLength={maxDescriptionLength}
                onBaseRoleSave={onBaseRoleSave}
                showName={false}
                className="flex min-h-0 flex-col overflow-hidden space-y-0"
                descriptionDisplayClassName="block max-h-36 text-sm leading-6 whitespace-pre-wrap wrap-break-words"
                descriptionButtonClassName="min-h-0 overflow-y-auto overscroll-contain rounded-none px-0 py-0 text-left"
                descriptionEditorClassName="flex min-h-0 flex-1 flex-col"
                descriptionTextareaClassName="min-h-20 flex-1"
              />
            </div>
          </div>

          <div className="flex h-full min-w-0 flex-col gap-2">
            {actionCards.map(card => renderCompactActionButton(card))}
          </div>
        </div>

      </div>
    </div>
  );
}
