import type { ReactNode } from "react";
import type { CharacterDetailLeftPanelProps } from "./CharacterDetailLeftPanel";
import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";
import RoleSidebarActionCard from "./RoleSidebarActionCard";

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
  onBaseRoleSave,
  onAudioRoleUpdate,
  onAudioDelete,
}: CharacterDetailLeftPanelProps) {
  const renderCompactActionButton = ({
    title,
    subtitle,
    subtitleClassName,
    actionLabel,
    icon,
    onClick,
  }: {
    title: string;
    subtitle: string;
    subtitleClassName: string;
    actionLabel: string;
    icon: ReactNode;
    onClick: () => void;
  }) => (
    <button
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
      <div className="flex shrink-0 items-center gap-1 whitespace-nowrap pl-2 text-base-content/50">
        <span className="text-xs">{actionLabel}</span>
        <ChevronRightIcon className="h-4 w-4" />
      </div>
    </button>
  );

  return (
    <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
      <div className="card-body p-4 md:h-[29rem]">
        <div className="md:hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className={`col-start-1 col-span-2 row-start-1 ${isDiceMaiden ? "row-span-2" : "row-span-3"} flex items-center justify-center`}>
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
          <RoleBasicInfoEditor
            localRole={localRole}
            maxRoleNameLength={maxRoleNameLength}
            maxDescriptionLength={maxDescriptionLength}
            onBaseRoleSave={onBaseRoleSave}
            className="mt-4"
            nameClassName="text-left text-xl font-semibold"
            descriptionDisplayClassName="text-sm wrap-break-words line-clamp-5 overflow-hidden text-ellipsis"
          />
        </div>

        <div className="hidden h-full min-w-0 md:flex lg:hidden md:items-start md:gap-4">
          <div className="flex w-52 shrink-0 items-start justify-center">
            {isQueryLoading
              ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="skeleton h-40 w-40 rounded-xl"></div>
                  </div>
                )
              : (
                  <CharacterAvatar
                    role={localRole}
                    roleAvatars={roleAvatars}
                    selectedAvatarId={selectedAvatarId}
                    selectedAvatarUrl={selectedAvatarUrl}
                    selectedSpriteUrl={selectedSpriteUrl}
                    avatarSizeClassName="w-44"
                    onchange={onAvatarChange}
                    onAvatarSelect={onAvatarSelect}
                    onAvatarDelete={onAvatarDelete}
                    onAvatarUpload={onAvatarUpload}
                    useUrlState={false}
                  />
                )}
          </div>

          <div className="min-w-0 flex-[1_1_0%] self-stretch">
            <div className="flex h-full min-h-0 flex-col">
              <RoleBasicInfoEditor
                localRole={localRole}
                maxRoleNameLength={maxRoleNameLength}
                maxDescriptionLength={maxDescriptionLength}
                onBaseRoleSave={onBaseRoleSave}
                showDescription={false}
                className="space-y-0"
                nameClassName="truncate text-left text-2xl font-semibold"
                nameDisplayClassName="rounded-none px-0 py-0"
              />

              <div className="divider my-0" />

              <div className="flex min-h-0 flex-1 flex-col">
                <RoleBasicInfoEditor
                  localRole={localRole}
                  maxRoleNameLength={maxRoleNameLength}
                  maxDescriptionLength={maxDescriptionLength}
                  onBaseRoleSave={onBaseRoleSave}
                  showName={false}
                  className="flex min-h-0 flex-1 flex-col justify-start space-y-0"
                  descriptionDisplayClassName="min-h-0 flex-1 wrap-break-words text-sm leading-6 overflow-hidden text-ellipsis"
                  descriptionButtonClassName="rounded-none px-0 py-0 text-left hover:bg-transparent"
                  descriptionEditorClassName="flex min-h-0 flex-1 flex-col"
                />

                <div className="pt-2 text-xs text-base-content/60">
                  角色ID号：
                  {localRole.id}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-[0_1_18rem] flex-col gap-2 self-stretch">
            {renderCompactActionButton({
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
            })}

            {!isDiceMaiden && renderCompactActionButton({
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
            })}

            {renderCompactActionButton({
              title: "上传音频",
              subtitle: localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色",
              subtitleClassName: "text-secondary",
              actionLabel: "上传",
              onClick: onOpenAudioModal,
              icon: (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
                  <MicrophoneIcon className="h-4 w-4 text-secondary" />
                </div>
              ),
            })}
          </div>
        </div>

        <div className="hidden lg:flex lg:flex-nowrap lg:gap-0 lg:divide-x lg:divide-base-content/10">
          <div className="lg:w-64 shrink-0 flex items-start justify-center lg:pr-4">
            {isQueryLoading
              ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="skeleton h-36 w-36 rounded-xl"></div>
                    <div className="skeleton h-4 w-20"></div>
                  </div>
                )
              : (
                  <CharacterAvatar
                    role={localRole}
                    roleAvatars={roleAvatars}
                    selectedAvatarId={selectedAvatarId}
                    selectedAvatarUrl={selectedAvatarUrl}
                    selectedSpriteUrl={selectedSpriteUrl}
                    avatarSizeClassName="w-56"
                    onchange={onAvatarChange}
                    onAvatarSelect={onAvatarSelect}
                    onAvatarDelete={onAvatarDelete}
                    onAvatarUpload={onAvatarUpload}
                    useUrlState={false}
                  />
                )}
          </div>

          <div className="flex-1 min-w-0 lg:px-6 lg:max-w-md">
            <div className="flex flex-col gap-3">
              <RoleBasicInfoEditor
                localRole={localRole}
                maxRoleNameLength={maxRoleNameLength}
                maxDescriptionLength={maxDescriptionLength}
                onBaseRoleSave={onBaseRoleSave}
                supportingText={currentRuleName || "未选择规则"}
                nameClassName="truncate text-left text-2xl font-semibold"
                descriptionDisplayClassName="text-base wrap-break-words max-w-full line-clamp-6 overflow-hidden text-ellipsis"
              />

              <div className="text-xs text-base-content/60">
                角色ID号：
                {localRole.id}
              </div>
            </div>
          </div>

          <div className="lg:w-80 space-y-3 lg:pl-6">
            <RoleSidebarActionCard
              title="当前规则"
              subtitle={currentRuleName || "未选择规则"}
              subtitleClassName="text-primary"
              actionLabel="切换"
              onClick={onOpenRuleModal}
              icon={(
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <GearOutline className="h-4 w-4 text-primary" />
                </div>
              )}
            />

            {!isDiceMaiden && (
              <RoleSidebarActionCard
                title="关联骰娘"
                subtitle={currentDicerRoleId
                  ? dicerRoleError || linkedDicerRoleName || `ID: ${currentDicerRoleId}`
                  : "选择使用的骰娘角色"}
                subtitleClassName={dicerRoleError ? "text-error" : "text-accent"}
                actionLabel={currentDicerRoleId ? "更改" : "设置"}
                onClick={onOpenDiceMaidenLinkModal}
                icon={(
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                    <DiceFiveIcon className="h-4 w-4 text-accent" />
                  </div>
                )}
              />
            )}

            <RoleSidebarActionCard
              title="上传音频"
              subtitle={localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色"}
              subtitleClassName="text-secondary"
              actionLabel="上传"
              onClick={onOpenAudioModal}
              icon={(
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
                  <MicrophoneIcon className="h-4 w-4 text-secondary" />
                </div>
              )}
            />

            <AudioPlayer
              role={localRole}
              size="compact"
              onRoleUpdate={onAudioRoleUpdate}
              onDelete={onAudioDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
