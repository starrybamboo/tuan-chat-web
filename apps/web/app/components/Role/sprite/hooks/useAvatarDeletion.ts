import type { RoleAvatar } from "api";

import { useQueryClient } from "@tanstack/react-query";
import { useBatchDeleteRoleAvatarsMutation, useDeleteRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useState } from "react";

import type { Role } from "../../types";

import { getEffectiveAvatarUrl } from "../utils";

type UseAvatarDeletionProps = {
  role: Role | undefined;
  /** 当前可见或当前操作范围内的头像列表 */
  avatars: RoleAvatar[];
  /** 角色完整头像列表，用于判断是否为最后一个头像和寻找替代头像 */
  allAvatars?: RoleAvatar[];
  /** 角色头像总数，未传时使用 allAvatars 或 avatars 长度 */
  totalAvatarsCount?: number;
  selectedAvatarId: number;
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  onAvatarSelect?: (avatarId: number) => void;
  onDeleteSuccess?: (avatar: RoleAvatar) => void;
  onBatchDeleteSuccess?: (avatars: RoleAvatar[]) => void;
};

/**
 * Custom hook for managing avatar deletion with proper state management
 * Handles:
 * - Replacement avatar selection when deleting current avatar
 * - Sequential operation handling (select then delete)
 * - Edge case of deleting character's active avatar
 */
