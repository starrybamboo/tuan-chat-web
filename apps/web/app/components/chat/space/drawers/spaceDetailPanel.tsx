import { lazy, Suspense, use, useState } from "react";
import toast from "react-hot-toast";

import type { SpaceDetailTab } from "@/components/chat/chatPage.types";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import MemberLists from "@/components/chat/shared/components/memberLists";
import RoleList from "@/components/chat/shared/components/roleLists";
import SpaceInvitePanel from "@/components/chat/space/spaceInvitePanel";
import { canInviteSpectators } from "@/components/chat/utils/memberPermissions";
import { canViewSpaceDetailTab } from "@/components/chat/utils/spaceDetailPermissions";
import { AddRoleWindow } from "@/components/chat/window/addRoleWindow";
import SpaceSettingWindow from "@/components/chat/window/spaceSettingWindow";
import SpaceTrpgSettingWindow from "@/components/chat/window/spaceTrpgSettingWindow";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { BaselineArrowBackIosNew } from "@/icons";

import {
  useAddSpaceMemberMutation,
  useAddSpaceRoleMutation,
  useGetSpaceMembersQuery,
  useSetPlayerMutation,
} from "../../../../../api/hooks/chatQueryHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../../api/hooks/spaceRepositoryHooks";

const LazyWorkflowWindow = lazy(() => import("../../window/workflowWindow"));
const LazySpaceWebgalRenderWindow = lazy(() => import("@/components/chat/window/spaceWebgalRenderWindow"));
const LazySpaceMaterialLibraryPage = lazy(() => import("@/components/material/pages/spaceMaterialLibraryPage"));

function SpaceDetailLazyFallback({ text }: { text: string }) {
  return (
    <div className="
      flex h-full items-center justify-center text-sm text-base-content/60
    ">
      <span className="loading loading-spinner loading-sm" />
      <span className="ml-2">{text}</span>
    </div>
  );
}

export default function SpaceDetailPanel({ activeTab, onClose }: { activeTab: SpaceDetailTab; onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const spaceMemberQuery = useGetSpaceMembersQuery(spaceId);
  const spaceMembers = spaceMemberQuery.data?.data ?? [];
  const spaceRolesQuery = useGetSpaceRepositoryRoleQuery(spaceId);
  const spaceRoles = spaceRolesQuery.data?.data ?? [];

  const requestedTab = (!spaceContext.isSpaceOwner && activeTab === "setting") ? null : activeTab;
  const resolvedTab = requestedTab && canViewSpaceDetailTab(requestedTab, spaceContext.memberType)
    ? requestedTab
    : null;
  const panelTitle = resolvedTab === "members"
    ? "空间成员"
    : resolvedTab === "roles"
      ? "空间角色"
      : resolvedTab === "workflow"
        ? "流程图"
        : resolvedTab === "trpg"
          ? "跑团设置"
          : resolvedTab === "webgal"
            ? "WebGAL 渲染"
            : resolvedTab === "material"
              ? "局内素材包"
              : "无权限查看";

  const [isRoleHandleOpen, setIsRoleHandleOpen] = useState(false);
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useState(false);
  const canInviteMembers = canInviteSpectators(spaceContext.memberType);

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
        toast("添加角色成功");
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
    <div className="size-full overflow-hidden">
      <div className="
        flex items-center gap-2 h-10 px-2 border-y border-gray-300
        dark:border-gray-700
        bg-base-100
      ">
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
      {resolvedTab == null && (
        <div className="
          flex h-full items-center justify-center p-6 text-sm
          text-base-content/60
        ">
          当前身份无权查看该空间面板
        </div>
      )}

      {resolvedTab === "members" && (
        <div className="h-full space-y-2 overflow-y-auto">
          <MemberLists members={spaceMembers} isSpace={true}></MemberLists>
        </div>
      )}

      {resolvedTab === "roles" && (
        <div className="h-full overflow-y-auto p-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-semibold">
              空间角色-
              {spaceRoles.length}
            </div>
            {spaceContext.isSpaceOwner && (
              <button
                type="button"
                className="btn btn-xs btn-dash btn-info"
                onClick={() => setIsRoleHandleOpen(true)}
              >
                角色+
              </button>
            )}
          </div>
          {spaceRoles.length === 0
            ? (
                <div className="text-center font-bold py-6">暂无空间角色</div>
              )
            : (
                <RoleList roles={spaceRoles} className="w-full" isNpcRole={false} />
              )}
        </div>
      )}

      {resolvedTab === "setting" && spaceContext.isSpaceOwner && (
        <div className="h-full overflow-y-auto">
          <SpaceSettingWindow onClose={onClose} />
        </div>
      )}

      {resolvedTab === "workflow" && (
        <div className="h-full overflow-y-auto">
          <Suspense fallback={<SpaceDetailLazyFallback text="正在加载流程图..." />}>
            <LazyWorkflowWindow />
          </Suspense>
        </div>
      )}

      {resolvedTab === "trpg" && (
        <div className="h-full overflow-hidden">
          <SpaceTrpgSettingWindow />
        </div>
      )}

      {resolvedTab === "webgal" && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<SpaceDetailLazyFallback text="正在加载 WebGAL 渲染..." />}>
            <LazySpaceWebgalRenderWindow spaceId={spaceId} />
          </Suspense>
        </div>
      )}

      {resolvedTab === "material" && (
        <div className="h-full overflow-hidden">
          <Suspense fallback={<SpaceDetailLazyFallback text="正在加载局内素材包..." />}>
            <LazySpaceMaterialLibraryPage spaceId={spaceId} embedded />
          </Suspense>
        </div>
      )}

      <ToastWindow isOpen={isRoleHandleOpen} onClose={() => setIsRoleHandleOpen(false)}>
        <AddRoleWindow handleAddRole={handleAddRole}></AddRoleWindow>
      </ToastWindow>
      <ToastWindow
        isOpen={canInviteMembers && isMemberHandleOpen}
        onClose={() => {
          setIsMemberHandleOpen(false);
        }}
        disableScroll={true}
        panelClassName="!max-w-none !p-0 overflow-hidden rounded-lg border border-base-300/70 shadow-2xl"
      >
        <SpaceInvitePanel
          onAddSpectator={handleAddMember}
          onAddPlayer={handleAddPlayer}
        />
      </ToastWindow>
    </div>
  );
}
