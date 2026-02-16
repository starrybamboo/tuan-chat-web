import { useState } from "react";

import type { UserProfileInfoResponse } from "../../../../../api/models/UserProfileInfoResponse";
import type { UserUpdateInfoRequest } from "../../../../../api/models/UserUpdateInfoRequest";

import { useUpdateUserInfoMutation } from "../../../../../api/hooks/UserHooks";

export function useProfileEditing(user: UserProfileInfoResponse | undefined) {
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
    if (!user) {
      return;
    }
    if (editingUsername.trim() && editingUsername.length <= 30 && editingDescription.length <= 253) {
      try {
        const payload: UserUpdateInfoRequest = {
          userId: user.userId,
          username: editingUsername.trim(),
          description: editingDescription.trim(),
        };
        await updateUserInfoMutation.mutateAsync(payload);
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
    if (!user) {
      return;
    }
    const payload: UserUpdateInfoRequest = {
      userId: user.userId,
      avatar: newAvatarUrl,
    };
    updateUserInfoMutation.mutate(payload);
  };

  return {
    // 状态
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

    // API状态
    isSaving: updateUserInfoMutation.isPending,
  };
}
