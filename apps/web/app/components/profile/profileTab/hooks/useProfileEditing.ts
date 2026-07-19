import type { UserProfileInfoResponse } from "@tuanchat/openapi-client/models/UserProfileInfoResponse";
import type { UserUpdateInfoRequest } from "@tuanchat/openapi-client/models/UserUpdateInfoRequest";

import { useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";

import { useUpdateUserInfoMutation } from "../../../../../api/hooks/UserHooks";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message.trim() : fallback;
}

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
        appToast.error({
          title: "个人资料保存失败",
          description: getErrorMessage(error, "服务器没有接受这次修改。"),
          details: "当前编辑内容仍然保留，请检查网络后重试。",
        }, { id: "profile-save-error" });
      }
    }
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditingUsername("");
    setEditingDescription("");
  };

  // 头像上传即时保存
  const handleAvatarUpdate = (avatarPayload: { avatarFileId: number }) => {
    if (!user) {
      return;
    }
    const request: UserUpdateInfoRequest = {
      userId: user.userId,
      avatarFileId: avatarPayload.avatarFileId,
    };
    updateUserInfoMutation.mutate(request, {
      onError: (error) => {
        console.error("保存个人头像失败:", error);
        appToast.error({
          title: "头像保存失败",
          description: getErrorMessage(error, "个人资料没有更新为新头像。"),
          details: "请检查网络后重新选择头像。",
        }, { id: "profile-avatar-save-error" });
      },
    });
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
