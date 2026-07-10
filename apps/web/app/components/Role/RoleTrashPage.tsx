import type { Space } from "@tuanchat/openapi-client/models/Space";
import { appToast } from "@/components/common/appToast/appToast";

import { ArrowClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useGetUserActiveSpacesQuery } from "api/hooks/chatQueryHooks";
import {
  useClearRoleTrashMutation,
  useClearSpaceNpcRoleTrashMutation,
  useHardDeleteRolesMutation,
} from "api/hooks/RoleAndAvatarHooks";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import RoleAvatarComponent from "@/components/common/roleAvatar";

import type { Role } from "./types";

import { useRoleUiStore } from "./stores/roleUiStore";
import { useRoleTrashModel } from "./useRoleListModel";

function roleTypeLabel(role: Role) {
  if (role.type === 1) {
    return "骰娘";
  }
  if (role.type === 2) {
    return "NPC";
  }
  return "角色";
}

function RoleTrashItem({
  role,
  onHardDelete,
  isDeleting,
}: {
  role: Role;
  onHardDelete: (role: Role) => void;
  isDeleting: boolean;
}) {
  const displayName = role.name || "未命名项目";
  const typeLabel = roleTypeLabel(role);
  const roleSummary = `${displayName}，${typeLabel}，ID ${role.id}`;

  return (
    <div className="
      flex items-center gap-3 rounded-lg border border-base-content/10 bg-base-100
      p-3 shadow-xs
    ">
      <RoleAvatarComponent
        avatarId={role.avatarId}
        avatarUrl={role.avatar}
        avatarThumbUrl={role.avatarThumb}
        roleId={role.id}
        roleType={role.type}
        width={14}
        isRounded={true}
        stopToastWindow={true}
        alt={role.name || "头像"}
        imageLoading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-medium" title={roleSummary}>{displayName}</h3>
          <span className="badge badge-ghost shrink-0 text-xs">{typeLabel}</span>
        </div>
        <p className="mt-1 truncate text-xs text-base-content/60" title={`#${role.id} · ${role.description || "暂无描述"}`}>
          #
          {role.id}
          {" · "}
          {role.description || "暂无描述"}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-error btn-sm shrink-0"
        disabled={isDeleting}
        onClick={() => onHardDelete(role)}
        aria-label={`永久删除 ${roleSummary}`}
        aria-busy={isDeleting}
      >
        <TrashSimpleIcon size={16} weight="regular" />
        硬删除
      </button>
    </div>
  );
}

