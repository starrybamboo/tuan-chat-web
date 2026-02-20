import type { CharacterDetailLeftPanelProps } from "./CharacterDetailLeftPanel";
import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";

interface CharacterDetailLeftPanelHorizontalProps extends CharacterDetailLeftPanelProps {
  onOpenStImportModal?: () => void;
  onOpenAIGenerateModal?: () => void;
}

export default function CharacterDetailLeftPanelHorizontal({
  isQueryLoading,
  isEditing,
  isDiceMaiden,
  localRole,
  roleAvatars,
  selectedAvatarId,
  selectedAvatarUrl,
  selectedSpriteUrl,
  charCount,
  maxDescriptionLength,
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
  onOpenStImportModal,
  onOpenAIGenerateModal,
  setLocalRole,
  onAudioRoleUpdate,
  onAudioDelete,
}: CharacterDetailLeftPanelHorizontalProps) {
  return (
    <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
      <div className="card-body p-4">
        <div className="lg:hidden">
          <div className="grid grid-cols-4 gap-2">
            <div className="col-start-1 col-span-2 row-start-1 row-span-2 flex items-start justify-center">
              {isQueryLoading
                ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="skeleton w-24 h-24 sm:w-28 sm:h-28 rounded-xl"></div>
                    </div>
                  )
                : (
                    <CharacterAvatar
                      role={localRole}
                      roleAvatars={roleAvatars}
                      selectedAvatarId={selectedAvatarId}
                      selectedAvatarUrl={selectedAvatarUrl}
                      selectedSpriteUrl={selectedSpriteUrl}
                      avatarSizeClassName="w-28 sm:w-32"
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
              <span className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <GearOutline className="w-4 h-4 text-primary" />
                </span>
                <span className="font-semibold text-sm">当前规则</span>
              </span>
              <ChevronRightIcon className="w-4 h-4 text-base-content/50" />
            </button>

            <button
              type="button"
              className="col-start-3 col-span-2 row-start-2 rounded-xl bg-base-100/70 border border-base-content/10 px-3 py-2.5 min-h-12 flex items-center justify-between hover:bg-base-300/50 transition-colors"
              onClick={onOpenDiceMaidenLinkModal}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                  <DiceFiveIcon className="w-4 h-4 text-accent" />
                </span>
                <span className="font-semibold text-sm">关联骰娘</span>
              </span>
              <ChevronRightIcon className="w-4 h-4 text-base-content/50" />
            </button>

            <button
              type="button"
              className="col-start-3 col-span-2 row-start-3 rounded-xl bg-base-100/70 border border-base-content/10 px-3 py-2.5 min-h-12 flex items-center justify-between hover:bg-base-300/50 transition-colors"
              onClick={onOpenAudioModal}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center">
                  <MicrophoneIcon className="w-4 h-4 text-secondary" />
                </span>
                <span className="font-semibold text-sm">上传音频</span>
              </span>
              <ChevronRightIcon className="w-4 h-4 text-base-content/50" />
            </button>

            {!isDiceMaiden && (onOpenStImportModal || onOpenAIGenerateModal) && (
              <div className="col-start-1 col-span-2 row-start-3 self-center w-full max-w-28 sm:max-w-32 justify-self-center grid grid-cols-2 gap-2">
                {onOpenStImportModal && (
                  <button
                    type="button"
                    className="btn btn-sm rounded-lg bg-info/70 text-info-content h-10 w-full"
                    onClick={onOpenStImportModal}
                  >
                    ST
                  </button>
                )}
                {onOpenAIGenerateModal && (
                  <button
                    type="button"
                    className="btn btn-sm rounded-lg btn-primary h-10 w-full"
                    onClick={onOpenAIGenerateModal}
                  >
                    AI
                  </button>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="mt-4">
              <label className="input rounded-md w-full">
                <input
                  type="text"
                  value={localRole.name}
                  onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="角色名称"
                />
              </label>
              <textarea
                value={localRole.description}
                onChange={(e) => {
                  setLocalRole(prev => ({ ...prev, description: e.target.value }));
                }}
                placeholder="角色描述"
                className="textarea textarea-sm w-full h-28 resize-none mt-3 rounded-md"
              />
              <div className="text-right mt-1">
                <span className={`text-sm font-bold ${charCount > maxDescriptionLength ? "text-error" : "text-base-content/70"
                }`}
                >
                  {charCount}
                  /
                  {maxDescriptionLength}
                  {charCount > maxDescriptionLength && (
                    <span className="ml-2">(已超出描述字数上限)</span>
                  )}
                </span>
              </div>
            </div>
          )}
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
              <div className="min-w-0">
                <h1 className="font-semibold text-2xl truncate">
                  {localRole.name || "未命名角色"}
                </h1>
                <p className="text-base-content/60 text-sm">
                  {isDiceMaiden ? "骰娘展示" : "角色展示"}
                  {" "}
                  ·
                  {currentRuleName || "未选择规则"}
                </p>
              </div>

              <div>
                {isEditing
                  ? (
                      <div>
                        <label className="input rounded-md w-full">
                          <input
                            type="text"
                            value={localRole.name}
                            onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="角色名称"
                          />
                        </label>
                        <textarea
                          value={localRole.description}
                          onChange={(e) => {
                            setLocalRole(prev => ({ ...prev, description: e.target.value }));
                          }}
                          placeholder="角色描述"
                          className="textarea textarea-sm w-full h-28 resize-none mt-3 rounded-md"
                        />
                        <div className="text-right mt-1">
                          <span className={`text-sm font-bold ${charCount > maxDescriptionLength ? "text-error" : "text-base-content/70"
                          }`}
                          >
                            {charCount}
                            /
                            {maxDescriptionLength}
                            {charCount > maxDescriptionLength && (
                              <span className="ml-2">(已超出描述字数上限)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  : (
                      <p className="text-base wrap-break-words max-w-full line-clamp-6 overflow-hidden text-ellipsis">
                        {localRole.description || "暂无描述"}
                      </p>
                    )}
              </div>

              <div className="text-xs text-base-content/60">
                角色ID号：
                {localRole.id}
              </div>
            </div>
          </div>

          <div className="lg:w-80 space-y-3 lg:pl-6">
            <div
              className="card bg-base-100 rounded-xl cursor-pointer transition-all duration-200"
              onClick={onOpenRuleModal}
            >
              <div className="card-body p-4 hover:bg-base-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <GearOutline className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">当前规则</h3>
                      <p className="text-primary font-medium text-sm">
                        {currentRuleName || "未选择规则"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-base-content/50">
                    <span className="text-xs">切换</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 rounded-xl transition-all duration-200">
              <div className="card-body p-4">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2"
                  onClick={onOpenDiceMaidenLinkModal}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <DiceFiveIcon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
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
                  <div className="flex items-center gap-1 text-base-content/50">
                    <span className="text-xs">{currentDicerRoleId ? "更改" : "设置"}</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 rounded-xl transition-all duration-200">
              <div className="card-body p-4">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2"
                  onClick={onOpenAudioModal}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <MicrophoneIcon className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">上传音频</h3>
                      <p className="text-secondary font-medium text-sm">
                        {localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-base-content/50">
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
