import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { DiceFiveIcon, GearOutline, MicrophoneIcon } from "app/icons";
import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";
import RoleSidebarActionCard from "./RoleSidebarActionCard";

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
        <div className="card-body flex flex-col p-4">
          <div className="flex flex-1 items-center justify-center">
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
          <RoleSidebarActionCard
            title="当前规则"
            subtitle={currentRuleName || "未选择规则"}
            subtitleClassName="text-primary"
            actionLabel="切换"
            onClick={onOpenRuleModal}
            className="mb-4"
            icon={(
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <GearOutline className="h-4 w-4 text-primary" />
              </div>
            )}
          />

          <RoleSidebarActionCard
            title="上传音频"
            subtitle={localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色"}
            subtitleClassName="text-secondary"
            actionLabel="上传"
            onClick={onOpenAudioModal}
            className="mb-4"
            icon={(
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/10">
                <MicrophoneIcon className="h-4 w-4 text-secondary" />
              </div>
            )}
            extraContent={(
              <AudioPlayer
                role={localRole}
                onRoleUpdate={onAudioRoleUpdate}
                onDelete={onAudioDelete}
              />
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
              className="mb-4"
              icon={(
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                  <DiceFiveIcon className="h-4 w-4 text-accent" />
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
