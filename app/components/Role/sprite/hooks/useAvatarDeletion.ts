import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import type { RoleAvatar } from "api";

import { tuanchat } from "api/instance";

import type { Role } from "../../types";

type UseAvatarDeletionProps = {
  role: Role | undefined;
  avatars: RoleAvatar[];
  selectedAvatarId: number;
  onAvatarChange?: (avatarUrl: string, avatarId: number) => void;
  onAvatarSelect?: (avatarId: number) => void;
};

type DeletionState = {
  isDeleting: boolean;
  pendingDeletion: number | null;
};

/**
 * Custom hook for managing avatar deletion with proper state management
 * Handles:
 * - Optimistic updates with rollback on failure
 * - Replacement avatar selection when deleting current avatar
 * - Sequential operation handling (select then delete)
 * - Edge case of deleting character's active avatar
 */
export function useAvatarDeletion({
  role,
  avatars,
  selectedAvatarId,
  onAvatarChange,
  onAvatarSelect,
}: UseAvatarDeletionProps) {
  const queryClient = useQueryClient();
  const [deletionState, setDeletionState] = useState<DeletionState>({
    isDeleting: false,
    pendingDeletion: null,
  });

  /**
   * Find a replacement avatar when deleting the current one
   * Priority: previous avatar > next avatar
   */
  const findReplacementAvatar = useCallback((avatarIdToDelete: number): RoleAvatar | null => {
    const deleteIndex = avatars.findIndex(a => a.avatarId === avatarIdToDelete);
    if (deleteIndex === -1 || avatars.length <= 1) {
      return null;
    }

    // Try to get the previous avatar first
    if (deleteIndex > 0) {
      return avatars[deleteIndex - 1];
    }

    // Otherwise get the next avatar
    if (deleteIndex < avatars.length - 1) {
      return avatars[deleteIndex + 1];
    }

    return null;
  }, [avatars]);

  /**
   * Delete avatar mutation with optimistic updates and rollback
   */
  const deleteAvatarMutation = useMutation({
    mutationKey: ["deleteRoleAvatar", role?.id],
    mutationFn: async (avatarId: number) => {
      const res = await tuanchat.avatarController.deleteRoleAvatar(avatarId);
      if (!res.success) {
        throw new Error("删除头像失败");
      }
      return res;
    },
    onMutate: async (avatarId) => {
      // Set deleting state
      setDeletionState({
        isDeleting: true,
        pendingDeletion: avatarId,
      });

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["getRoleAvatars", role?.id],
      });

      // Snapshot previous value for rollback
      const previousAvatars = queryClient.getQueryData(["getRoleAvatars", role?.id]);

      // Optimistically update the cache
      queryClient.setQueryData(["getRoleAvatars", role?.id], (old: any) => {
        if (!old)
          return old;

        // Handle both direct array and wrapped response
        if (Array.isArray(old)) {
          return old.filter((a: RoleAvatar) => a.avatarId !== avatarId);
        }

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.filter((a: RoleAvatar) => a.avatarId !== avatarId),
          };
        }

        return old;
      });

      return { previousAvatars };
    },
    onError: (err, avatarId, context) => {
      console.error("删除头像失败:", err);

      // Rollback optimistic update
      if (context?.previousAvatars) {
        queryClient.setQueryData(
          ["getRoleAvatars", role?.id],
          context.previousAvatars,
        );
      }

      // Reset deletion state
      setDeletionState({
        isDeleting: false,
        pendingDeletion: null,
      });
    },
    onSuccess: () => {
      console.warn("删除头像成功");

      // Reset deletion state
      setDeletionState({
        isDeleting: false,
        pendingDeletion: null,
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", role?.id],
      });

      // Also invalidate role query to ensure avatar consistency
      queryClient.invalidateQueries({
        queryKey: ["getRole", role?.id],
      });
    },
  });

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
    if (deletionState.isDeleting) {
      console.warn("删除操作正在进行中，请稍候");
      return;
    }

    // Prevent deleting the last avatar
    if (avatars.length <= 1) {
      console.warn("无法删除最后一个头像");
      return;
    }

    const avatarToDelete = avatars.find(a => a.avatarId === avatarId);
    if (!avatarToDelete) {
      console.error("未找到要删除的头像");
      return;
    }

    const isCurrentRoleAvatar = avatarToDelete.avatarId === role.avatarId;
    const isCurrentlySelected = avatarToDelete.avatarId === selectedAvatarId;

    try {
      // Step 1: If deleting current avatar, select replacement first
      if (isCurrentRoleAvatar || isCurrentlySelected) {
        const replacementAvatar = findReplacementAvatar(avatarId);

        if (replacementAvatar) {
          // Step 1a: Update character's avatar if needed
          if (isCurrentRoleAvatar && onAvatarChange) {
            await onAvatarChange(
              replacementAvatar.avatarUrl || "",
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
    }
    catch (error) {
      console.error("删除头像操作失败:", error);
      // Error handling and rollback are handled by mutation callbacks
    }
  }, [
    role,
    avatars,
    selectedAvatarId,
    deletionState.isDeleting,
    findReplacementAvatar,
    onAvatarChange,
    onAvatarSelect,
    deleteAvatarMutation,
    queryClient,
  ]);

  /**
   * Handle batch avatar deletion with progress tracking
   * Ensures at least one avatar remains
   * Handles partial failures gracefully
   */
  const handleBatchDelete = useCallback(async (avatarIds: number[]) => {
    // Early return if no role
    if (!role) {
      console.warn("无法删除头像：角色信息不存在");
      throw new Error("无法删除头像：角色信息不存在");
    }

    // Prevent deleting all avatars
    if (avatarIds.length >= avatars.length) {
      console.warn("无法删除所有头像，至少需要保留一个");
      throw new Error("无法删除所有头像，至少需要保留一个");
    }

    // Prevent concurrent deletions
    if (deletionState.isDeleting) {
      console.warn("删除操作正在进行中，请稍候");
      throw new Error("删除操作正在进行中，请稍候");
    }

    // Set deleting state
    setDeletionState({
      isDeleting: true,
      pendingDeletion: null,
    });

    const successfulDeletions: number[] = [];
    const failedDeletions: Array<{ avatarId: number; error: string }> = [];

    try {
      // Check if current avatar is in the deletion list
      const isDeletingCurrentAvatar = avatarIds.includes(role.avatarId)
        || avatarIds.includes(selectedAvatarId);

      // Step 1: If deleting current avatar, select replacement first
      if (isDeletingCurrentAvatar) {
        // Find first avatar not in deletion list
        const replacementAvatar = avatars.find(
          a => a.avatarId && !avatarIds.includes(a.avatarId),
        );

        if (replacementAvatar) {
          // Update character's avatar if needed
          if (avatarIds.includes(role.avatarId) && onAvatarChange) {
            onAvatarChange(
              replacementAvatar.avatarUrl || "",
              replacementAvatar.avatarId || 0,
            );

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

      // Step 2: Delete avatars sequentially with error tracking
      for (const avatarId of avatarIds) {
        try {
          await deleteAvatarMutation.mutateAsync(avatarId);
          successfulDeletions.push(avatarId);
        }
        catch (error) {
          console.error(`删除头像 ${avatarId} 失败:`, error);
          failedDeletions.push({
            avatarId,
            error: error instanceof Error ? error.message : "未知错误",
          });
        }
      }

      // Report results
      if (failedDeletions.length > 0) {
        const message = `批量删除完成：成功 ${successfulDeletions.length} 个，失败 ${failedDeletions.length} 个`;
        console.warn(message, failedDeletions);

        // If some deletions failed, throw error with details
        if (successfulDeletions.length === 0) {
          throw new Error("所有头像删除失败");
        }
        else {
          throw new Error(message);
        }
      }

      console.warn(`批量删除成功：共删除 ${successfulDeletions.length} 个头像`);
    }
    catch (error) {
      console.error("批量删除头像失败:", error);
      throw error;
    }
    finally {
      // Reset deletion state
      setDeletionState({
        isDeleting: false,
        pendingDeletion: null,
      });
    }
  }, [
    role,
    avatars,
    selectedAvatarId,
    deletionState.isDeleting,
    onAvatarChange,
    onAvatarSelect,
    deleteAvatarMutation,
    queryClient,
  ]);

  return {
    handleDeleteAvatar,
    handleBatchDelete,
    isDeleting: deletionState.isDeleting,
    pendingDeletion: deletionState.pendingDeletion,
    canDelete: avatars.length > 1,
  };
}
