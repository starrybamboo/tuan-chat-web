import React, { useState } from "react";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { canInviteSpectators, canManageMemberPermissions } from "@/components/chat/utils/memberPermissions";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";

interface SpaceInvitePanelProps {
  onAddSpectator: (userId: number) => void;
  onAddPlayer: (userId: number) => void;
}

export default function SpaceInvitePanel({ onAddSpectator, onAddPlayer }: SpaceInvitePanelProps) {
  const spaceContext = React.use(SpaceContext);
  const canInvitePlayers = canManageMemberPermissions(spaceContext.memberType);
  const canInviteMembers = canInviteSpectators(spaceContext.memberType);
  const [spaceInviteMode, setSpaceInviteMode] = useState<"spectator" | "player">(canInvitePlayers ? "player" : "spectator");

  React.useEffect(() => {
    setSpaceInviteMode(canInvitePlayers ? "player" : "spectator");
  }, [canInvitePlayers]);

  if (!canInviteMembers) {
    return (
      <div className="w-[min(720px,92vw)]">
        <div className="alert alert-warning">
          <span className="text-sm">当前身份无权邀请空间成员。</span>
        </div>
      </div>
    );
  }

  const effectiveInviteMode = canInvitePlayers ? spaceInviteMode : "spectator";

  return (
    <div className="w-[min(720px,92vw)]">
      {canInvitePlayers
        ? (
            <div className="mb-3">
              <div className="text-sm font-medium opacity-80 mb-2">邀请类型</div>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 cursor-pointer ${spaceInviteMode === "player" ? "bg-base-200" : "bg-base-100"}`}
                >
                  <input
                    type="radio"
                    name="space_invite_mode"
                    className="radio radio-sm mt-1"
                    checked={spaceInviteMode === "player"}
                    onChange={() => setSpaceInviteMode("player")}
                    aria-label="邀请玩家"
                  />
                  <div className="min-w-0">
                    <div className="font-medium">邀请玩家</div>
                    <div className="text-xs opacity-70">加入空间后会自动授予玩家身份</div>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 cursor-pointer ${spaceInviteMode === "spectator" ? "bg-base-200" : "bg-base-100"}`}
                >
                  <input
                    type="radio"
                    name="space_invite_mode"
                    className="radio radio-sm mt-1"
                    checked={spaceInviteMode === "spectator"}
                    onChange={() => setSpaceInviteMode("spectator")}
                    aria-label="邀请观战"
                  />
                  <div className="min-w-0">
                    <div className="font-medium">邀请观战</div>
                    <div className="text-xs opacity-70">加入空间成员（不授予玩家身份）</div>
                  </div>
                </label>
              </div>
            </div>
          )
        : (
            <div className="alert alert-info mb-3">
              <span className="text-sm">当前身份可邀请观战成员加入空间。</span>
            </div>
          )}

      {effectiveInviteMode === "player" && (
        <div className="alert alert-info mb-3">
          <span className="text-sm">提示：邀请玩家会在加入空间后自动授予玩家身份，加入默认房间，可参与发言。</span>
        </div>
      )}
      <AddMemberWindow
        handleAddMember={userId => (effectiveInviteMode === "spectator" ? onAddSpectator(userId) : onAddPlayer(userId))}
        showSpace={false}
        inviteCodeType={effectiveInviteMode === "player" ? 1 : 0}
        targetType="space"
      />
    </div>
  );
}
