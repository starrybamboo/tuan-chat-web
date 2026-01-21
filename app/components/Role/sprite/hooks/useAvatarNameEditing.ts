import { useCallback, useState } from "react";

import type { RoleAvatar } from "api";

import { useUpdateAvatarNameMutation } from "api/hooks/RoleAndAvatarHooks";

type UseAvatarNameEditingProps = {
  roleId: number | undefined;
  avatars: RoleAvatar[];
};

/**
 * Custom hook for managing avatar name editing
 * Handles:
 * - Edit mode state management
 * - Name validation (reject empty names)
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 */
export function useAvatarNameEditing({
  roleId,
  avatars,
}: UseAvatarNameEditingProps) {
  const [editingAvatarId, setEditingAvatarId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const updateNameMutation = useUpdateAvatarNameMutation(roleId);

  /**
   * Start editing an avatar name
   */
  const startEditName = useCallback((avatarId: number, currentName: string) => {
    setEditingAvatarId(avatarId);
    setEditingName(currentName);
  }, []);

  /**
   * Update the editing name (controlled input)
   */
  const updateEditingName = useCallback((name: string) => {
    setEditingName(name);
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

    const trimmedName = editingName.trim();

    // Validate: reject empty names
    if (!trimmedName) {
      console.warn("头像名称不能为空");
      return;
    }

    // Prevent concurrent saves
    if (updateNameMutation.isPending) {
      console.warn("保存操作正在进行中，请稍候");
      return;
    }

    // Find the avatar to update
    const avatar = avatars.find(a => a.avatarId === avatarId);
    if (!avatar) {
      console.error("未找到要更新的头像");
      return;
    }

    try {
      await updateNameMutation.mutateAsync({
        avatar,
        name: trimmedName,
      });

      // Exit edit mode on success
      setEditingAvatarId(null);
      setEditingName("");
    }
    catch (error) {
      console.error("保存头像名称失败:", error);
    }
  }, [roleId, editingName, avatars, updateNameMutation]);

  /**
   * Cancel editing and reset state
   */
  const cancelEditName = useCallback(() => {
    setEditingAvatarId(null);
    setEditingName("");
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
    editingAvatarId,
    editingName,
    isSaving: updateNameMutation.isPending,
    startEditName,
    updateEditingName,
    saveAvatarName,
    cancelEditName,
    handleKeyDown,
  };
}
