import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";

export interface CharacterDetailLeftPanelProps {
  isQueryLoading: boolean;
  isDiceMaiden: boolean;
  localRole: Role;
  roleAvatars: RoleAvatar[];
  selectedAvatarId: number;
  selectedAvatarUrl: string;
  selectedSpriteUrl: string;
  maxDescriptionLength: number;
  maxRoleNameLength: number;
  currentRuleName?: string;
  currentDicerRoleId?: number;
  dicerRoleError: string | null;
  linkedDicerRoleName?: string;
  onOpenRuleModal: () => void;
  onOpenAudioModal: () => void;
  onOpenDiceMaidenLinkModal: () => void;
  onAvatarChange: (previewUrl: string, avatarId: number) => void;
  onAvatarSelect: (avatarId: number) => void;
  onAvatarDelete: (avatarId: number) => void;
  onAvatarUpload: (data: any) => void;
  onBaseRoleSave: (updatedRole: Role) => void;
  onAudioRoleUpdate: (updatedRole: Role) => void;
  onAudioDelete: () => void;
}

export default function CharacterDetailLeftPanel({
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
    <div className="lg:col-span-1 self-start lg:sticky lg:top-4 space-y-6">
      <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
        <div className="card-body p-4 max-h-168">
          <div className="flex justify-center mt-6 mb-2">
            {isQueryLoading
              ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="skeleton w-24 h-24 rounded-full"></div>
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
                    onchange={onAvatarChange}
                    onAvatarSelect={onAvatarSelect}
                    onAvatarDelete={onAvatarDelete}
                    onAvatarUpload={onAvatarUpload}
                    useUrlState={false}
                  />
                )}
          </div>
          <div className="divider my-0" />
          <RoleBasicInfoEditor
            localRole={localRole}
            maxRoleNameLength={maxRoleNameLength}
            maxDescriptionLength={maxDescriptionLength}
            onBaseRoleSave={onBaseRoleSave}
            align="center"
            nameClassName="truncate text-center text-xl font-bold"
            descriptionDisplayClassName="text-base wrap-break-words max-w-full line-clamp-6 overflow-hidden text-ellipsis"
          />
        </div>

        <p className="text-center text-xs text-base-content/60">
          角色ID号：
          {localRole.id}
        </p>

        <div>
          <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
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

          <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
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

              <AudioPlayer
                role={localRole}
                onRoleUpdate={onAudioRoleUpdate}
                onDelete={onAudioDelete}
              />
            </div>
          </div>

          {!isDiceMaiden && (
            <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
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
        </div>
      </div>
    </div>
  );
}
