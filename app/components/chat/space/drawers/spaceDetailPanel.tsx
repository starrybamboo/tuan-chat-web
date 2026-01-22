import type { SpaceDetailTab } from "../spaceHeaderBar";

import { use, useState } from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import MemberLists from "@/components/chat/shared/components/memberLists";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import SpaceSettingWindow from "@/components/chat/window/spaceSettingWindow";
import SpaceTrpgSettingWindow from "@/components/chat/window/spaceTrpgSettingWindow";
import { PopWindow } from "@/components/common/popWindow";
import { BaselineArrowBackIosNew } from "@/icons";
import {
  useAddSpaceMemberMutation,
  useAddSpaceRoleMutation,
  useGetSpaceMembersQuery,
  useSetPlayerMutation,
} from "../../../../../api/hooks/chatQueryHooks";
import WorkflowWindow from "../../window/workflowWindow";

export default function SpaceDetailPanel({ activeTab, onClose }: { activeTab: SpaceDetailTab; onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const spaceMemberQuery = useGetSpaceMembersQuery(spaceId);
  const spaceMembers = spaceMemberQuery.data?.data ?? [];
  // const spaceRolesQuery = useGetSpaceRolesQuery(spaceId);
  // const spaceRoles = spaceRolesQuery.data?.data ?? [];

  const resolvedTab = (!spaceContext.isSpaceOwner && activeTab === "setting") ? "members" : activeTab;
  const panelTitle = resolvedTab === "members"
    ? "空间成员"
    : resolvedTab === "workflow"
      ? "流程图"
      : resolvedTab === "trpg"
        ? "跑团设置"
        : "空间资料";

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState(false);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useState(false);
  const [inviteMemberMode, setInviteMemberMode] = useState<"spectator" | "player">("spectator");

  const addMemberMutation = useAddSpaceMemberMutation();
  const addRoleMutation = useAddSpaceRoleMutation();
  const setPlayerMutation = useSetPlayerMutation();

  const handleAddRole = async (roleId: number) => {
    addRoleMutation.mutate({
      spaceId,
      roleId,
    }, {
      onSettled: () => {
        // setIsRoleHandleOpen(false);
        toast("添加NPC成功");
      },
    });
  };

  async function handleAddMember(userId: number) {
    addMemberMutation.mutate({
      spaceId,
      userIdList: [userId],
    }, {
      onSettled: () => {
        setIsMemberHandleOpen(false);
      },
    });
  }

  const handleAddPlayer = (userId: number) => {
    const isAlreadyMember = spaceMembers.some(m => m.userId === userId);

    const grantPlayer = () => {
      setPlayerMutation.mutate({
        spaceId,
        uidList: [userId],
      }, {
        onSettled: () => {
          setIsMemberHandleOpen(false);
          setInviteMemberMode("spectator");
        },
      });
    };

    if (isAlreadyMember) {
      grantPlayer();
      return;
    }

    addMemberMutation.mutate({
      spaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        grantPlayer();
      },
      onError: () => {
        grantPlayer();
      },
    });
  };
  return (
    <div className="h-full w-full overflow-hidden">
      <div className="flex items-center gap-2 h-10 px-2 border-t border-b border-gray-300 dark:border-gray-700 bg-base-100">
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square"
          aria-label="返回聊天"
          onClick={onClose}
        >
          <BaselineArrowBackIosNew className="size-5" />
        </button>
        <div className="text-sm font-medium opacity-80 truncate">
          {panelTitle}
        </div>

      </div>
      {resolvedTab === "members" && (
        <div className="h-full space-y-2 p-4 overflow-y-auto">
          <MemberLists members={spaceMembers} isSpace={true}></MemberLists>
        </div>
      )}

      {resolvedTab === "setting" && spaceContext.isSpaceOwner && (
        <div className="h-full p-4 overflow-y-auto">
          <SpaceSettingWindow onClose={onClose} />
        </div>
      )}

      {resolvedTab === "workflow" && (
        <div className="h-full p-4 overflow-y-auto">
          <WorkflowWindow></WorkflowWindow>
        </div>
      )}

      {resolvedTab === "trpg" && (
        <div className="h-full overflow-hidden">
          <SpaceTrpgSettingWindow />
        </div>
      )}

      <PopWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </PopWindow>
      <PopWindow
        isOpen={isMemberHandleOpen}
        onClose={() => {
          setIsMemberHandleOpen(false);
          setInviteMemberMode("spectator");
        }}
      >
        <div className="w-[min(720px,92vw)]">
          <div className="mb-3">
            <div className="text-sm font-medium opacity-80 mb-2">邀请类型</div>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 cursor-pointer ${inviteMemberMode === "spectator" ? "bg-base-200" : "bg-base-100"}`}
              >
                <input
                  type="radio"
                  name="space_invite_mode_panel"
                  className="radio radio-sm mt-1"
                  checked={inviteMemberMode === "spectator"}
                  onChange={() => setInviteMemberMode("spectator")}
                  aria-label="邀请观战"
                />
                <div className="min-w-0">
                  <div className="font-medium">邀请观战</div>
                  <div className="text-xs opacity-70">加入空间成员（不授予玩家身份）</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border border-base-300 p-3 cursor-pointer ${inviteMemberMode === "player" ? "bg-base-200" : "bg-base-100"}`}
              >
                <input
                  type="radio"
                  name="space_invite_mode_panel"
                  className="radio radio-sm mt-1"
                  checked={inviteMemberMode === "player"}
                  onChange={() => setInviteMemberMode("player")}
                  aria-label="邀请玩家"
                />
                <div className="min-w-0">
                  <div className="font-medium">邀请玩家</div>
                  <div className="text-xs opacity-70">加入空间后会自动授予玩家身份</div>
                </div>
              </label>
            </div>
          </div>

          {inviteMemberMode === "player" && (
            <div className="alert alert-info mb-3">
              <span className="text-sm">提示：邀请玩家会在加入空间后自动授予玩家身份，可参与游戏。</span>
            </div>
          )}
          <AddMemberWindow handleAddMember={userId => (inviteMemberMode === "spectator" ? handleAddMember(userId) : handleAddPlayer(userId))}></AddMemberWindow>
        </div>
      </PopWindow>
    </div>
  );
}
