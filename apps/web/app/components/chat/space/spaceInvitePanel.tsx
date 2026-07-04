import { UserPlusIcon, UsersIcon } from "@phosphor-icons/react";
import React, { useState } from "react";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { canInviteSpectators, canManageMemberPermissions } from "@/components/chat/utils/memberPermissions";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { InfoIcon } from "@/icons";

type SpaceInvitePanelProps = {
  onAddSpectator: (userId: number) => void;
  onAddPlayer: (userId: number) => void;
  title?: string;
}

export default function SpaceInvitePanel({
  onAddPlayer,
  onAddSpectator,
  title = "邀请空间成员",
}: SpaceInvitePanelProps) {
  const spaceContext = React.use(SpaceContext);
  const canInvitePlayers = canManageMemberPermissions(spaceContext.memberType);
  const canInviteMembers = canInviteSpectators(spaceContext.memberType);
  const [spaceInviteMode, setSpaceInviteMode] = useState<"spectator" | "player">(canInvitePlayers ? "player" : "spectator");

  React.useEffect(() => {
    setSpaceInviteMode(canInvitePlayers ? "player" : "spectator");
  }, [canInvitePlayers]);

  if (!canInviteMembers) {
    return (
      <div className="
        flex max-h-[min(82vh,760px)] w-[min(680px,calc(100vw-2rem))] flex-col
        overflow-hidden bg-base-100 text-base-content
      ">
        <header className="
          border-b border-base-300/70 bg-base-100 px-6 py-5 pr-14
        ">
          <p className="text-sm text-base-content/60">成员邀请</p>
          <h2 className="mt-1 text-2xl/tight font-semibold">无法邀请成员</h2>
          <p className="mt-2 text-sm/6 text-base-content/65">当前身份无权邀请空间成员。</p>
        </header>
        <div className="px-6 py-5">
          <div className="
            flex items-start gap-3 rounded-lg border border-warning/30
            bg-warning/10 p-4 text-sm/6
          ">
            <InfoIcon className="mt-0.5 size-5 shrink-0 text-warning" />
            <span>如果需要邀请成员，请让空间主持人调整你的成员权限。</span>
          </div>
        </div>
      </div>
    );
  }

  const effectiveInviteMode = canInvitePlayers ? spaceInviteMode : "spectator";

  return (
    <AddMemberWindow
      handleAddMember={userId => (effectiveInviteMode === "spectator" ? onAddSpectator(userId) : onAddPlayer(userId))}
      headerExtra={(
        <div className="space-y-3">
          {canInvitePlayers
            ? (
                <div className="space-y-2">
                  <InviteModeCard
                    active={spaceInviteMode === "player"}
                    icon={<UserPlusIcon className="size-4" weight="regular" />}
                    inputName="space_invite_mode"
                    label="邀请玩家"
                    onSelect={() => setSpaceInviteMode("player")}
                  />
                  <InviteModeCard
                    active={spaceInviteMode === "spectator"}
                    icon={<UsersIcon className="size-4" weight="regular" />}
                    inputName="space_invite_mode"
                    label="邀请观战"
                    onSelect={() => setSpaceInviteMode("spectator")}
                  />
                </div>
              )
            : null}

        </div>
      )}
      inviteCodeType={effectiveInviteMode === "player" ? 1 : 0}
      targetType="space"
      title={title}
    />
  );
}

function InviteModeCard({
  active,
  icon,
  inputName,
  label,
  onSelect,
}: {
  active: boolean;
  icon: React.ReactNode;
  inputName: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`
        flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition
        ${
        active ? "border-info/50 bg-info/10" : `
          border-base-300 bg-base-100
          hover:bg-base-200/60
        `
      }
      `}
    >
      <input
        type="radio"
        name={inputName}
        className="radio radio-sm mt-1"
        checked={active}
        onChange={onSelect}
        aria-label={label}
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {label}
        </span>
      </span>
    </label>
  );
}
