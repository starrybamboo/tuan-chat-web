import React from "react";

interface ProfileEditingState {
  isEditingProfile: boolean;
  editingUsername: string;
  editingDescription: string;
  setEditingUsername: (value: string) => void;
  setEditingDescription: (value: string) => void;
  saveProfile: () => void;
  cancelEditingProfile: () => void;
  isSaving: boolean;
}

interface ProfileEditPanelProps {
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

  return (
    <div className="md:hidden p-4 bg-base-100 rounded-2xl mt-2 space-y-4">
      <h3 className="text-lg font-semibold">编辑个人资料</h3>

      {/* 用户名编辑 */}
      <div>
        <label className="label">
          <span className="label-text">用户名</span>
        </label>
        <input
          type="text"
          value={editingUsername}
          onChange={e => setEditingUsername(e.target.value)}
          className={`input input-bordered w-full ${
            editingUsername.length > 30 ? "input-error" : ""
          }`}
          maxLength={30}
          placeholder="请输入用户名"
        />
        <div className={`text-xs mt-1 ${
          editingUsername.length > 30 ? "text-error" : "text-neutral-500"
        }`}
        >
          {editingUsername.length}
          /30
        </div>
      </div>

      {/* 描述编辑 */}
      <div>
        <label className="label">
          <span className="label-text">个人描述</span>
        </label>
        <textarea
          value={editingDescription}
          onChange={e => setEditingDescription(e.target.value)}
          className={`textarea textarea-bordered w-full ${
            editingDescription.length > 253 ? "textarea-error" : ""
          }`}
          rows={4}
          maxLength={253}
          placeholder="请输入个人描述..."
        />
        <div className={`text-xs mt-1 ${
          editingDescription.length > 253 ? "text-error" : "text-neutral-500"
        }`}
        >
          {editingDescription.length}
          /253
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={saveProfile}
          className="btn btn-success flex-1"
          disabled={
            !editingUsername.trim()
            || editingUsername.length > 30
            || editingDescription.length > 253
            || isSaving
          }
          type="button"
        >
          {isSaving
            ? (
                <span className="loading loading-spinner loading-sm"></span>
              )
            : (
                "保存"
              )}
        </button>
        <button
          onClick={cancelEditingProfile}
          className="btn btn-ghost flex-1"
          type="button"
        >
          取消
        </button>
      </div>
    </div>
  );
};
