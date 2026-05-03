import type { ReactNode } from "react";
import type { CharacterDetailLeftPanelProps } from "./CharacterDetailLeftPanel";
import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";
import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";

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
  onAvatarDelete,
  onAvatarUpload,
  onAvatarTitleSave,
  onBaseRoleSave,
}: CharacterDetailLeftPanelProps) {
  const selectedAvatar = roleAvatars.find(avatar => avatar.avatarId === selectedAvatarId);
  const selectedAvatarTitleRaw = selectedAvatar?.avatarTitle;
  const selectedAvatarTitle = typeof selectedAvatarTitleRaw === "string"
    ? selectedAvatarTitleRaw
    : selectedAvatarTitleRaw?.label;

  const renderCompactActionButton = ({
    id,
    title,
    subtitle,
    subtitleClassName,
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
      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-base-content/10 bg-base-100/70 px-3 py-2.5 text-left transition-colors hover:bg-base-300/50"
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className={`truncate text-xs font-medium leading-5 ${subtitleClassName}`}>
            {subtitle}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center whitespace-nowrap pl-2 text-base-content/50">
        <ChevronRightIcon className="h-4 w-4" />
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
      subtitleClassName: "text-primary",
      actionLabel: "切换",
      onClick: onOpenRuleModal,
      icon: (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <GearOutline className="h-4 w-4 text-primary" />
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
          subtitleClassName: dicerRoleError ? "text-error" : "text-accent",
          actionLabel: currentDicerRoleId ? "更改" : "设置",
          onClick: onOpenDiceMaidenLinkModal,
          icon: (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
              <DiceFiveIcon className="h-4 w-4 text-accent" />
            </div>
          ),
        }]
      : []),
    {
      id: "audio",
      title: "上传音频",
      subtitle: localRole.voiceFileId || localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色",
      subtitleClassName: "text-secondary",
      actionLabel: "上传",
      onClick: onOpenAudioModal,
      icon: (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
          <MicrophoneIcon className="h-4 w-4 text-secondary" />
        </div>
      ),
    },
  ];

  return (
    <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
      <div className="card-body p-4 md:h-80">
        <div className="md:hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className={`col-start-1 col-span-2 row-start-1 ${isDiceMaiden ? "row-span-2" : "row-span-3"} flex min-w-0 flex-col items-center justify-start gap-2`}>
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
                      <div className="skeleton w-28 h-28 sm:w-32 sm:h-32 rounded-xl"></div>
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
                      onAvatarDelete={onAvatarDelete}
                      onAvatarUpload={onAvatarUpload}
                      useUrlState={false}
                    />
                  )}
            </div>

            <button
              type="button"
              className="col-start-3 col-span-2 row-start-1 rounded-xl bg-base-100/70 border border-base-content/10 px-3 py-2.5 min-h-12 flex items-center justify-between hover:bg-base-300/50 transition-colors"
              onClick={onOpenRuleModal}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <GearOutline className="w-4 h-4 text-primary" />
                </span>
                <span className="min-w-0 truncate whitespace-nowrap font-semibold text-sm">当前规则</span>
              </span>
              <ChevronRightIcon className="w-4 h-4 shrink-0 text-base-content/50" />
            </button>

            {!isDiceMaiden && (
              <button
                type="button"
                className="col-start-3 col-span-2 row-start-2 rounded-xl bg-base-100/70 border border-base-content/10 px-3 py-2.5 min-h-12 flex items-center justify-between hover:bg-base-300/50 transition-colors"
                onClick={onOpenDiceMaidenLinkModal}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                    <DiceFiveIcon className="w-4 h-4 text-accent" />
                  </span>
                  <span className="min-w-0 truncate whitespace-nowrap font-semibold text-sm">关联骰娘</span>
                </span>
                <ChevronRightIcon className="w-4 h-4 shrink-0 text-base-content/50" />
              </button>
            )}

            <button
              type="button"
              className={`col-start-3 col-span-2 ${isDiceMaiden ? "row-start-2" : "row-start-3"} rounded-xl bg-base-100/70 border border-base-content/10 px-3 py-2.5 min-h-12 flex items-center justify-between hover:bg-base-300/50 transition-colors`}
              onClick={onOpenAudioModal}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center">
                  <MicrophoneIcon className="w-4 h-4 text-secondary" />
                </span>
                <span className="min-w-0 truncate whitespace-nowrap font-semibold text-sm">上传音频</span>
              </span>
              <ChevronRightIcon className="w-4 h-4 shrink-0 text-base-content/50" />
            </button>
          </div>

          <div className="divider my-3" />

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

        <div className="hidden h-full min-w-0 md:grid md:grid-cols-[15rem_minmax(15rem,1fr)_minmax(0,15.5rem)] md:gap-4">
          <div className="grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)]">
            <div className="min-w-0">
              {isQueryLoading
                ? <div className="skeleton ml-6 h-8 w-36 rounded-md" />
                : (
                    <DoubleClickEditableText
                      value={selectedAvatarTitle ?? ""}
                      onCommit={(nextTitle) => {
                        if (!selectedAvatar?.avatarId || !onAvatarTitleSave) {
                          return;
                        }
                        onAvatarTitleSave(selectedAvatar.avatarId, nextTitle);
                      }}
                      trigger="click"
                      commitOnBlur
                      commitOnEnter
                      invalidBehavior="keepEditing"
                      placeholder="未命名头像"
                      validate={nextTitle => nextTitle.length > maxRoleNameLength ? `头像标题不能超过${maxRoleNameLength}字` : null}
                      inputProps={{
                        maxLength: maxRoleNameLength,
                      }}
                      className="block w-full"
                      inputClassName="w-full rounded-md border border-base-content/15 bg-base-100 px-3 py-2 text-left text-xl font-semibold"
                      renderDisplay={({ displayValue, startEditing }) => (
                        <button
                          type="button"
                          onClick={startEditing}
                          className="relative inline-block max-w-full rounded-md pl-6 py-1 text-left text-xl font-semibold transition-colors hover:text-primary after:absolute after:bottom-0 after:left-6 after:h-0.5 after:w-0 after:rounded-full after:bg-primary after:transition-all after:duration-200 hover:after:w-full"
                        >
                          {displayValue || "未命名头像"}
                        </button>
                      )}
                    />
                  )}
            </div>
            <div className="divider my-0 mx-4" />

            {isQueryLoading
              ? (
                  <div className="flex min-h-0 items-center justify-center p-6">
                    <div className="skeleton aspect-square w-48 rounded-xl ring ring-primary/20 ring-offset-2 ring-offset-base-100"></div>
                  </div>
                )
              : (
                  <div className="flex min-h-0 items-center justify-center p-6">
                    <CharacterAvatar
                      role={localRole}
                      roleAvatars={roleAvatars}
                      selectedAvatarId={selectedAvatarId}
                      selectedAvatarUrl={selectedAvatarUrl}
                      selectedSpriteUrl={selectedSpriteUrl}
                      avatarSizeClassName="w-48"
                      onchange={onAvatarChange}
                      onAvatarSelect={onAvatarSelect}
                      onAvatarDelete={onAvatarDelete}
                      onAvatarUpload={onAvatarUpload}
                      useUrlState={false}
                    />
                  </div>
                )}
          </div>

          <div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <RoleBasicInfoEditor
                localRole={localRole}
                maxRoleNameLength={maxRoleNameLength}
                maxDescriptionLength={maxDescriptionLength}
                onBaseRoleSave={onBaseRoleSave}
                showDescription={false}
                className="space-y-0"
                nameClassName="truncate text-left text-xl font-semibold"
                nameDisplayClassName="rounded-none px-0 py-0"
              />
            </div>

            <div className="divider my-0" />

            <div className="max-h-full flex flex-col overflow-hidden pt-6">
              <RoleBasicInfoEditor
                localRole={localRole}
                maxRoleNameLength={maxRoleNameLength}
                maxDescriptionLength={maxDescriptionLength}
                onBaseRoleSave={onBaseRoleSave}
                showName={false}
                className="flex min-h-0 flex-col overflow-hidden space-y-0"
                descriptionDisplayClassName="block max-h-48 text-sm leading-6 whitespace-pre-wrap wrap-break-words"
                descriptionButtonClassName="min-h-0 overflow-y-auto overscroll-contain rounded-none px-0 py-0 text-left"
                descriptionEditorClassName="flex min-h-0 flex-1 flex-col"
                descriptionTextareaClassName="min-h-24 flex-1"
              />
            </div>

            <div className="self-end text-xs text-base-content/60 pb-6">
              角色ID号：
              {localRole.id}
            </div>
          </div>

          <div className="flex h-full min-w-0 flex-col gap-2">
            {actionCards.map(card => renderCompactActionButton(card))}
            <div className="min-h-0 flex-1 rounded-xl border border-base-content/10 bg-base-100/40" aria-hidden="true" />
          </div>
        </div>

      </div>
    </div>
  );
}
