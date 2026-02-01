import { useState } from "react";

import type { UserInfoResponse } from "../../../../../api";

import { useUpdateUserInfoMutation } from "../../../../../api/hooks/UserHooks";

export function useProfileEditing(user: UserInfoResponse | undefined) {
  // 内联编辑状态
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingUsername, setEditingUsername] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // API mutations
  const updateUserInfoMutation = useUpdateUserInfoMutation();

  // 内联编辑功能
  const startEditingProfile = () => {
    setEditingUsername(user?.username || "");
    setEditingDescription(user?.description || "");
    setIsEditingProfile(true);
  };

  const saveProfile = async () => {
    if (editingUsername.trim() && editingUsername.length <= 30 && editingDescription.length <= 253) {
      try {
        await updateUserInfoMutation.mutateAsync({
          ...user,
          username: editingUsername.trim(),
          description: editingDescription.trim(),
        } as UserInfoResponse);
        setIsEditingProfile(false);
      }
      catch (error) {
        console.error("保存个人资料失败:", error);
      }
    }
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditingUsername("");
    setEditingDescription("");
  };

  // 头像上传即时保存
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    updateUserInfoMutation.mutate({
      ...user,
      avatar: newAvatarUrl,
    } as UserInfoResponse);
  };

  return {
    // ״̬
    isEditingProfile,
    editingUsername,
    editingDescription,

    // 设置状态的函数
    setEditingUsername,
    setEditingDescription,

    // 操作函数
    startEditingProfile,
    saveProfile,
    cancelEditingProfile,
    handleAvatarUpdate,

    // API״̬
    isSaving: updateUserInfoMutation.isPending,
  };
}
