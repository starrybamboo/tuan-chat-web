import React from "react";

import { Button } from "@/components/common/Button";
import { FormField, TextArea, TextInput } from "@/components/common/FormField";

type ProfileEditingState = {
  isEditingProfile: boolean;
  editingUsername: string;
  editingDescription: string;
  setEditingUsername: (value: string) => void;
  setEditingDescription: (value: string) => void;
  saveProfile: () => void;
  cancelEditingProfile: () => void;
  isSaving: boolean;
}

type ProfileEditPanelProps = {
  isVisible: boolean;
  profileEditing: ProfileEditingState;
}

export const ProfileEditPanel: React.FC<ProfileEditPanelProps> = ({
  isVisible,
  profileEditing,
}) => {
  if (!isVisible)
    return null;

  const {
    editingUsername,
    editingDescription,
    setEditingUsername,
    setEditingDescription,
    saveProfile,
    cancelEditingProfile,
    isSaving,
  } = profileEditing;
  const usernameInputId = "profile-edit-username";
  const descriptionInputId = "profile-edit-description";

  return (
    <div className="
      md:hidden
      p-4 bg-base-100 rounded-2xl mt-2 space-y-4
    ">
      <h3 className="text-lg font-semibold">编辑个人资料</h3>

      {/* 用户名编辑 */}
      <FormField
        id={usernameInputId}
        label="用户名"
        labelAdornment={`${editingUsername.length} / 30`}
        error={editingUsername.length > 30 ? "用户名最多 30 个字符" : undefined}
      >
        {controlProps => (
          <TextInput
            {...controlProps}
            type="text"
            name="profile_username"
            autoComplete="off"
            value={editingUsername}
            onChange={e => setEditingUsername(e.target.value)}
            maxLength={30}
            placeholder="请输入用户名"
          />
        )}
      </FormField>

      {/* 描述编辑 */}
      <FormField
        id={descriptionInputId}
        label="个人描述"
        labelAdornment={`${editingDescription.length} / 253`}
        error={editingDescription.length > 253 ? "个人描述最多 253 个字符" : undefined}
      >
        {controlProps => (
          <TextArea
            {...controlProps}
            name="profile_description"
            autoComplete="off"
            value={editingDescription}
            onChange={e => setEditingDescription(e.target.value)}
            rows={4}
            maxLength={253}
            placeholder="请输入个人描述..."
          />
        )}
      </FormField>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={saveProfile}
          disabled={
            !editingUsername.trim()
            || editingUsername.length > 30
            || editingDescription.length > 253
            || isSaving
          }
          loading={isSaving}
          aria-label={isSaving ? "正在保存个人资料" : "保存个人资料"}
        >
          {isSaving ? "保存中..." : "保存"}
        </Button>
        <Button
          variant="ghost"
          className="flex-1"
          onClick={cancelEditingProfile}
        >
          取消
        </Button>
      </div>
    </div>
  );
};