export function useAvatarDeletion({
  role,
  avatars,
  allAvatars,
  totalAvatarsCount,
  selectedAvatarId,
  onAvatarChange,
  onAvatarSelect,
  onDeleteSuccess,
  onBatchDeleteSuccess,
}: UseAvatarDeletionProps) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAvatarMutation = useDeleteRoleAvatarMutation(role?.id);
  const batchDeleteMutation = useBatchDeleteRoleAvatarsMutation(role?.id);
  const avatarPool = allAvatars ?? avatars;
  const effectiveTotalAvatarsCount = totalAvatarsCount ?? avatarPool.length;

  /**
   * Find a replacement avatar when deleting the current one
   * Priority: previous avatar > next avatar
   */
  const findReplacementAvatar = useCallback((avatarIdToDelete: number): RoleAvatar | null => {
    const deleteIndex = avatarPool.findIndex(a => a.avatarId === avatarIdToDelete);
    if (deleteIndex === -1 || avatarPool.length <= 1) {
      return null;
    }

    // Try to get the previous avatar first
    if (deleteIndex > 0) {
      return avatarPool[deleteIndex - 1];
    }

    // Otherwise get the next avatar
    if (deleteIndex < avatarPool.length - 1) {
      return avatarPool[deleteIndex + 1];
    }

    return null;
  }, [avatarPool]);

  /**
   * Handle avatar deletion with replacement selection
   * Ensures sequential operations: select replacement -> delete avatar
   */
  const handleDeleteAvatar = useCallback(async (avatarId: number) => {
    // Early return if no role
    if (!role) {
      console.warn("无法删除头像：角色信息不存在");
      return;
    }

    // Prevent concurrent deletions
    if (isDeleting) {
      console.warn("删除操作正在进行中，请稍候");
      return;
    }

    // Prevent deleting the last avatar
    if (effectiveTotalAvatarsCount <= 1) {
      console.warn("无法删除最后一个头像");
      return;
    }

    const avatarToDelete = avatarPool.find(a => a.avatarId === avatarId);
    if (!avatarToDelete) {
      console.error("未找到要删除的头像");
      return;
    }

    const isCurrentRoleAvatar = avatarToDelete.avatarId === role.avatarId
      || (role.avatar && (!role.avatarId || role.avatarId === 0) && getEffectiveAvatarUrl(avatarToDelete) === role.avatar);
    const isCurrentlySelected = avatarToDelete.avatarId === selectedAvatarId;

    setIsDeleting(true);

    try {
      // Step 1: If deleting current avatar, select replacement first
      if (isCurrentRoleAvatar || isCurrentlySelected) {
        const replacementAvatar = findReplacementAvatar(avatarId);

        if (replacementAvatar) {
          // Step 1a: Update character's avatar if needed
          if (isCurrentRoleAvatar && onAvatarChange) {
            await onAvatarChange(
              getEffectiveAvatarUrl(replacementAvatar) || "",
              replacementAvatar.avatarId || 0,
            );

            // Wait for character update to complete
            await queryClient.invalidateQueries({
              queryKey: ["getRole", role.id],
            });
          }

          // Step 1b: Update local selection state
          if (onAvatarSelect) {
            onAvatarSelect(replacementAvatar.avatarId || 0);
          }
        }
      }

      // Step 2: Delete the avatar
      await deleteAvatarMutation.mutateAsync(avatarId);
      onDeleteSuccess?.(avatarToDelete);
    }
    catch (error) {
      console.error("删除头像操作失败:", error);
    }
    finally {
      setIsDeleting(false);
    }
  }, [
    role,
    avatarPool,
    effectiveTotalAvatarsCount,
    selectedAvatarId,
    isDeleting,
    findReplacementAvatar,
    onAvatarChange,
    onAvatarSelect,
    onDeleteSuccess,
    deleteAvatarMutation,
    queryClient,
  ]);

  /**
   * Handle batch avatar deletion
   * Ensures at least one avatar remains
   */
  const handleBatchDelete = useCallback(async (avatarIds: number[]) => {
    // Early return if no role
    if (!role) {
      console.warn("无法删除头像：角色信息不存在");
      throw new Error("无法删除头像：角色信息不存在");
    }

    // Prevent deleting all avatars
    if (avatarIds.length >= effectiveTotalAvatarsCount) {
      console.warn("无法删除所有头像，至少需要保留一个");
      throw new Error("无法删除所有头像，至少需要保留一个");
    }

    // Prevent concurrent deletions
    if (isDeleting) {
      console.warn("删除操作正在进行中，请稍候");
      throw new Error("删除操作正在进行中，请稍候");
    }

    const avatarsToDelete = avatarPool.filter(avatar =>
      avatar.avatarId && avatarIds.includes(avatar.avatarId),
    );

    setIsDeleting(true);

    try {
      // Check if current avatar is in the deletion list
      const roleAvatarByUrl = role.avatar && (!role.avatarId || role.avatarId === 0)
        ? avatarPool.find(a => getEffectiveAvatarUrl(a) === role.avatar)
        : null;
      const isDeletingCurrentAvatar = avatarIds.includes(role.avatarId)
        || avatarIds.includes(selectedAvatarId)
        || (roleAvatarByUrl?.avatarId ? avatarIds.includes(roleAvatarByUrl.avatarId) : false);

      // Step 1: If deleting current avatar, select replacement first
      if (isDeletingCurrentAvatar) {
        // Find first avatar not in deletion list
        const replacementAvatar = avatarPool.find(
          a => a.avatarId && !avatarIds.includes(a.avatarId),
        );

        if (replacementAvatar) {
          // Update character's avatar if needed
          const shouldUpdateRoleAvatar = avatarIds.includes(role.avatarId)
            || (roleAvatarByUrl?.avatarId ? avatarIds.includes(roleAvatarByUrl.avatarId) : false);
          if (shouldUpdateRoleAvatar && onAvatarChange) {
            await Promise.resolve(onAvatarChange(
              getEffectiveAvatarUrl(replacementAvatar) || "",
              replacementAvatar.avatarId || 0,
            ));

            await queryClient.invalidateQueries({
              queryKey: ["getRole", role.id],
            });
          }

          // Update local selection state
          if (onAvatarSelect) {
            onAvatarSelect(replacementAvatar.avatarId || 0);
          }
        }
      }

      // Step 2: Delete all avatars
      await batchDeleteMutation.mutateAsync(avatarIds);
      if (avatarsToDelete.length > 0) {
        onBatchDeleteSuccess?.(avatarsToDelete);
      }
    }
    catch (error) {
      console.error("批量删除头像失败:", error);
      throw error;
    }
    finally {
      setIsDeleting(false);
    }
  }, [
    role,
    avatarPool,
    effectiveTotalAvatarsCount,
    selectedAvatarId,
    isDeleting,
    onAvatarChange,
    onAvatarSelect,
    batchDeleteMutation,
    onBatchDeleteSuccess,
    queryClient,
  ]);

  return {
    handleDeleteAvatar,
    handleBatchDelete,
    isDeleting,
    canDelete: effectiveTotalAvatarsCount > 1,
  };
}
