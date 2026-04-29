import type { CharacterDetailLeftPanelProps } from "./CharacterDetailLeftPanel";
import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
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
  onBaseRoleSave,
  onAudioRoleUpdate,
  onAudioDelete,
}: CharacterDetailLeftPanelProps) {
  return (
    <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
      <div className="card-body p-4">
        <div className="lg:hidden">
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

        <div className="hidden lg:flex lg:flex-nowrap lg:gap-0 lg:divide-x lg:divide-base-content/10">
          <div className="lg:w-64 shrink-0 flex items-start justify-center lg:pr-6">
            {isQueryLoading
              ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="skeleton w-32 h-32 rounded-xl"></div>
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
                    avatarSizeClassName="w-52"
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
            <div className="card bg-base-100 rounded-xl transition-all duration-200">
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2 w-full"
                    onClick={onOpenRuleModal}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <GearOutline className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">当前规则</h3>
                        <p className="text-primary font-medium text-sm">
                          {currentRuleName || "未选择规则"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 whitespace-nowrap pl-3 text-base-content/50">
                      <span className="text-xs">切换</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isDiceMaiden && (
              <div className="card bg-base-100 rounded-xl transition-all duration-200">
                <div className="card-body p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2"
                    onClick={onOpenDiceMaidenLinkModal}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <DiceFiveIcon className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm">关联骰娘</h3>
                        <p className={`font-medium text-sm ${
                          dicerRoleError ? "text-error" : "text-accent"
                        }`}
                        >
                          {currentDicerRoleId
                            ? dicerRoleError || linkedDicerRoleName || `ID: ${currentDicerRoleId}`
                            : "选择使用的骰娘角色"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 whitespace-nowrap pl-3 text-base-content/50">
                      <span className="text-xs">{currentDicerRoleId ? "更改" : "设置"}</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="card bg-base-100 rounded-xl transition-all duration-200">
              <div className="card-body p-4">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2"
                  onClick={onOpenAudioModal}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <MicrophoneIcon className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">上传音频</h3>
                      <p className="text-secondary font-medium text-sm">
                        {localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 whitespace-nowrap pl-3 text-base-content/50">
                    <span className="text-xs">上传</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

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
