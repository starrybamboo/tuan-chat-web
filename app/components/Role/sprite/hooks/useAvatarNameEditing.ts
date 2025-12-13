import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import type { RoleAvatar } from "api";

import { tuanchat } from "api/instance";

type UseAvatarNameEditingProps = {
  roleId: number | undefined;
  avatars: RoleAvatar[];
};

type EditingState = {
  editingAvatarId: number | null;
  editingName: string;
  isSaving: boolean;
};

/**
 * Custom hook for managing Dice Maiden avatar name editing
 * Handles:
 * - Edit mode state management
 * - Name validation (reject empty names)
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 * - Optimistic updates with rollback on failure
 * - Backend integration via updateRoleAvatar API
 */
export function useAvatarNameEditing({
  roleId,
  avatars,
}: UseAvatarNameEditingProps) {
  const queryClient = useQueryClient();
  const [editingState, setEditingState] = useState<EditingState>({
    editingAvatarId: null,
    editingName: "",
    isSaving: false,
  });

  /**
   * Update avatar title mutation with optimistic updates and rollback
   */
  const updateAvatarTitleMutation = useMutation({
    mutationKey: ["updateAvatarTitle", roleId],
    mutationFn: async ({ avatarId, name }: { avatarId: number; name: string }) => {
      // Early return if no roleId
      if (!roleId) {
        throw new Error("无法更新头像名称：角色信息不存在");
      }

      // Find the avatar to update
      const avatar = avatars.find(a => a.avatarId === avatarId);
      if (!avatar) {
        throw new Error("未找到要更新的头像");
      }

      // Prepare the update payload with the new title
      const updatedAvatar: RoleAvatar = {
        ...avatar,
        avatarTitle: {
          ...avatar.avatarTitle,
          label: name,
        },
      };

      const res = await tuanchat.avatarController.updateRoleAvatar(updatedAvatar);
      if (!res.success) {
        throw new Error("更新头像名称失败");
      }
      return res;
    },
    onMutate: async ({ avatarId, name }) => {
      // Set saving state
      setEditingState(prev => ({
        ...prev,
        isSaving: true,
      }));

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["getRoleAvatars", roleId],
      });

      // Snapshot previous value for rollback
      const previousAvatars = queryClient.getQueryData(["getRoleAvatars", roleId]);

      // Optimistically update the cache
      queryClient.setQueryData(["getRoleAvatars", roleId], (old: any) => {
        if (!old)
          return old;

        const updateAvatar = (avatar: RoleAvatar) => {
          if (avatar.avatarId === avatarId) {
            return {
              ...avatar,
              avatarTitle: {
                ...avatar.avatarTitle,
                label: name,
              },
            };
          }
          return avatar;
        };

        // Handle both direct array and wrapped response
        if (Array.isArray(old)) {
          return old.map(updateAvatar);
        }

        if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map(updateAvatar),
          };
        }

        return old;
      });

      return { previousAvatars };
    },
    onError: (err, variables, context) => {
      console.error("更新头像名称失败:", err);

      // Rollback optimistic update
      if (context?.previousAvatars) {
        queryClient.setQueryData(
          ["getRoleAvatars", roleId],
          context.previousAvatars,
        );
      }

      // Reset saving state but keep editing mode
      setEditingState(prev => ({
        ...prev,
        isSaving: false,
      }));
    },
    onSuccess: () => {
      console.warn("更新头像名称成功");

      // Exit edit mode and reset state
      setEditingState({
        editingAvatarId: null,
        editingName: "",
        isSaving: false,
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["getRoleAvatars", roleId],
      });
    },
  });

  /**
   * Start editing an avatar name
   */
  const startEditName = useCallback((avatarId: number, currentName: string) => {
    setEditingState({
      editingAvatarId: avatarId,
      editingName: currentName,
      isSaving: false,
    });
  }, []);

  /**
   * Update the editing name (controlled input)
   */
  const updateEditingName = useCallback((name: string) => {
    setEditingState(prev => ({
      ...prev,
      editingName: name,
    }));
  }, []);

  /**
   * Save the avatar name with validation
   * Rejects empty names (whitespace-only strings)
   */
  const saveAvatarName = useCallback(async (avatarId: number) => {
    // Early return if no roleId
    if (!roleId) {
      console.warn("无法保存头像名称：角色信息不存在");
      return;
    }

    const trimmedName = editingState.editingName.trim();

    // Validate: reject empty names
    if (!trimmedName) {
      console.warn("头像名称不能为空");
      return;
    }

    // Prevent concurrent saves
    if (editingState.isSaving) {
      console.warn("保存操作正在进行中，请稍候");
      return;
    }

    try {
      await updateAvatarTitleMutation.mutateAsync({
        avatarId,
        name: trimmedName,
      });
    }
    catch (error) {
      console.error("保存头像名称失败:", error);
      // Error handling is done in mutation callbacks
    }
  }, [roleId, editingState.editingName, editingState.isSaving, updateAvatarTitleMutation]);

  /**
   * Cancel editing and reset state
   */
  const cancelEditName = useCallback(() => {
    setEditingState({
      editingAvatarId: null,
      editingName: "",
      isSaving: false,
    });
  }, []);

  /**
   * Handle keyboard shortcuts
   * Enter: save, Escape: cancel
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, avatarId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveAvatarName(avatarId);
    }
    else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditName();
    }
  }, [saveAvatarName, cancelEditName]);

  return {
    editingAvatarId: editingState.editingAvatarId,
    editingName: editingState.editingName,
    isSaving: editingState.isSaving,
    startEditName,
    updateEditingName,
    saveAvatarName,
    cancelEditName,
    handleKeyDown,
  };
}
