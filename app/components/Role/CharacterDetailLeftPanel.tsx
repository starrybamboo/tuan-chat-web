import type { RoleAvatar } from "api";
import type { Dispatch, SetStateAction } from "react";
import type { Role } from "./types";
import { ChevronRightIcon, DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";

export interface CharacterDetailLeftPanelProps {
  isQueryLoading: boolean;
  isEditing: boolean;
  isDiceMaiden: boolean;
  localRole: Role;
  roleAvatars: RoleAvatar[];
  selectedAvatarId: number;
  selectedAvatarUrl: string;
  selectedSpriteUrl: string;
  charCount: number;
  maxDescriptionLength: number;
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
  setLocalRole: Dispatch<SetStateAction<Role>>;
  onAudioRoleUpdate: (updatedRole: Role) => void;
  onAudioDelete: () => void;
}

export default function CharacterDetailLeftPanel({
  isQueryLoading,
  isEditing,
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
  setLocalRole,
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
          {!isEditing && (
            <div className="divider font-bold text-center text-xl flex">
              <span className="shrink-0 lg:max-w-48 truncate">
                {localRole.name}
              </span>
            </div>
          )}
          {isEditing && <div className="divider my-0" />}
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
                      className="textarea textarea-sm w-full h-24 resize-none mt-4 rounded-md"
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
                  <>
                    <p className="text-base wrap-break-words max-w-full text-center line-clamp-6 overflow-hidden text-ellipsis">
                      {localRole.description || "暂无描述"}
                    </p>
                  </>
                )}
          </div>
        </div>

        <p className="text-center text-xs text-base-content/60">
          角色ID号：
          {localRole.id}
        </p>
        <div className="divider p-4 my-0" />

        <div>
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
          <div className="divider p-4 my-0" />

          <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
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

              <AudioPlayer
                role={localRole}
                onRoleUpdate={onAudioRoleUpdate}
                onDelete={onAudioDelete}
              />
            </div>
          </div>

          <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
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
        </div>
      </div>
    </div>
  );
}
