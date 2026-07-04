import type { RoleAvatar } from "api";

import { DiceFiveIcon, GearOutline, MicrophoneIcon } from "@/icons";

import type { Role } from "./types";

import RoleBasicInfoEditor from "./RoleBasicInfoEditor";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";
import RoleSidebarActionCard from "./RoleSidebarActionCard";
import { hasRoleVoiceMedia } from "./roleVoiceMedia";

export type CharacterDetailLeftPanelProps = {
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
  onAvatarUpload: (data: any) => void;
  onAvatarTitleSave?: (avatarId: number, title: string) => void;
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
  onAvatarUpload,
  onBaseRoleSave,
  onAudioRoleUpdate,
  onAudioDelete,
}: CharacterDetailLeftPanelProps) {
  return (
    <div className="
      lg:col-span-1
      self-start
      lg:sticky lg:top-4
      space-y-6
    ">
      <div className="
        card-sm
        md:card-xl
        bg-base-100 shadow-xs rounded-xl
        md:border-2 md:border-base-content/10
      ">
        <div className="card-body flex flex-col p-4">
          <div className="flex flex-1 items-center justify-center">
            {isQueryLoading
              ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="skeleton size-24 rounded-full"></div>
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
            nameClassName="truncate text-xl font-bold"
            descriptionEditorClassName="pt-6"
            descriptionDisplayClassName="w-full text-base wrap-break-words max-w-full line-clamp-6 overflow-hidden text-ellipsis"
            descriptionButtonClassName="py-3"
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
            subtitleClassName="text-info"
            actionLabel="切换"
            onClick={onOpenRuleModal}
            className="mb-4"
            icon={(
              <div className="
                flex size-8 items-center justify-center rounded-full
                bg-info/10
              ">
                <GearOutline className="size-4 text-info" />
              </div>
            )}
          />

          <RoleSidebarActionCard
            title="上传音频"
            subtitle={hasRoleVoiceMedia(localRole) ? "已上传音频" : "用于AI生成角色音色"}
            subtitleClassName="text-base-content/70"
            actionLabel="上传"
            onClick={onOpenAudioModal}
            className="mb-4"
            icon={(
              <div className="
                flex size-8 items-center justify-center rounded-full
                bg-base-200
              ">
                <MicrophoneIcon className="size-4 text-base-content/70" />
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
              subtitleClassName={dicerRoleError ? "text-error" : "text-base-content/70"}
              actionLabel={currentDicerRoleId ? "更改" : "设置"}
              onClick={onOpenDiceMaidenLinkModal}
              className="mb-4"
              icon={(
                <div className="
                  flex size-8 items-center justify-center rounded-full
                  bg-base-200
                ">
                  <DiceFiveIcon className="size-4 text-base-content/70" />
                </div>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