export default function RoleTrashPage() {
  const router = useRouter();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const isSpaceNpcTrash = searchParams.get("trash") === "spaceNpc";
  const trashScope = isSpaceNpcTrash ? "spaceNpc" : "personal";
  const searchQuery = useRoleUiStore(state => state.sidebarSearchQuery);
  const spacesQuery = useGetUserActiveSpacesQuery();
  const spaces = spacesQuery.data?.data ?? [];
  const availableSpaces = useMemo(
    () => spaces.filter((space): space is Space & { spaceId: number } =>
      typeof space.spaceId === "number" && space.spaceId > 0),
    [spaces],
  );
  const [selectedSpaceId, setSelectedSpaceId] = useState<number>(-1);
  const effectiveSpaceId = isSpaceNpcTrash
    ? selectedSpaceId > 0
      ? selectedSpaceId
      : availableSpaces[0]?.spaceId ?? -1
    : -1;
  const trashModel = useRoleTrashModel({
    roleName: searchQuery,
    scope: trashScope,
    spaceId: effectiveSpaceId,
  });
  const allTrashCount = useRoleTrashModel({
    scope: trashScope,
    spaceId: effectiveSpaceId,
    pageSize: 1,
  });
  const hardDeleteMutation = useHardDeleteRolesMutation();
  const clearTrashMutation = useClearRoleTrashMutation();
  const clearSpaceNpcTrashMutation = useClearSpaceNpcRoleTrashMutation();
  const [pendingHardDeleteRole, setPendingHardDeleteRole] = useState<Role | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isSpaceNpcTrash || selectedSpaceId > 0) {
      return;
    }
    const firstSpaceId = availableSpaces[0]?.spaceId;
    if (firstSpaceId) {
      setSelectedSpaceId(firstSpaceId);
    }
  }, [availableSpaces, isSpaceNpcTrash, selectedSpaceId]);

  const handleConfirmHardDelete = async () => {
    if (!pendingHardDeleteRole) {
      return;
    }

    try {
      await hardDeleteMutation.mutateAsync([pendingHardDeleteRole.id]);
      appToast.success("项目已硬删除");
      setPendingHardDeleteRole(null);
      await trashModel.refetch();
    }
    catch (error) {
      console.error("硬删除项目失败:", error);
      appToast.error(error instanceof Error ? error.message : "硬删除项目失败");
    }
  };

  const handleConfirmClearTrash = async () => {
    try {
      if (isSpaceNpcTrash) {
        if (effectiveSpaceId <= 0) {
          appToast.error("请选择空间");
          return;
        }
        await clearSpaceNpcTrashMutation.mutateAsync(effectiveSpaceId);
      }
      else {
        await clearTrashMutation.mutateAsync();
      }
      appToast.success("回收站已清空");
      setClearConfirmOpen(false);
      await trashModel.refetch();
    }
    catch (error) {
      console.error("清空回收站失败:", error);
      appToast.error(error instanceof Error ? error.message : "清空回收站失败");
    }
  };

  const hasSearch = searchQuery.trim().length > 0;
  const currentClearPending = isSpaceNpcTrash
    ? clearSpaceNpcTrashMutation.isPending
    : clearTrashMutation.isPending;
  const clearDisabled = allTrashCount.isLoading
    || allTrashCount.isError
    || allTrashCount.total <= 0
    || currentClearPending
    || hardDeleteMutation.isPending;
  const scopeTitle = isSpaceNpcTrash ? "空间 NPC" : "角色与骰娘";
  const description = isSpaceNpcTrash
    ? "这里的 NPC 已经从所选空间软删除。硬删除后会永久移除 NPC、头像、立绘组和可释放的媒体引用。"
    : "这里的角色与骰娘已经被软删除。硬删除后会永久移除项目、头像、立绘组和可释放的媒体引用。";

  return (
    <div className="p-4 md:p-0">
      <div className="
        mb-4 flex flex-col gap-3 border-b border-base-content/10 pb-4
        md:flex-row md:items-center md:justify-between
      ">
        <div>
          <div className="flex items-center gap-2">
            <TrashSimpleIcon size={24} weight="regular" className="text-error" />
            <h1 className="text-2xl font-bold">回收站</h1>
            <span className="badge badge-neutral">{trashModel.total}</span>
            <span className="badge badge-ghost">{scopeTitle}</span>
          </div>
          <p className="mt-1 text-sm text-base-content/60">
            {description}
          </p>
          {isSpaceNpcTrash && (
            <div className="mt-3 max-w-xs">
              <select
                className="select select-bordered select-sm w-full"
                value={effectiveSpaceId > 0 ? String(effectiveSpaceId) : ""}
                disabled={spacesQuery.isLoading || availableSpaces.length === 0}
                onChange={event => setSelectedSpaceId(Number(event.target.value))}
              >
                {availableSpaces.length === 0
                  ? <option value="">暂无空间</option>
                  : availableSpaces.map(space => (
                      <option key={space.spaceId} value={space.spaceId}>
                        {space.name || `空间 #${space.spaceId}`}
                      </option>
                    ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-error btn-sm"
            onClick={() => setClearConfirmOpen(true)}
            disabled={clearDisabled}
          >
            <TrashSimpleIcon size={16} weight="regular" />
            清空回收站
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void trashModel.refetch()}
            disabled={trashModel.isFetching}
            aria-busy={trashModel.isFetching}
            title={trashModel.isFetching ? "正在刷新回收站" : "刷新回收站"}
          >
            <ArrowClockwiseIcon
              size={16}
              weight="regular"
              className={trashModel.isFetching ? "animate-spin motion-reduce:animate-none" : ""}
            />
            刷新
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => router.history.push("/role")}
          >
            返回角色
          </button>
        </div>
      </div>

      {isSpaceNpcTrash && !spacesQuery.isLoading && availableSpaces.length === 0
        ? (
            <div className="
              rounded-lg border border-dashed border-base-content/20 bg-base-100
              px-6 py-12 text-center text-base-content/60
            ">
              暂无可查看的空间
            </div>
          )
        : trashModel.isLoading || (isSpaceNpcTrash && spacesQuery.isLoading)
        ? (
            <div className="space-y-2" role="status" aria-label="正在加载回收站">
              <div className="skeleton h-20 w-full rounded-lg" />
              <div className="skeleton h-20 w-full rounded-lg" />
              <div className="skeleton h-20 w-full rounded-lg" />
            </div>
          )
        : trashModel.isError
          ? (
              <div className="
                rounded-lg border border-error/20 bg-error/5 px-6 py-10 text-center
              ">
                <p className="font-medium text-error">回收站加载失败</p>
                <p className="mt-2 text-sm text-base-content/60">请检查后端服务后重试。</p>
                <button
                  type="button"
                  className="btn btn-error btn-sm mt-4"
                  onClick={() => void trashModel.refetch()}
                  disabled={trashModel.isFetching}
                >
                  重试
                </button>
              </div>
            )
        : trashModel.roles.length === 0
          ? (
              <div className="
                rounded-lg border border-dashed border-base-content/20 bg-base-100
                px-6 py-12 text-center text-base-content/60
              ">
                {hasSearch ? "没有匹配的已删除项目" : "回收站为空"}
              </div>
            )
          : (
              <div className="space-y-2">
                {trashModel.roles.map(role => (
                  <RoleTrashItem
                    key={role.id}
                    role={role}
                    onHardDelete={setPendingHardDeleteRole}
                    isDeleting={hardDeleteMutation.isPending && pendingHardDeleteRole?.id === role.id}
                  />
                ))}
              </div>
            )}

      <ConfirmDialog
        open={pendingHardDeleteRole !== null}
        onOpenChange={(open) => {
          if (!open)
            setPendingHardDeleteRole(null);
        }}
        onConfirm={handleConfirmHardDelete}
        title="确认硬删除项目"
        description={(
          <>
            确定要永久删除
            <span className="mx-1 font-semibold text-error">
              {pendingHardDeleteRole?.name || "未命名项目"}
            </span>
            吗？这个操作无法恢复。
          </>
        )}
        confirmLabel="硬删除"
        cancelLabel="取消"
        icon={<TrashSimpleIcon className="size-6" weight="regular" />}
        variant="danger"
      />

      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={(open) => {
          if (!open)
            setClearConfirmOpen(false);
        }}
        onConfirm={handleConfirmClearTrash}
        title="确认清空回收站"
        description={(
          <>
            确定要永久删除回收站中的全部
            <span className="mx-1 font-semibold text-error">
              {allTrashCount.total}
            </span>
            个项目吗？这个操作不会受当前搜索过滤影响，且无法恢复。
          </>
        )}
        confirmLabel="清空回收站"
        cancelLabel="取消"
        icon={<TrashSimpleIcon className="size-6" weight="regular" />}
        variant="danger"
      />
    </div>
  );
}
