import type { Role } from "@/components/newCharacter/types";
import CharacterAvatar from "@/components/newCharacter/CharacterAvatar";
import ExpansionModule from "@/components/newCharacter/rules/ExpansionModule";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";

interface CharacterDetailProps {
  selectRole: Role;
  // onRoleUpdate: (updatedRole: RoleResponse) => void;
}

/**
 * 角色详情组件
 */
export default function CharacterDetail({ selectRole }: CharacterDetailProps) {
  // 初始化角色数据
  const [localRole, setLocalRole] = useState<Role>(selectRole);
  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 字数统计状态
  const [charCount, setCharCount] = useState(selectRole.description?.length || 0);
  // 描述的最大储存量
  const MAX_DESCRIPTION_LENGTH = 140;

  // 当角色变化时，更新本地状态和字数统计
  useEffect(() => {
    setLocalRole(selectRole);
    setCharCount(selectRole.description?.length || 0);
  }, [selectRole]);

  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useMutation({
    mutationKey: ["UpdateRole"],
    mutationFn: async (data: Role) => {
      const updateRes = await tuanchat.roleController.updateRole({
        roleId: data.id,
        roleName: data.name,
        description: data.description,
        avatarId: data.avatarId,
      });
      return updateRes;
    },
    // onSuccess: (data) => {
    //   if (data.success) {
    //     onRoleUpdate(localRole);
    //   }
    // },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
      }
    },
  });

  // 干净的文本
  const cleanText = (text: string) => {
    if (!text)
      return "";
    return text
      .replace(/\r\n/g, "\n") // 替换Windows换行符为Unix换行符
      .replace(/ {2,}/g, " ") // 压缩多个空格为单个空格
      .replace(/\n{2,}/g, "\n") // 压缩多个换行为单个换行
      .replace(/\s+$/g, ""); // 移除末尾空格
  };

  const handleSave = () => {
    setIsTransitioning(true);
    const cleanedRole: Role = {
      ...localRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };

    updateRole(cleanedRole, {
      onSuccess: () => {
        setTimeout(() => {
        //   onRoleUpdate(cleanedRole);
          setIsTransitioning(false);
          setIsEditing(false);
        }, 300);
      },
      onError: () => {
        setIsTransitioning(false);
      },
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setLocalRole(selectRole);
    setIsEditing(false);
  };

  const handleAvatarChange = (previewUrl: string, avatarId: number) => {
    setLocalRole(prev => ({ ...prev, avatarId }));
  };

  return (
    <div
      className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""
      }`}
    >
      {/* 基础信息卡片 */}
      <div
        className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}
      >
        <div className="card-body">
          <div className="flex items-center gap-8">
            <CharacterAvatar
              role={localRole}
              onchange={handleAvatarChange}
            />

            <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              {isEditing
                ? (
                    <>
                      <p>
                        角色ID号：
                        {localRole.id}
                      </p>
                      <input
                        type="text"
                        value={localRole.name}
                        onChange={e =>
                          setLocalRole(prev => ({ ...prev, roleName: e.target.value }))}
                        placeholder="角色名称"
                        className="input input-bordered w-full text-lg font-bold"
                      />
                      <textarea
                        value={localRole.description}
                        onChange={(e) => {
                          setLocalRole(prev => ({ ...prev, description: e.target.value }));
                          setCharCount(e.target.value.length);
                        }}
                        placeholder="角色描述"
                        className="textarea textarea-bordered w-full h-24 resize-none"
                      />
                      <div className="text-right mt-1">
                        <span
                          className={`text-sm font-bold ${charCount > MAX_DESCRIPTION_LENGTH
                            ? "text-error"
                            : "text-base-content/70"
                          }`}
                        >
                          {charCount}
                          /
                          {MAX_DESCRIPTION_LENGTH}
                          {charCount > MAX_DESCRIPTION_LENGTH && (
                            <span className="ml-2">(已超出描述字数上限)</span>
                          )}
                        </span>
                      </div>
                    </>
                  )
                : (
                    <>
                      <h2 className="card-title text-2xl">
                        {localRole.name || "未命名角色"}
                      </h2>
                      <p>
                        角色ID号：
                        {localRole.id}
                      </p>
                      <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        {localRole.description || "暂无描述"}
                      </p>
                      <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden float-right">
                        采用模型：
                        {localRole.modelName || "暂无描述"}
                        <br />
                        语音来源：
                        {localRole.speakerName || "暂无描述"}
                      </p>
                    </>
                  )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <>
                    <button
                      type="submit"
                      onClick={handleSave}
                      className={`btn btn-primary ${isTransitioning ? "scale-95" : ""}`}
                      disabled={isTransitioning}
                    >
                      {isTransitioning
                        ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          )
                        : (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M20 6L9 17l-5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                              保存
                            </span>
                          )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn btn-secondary ml-2"
                    >
                      取消
                    </button>
                  </>
                )
              : (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="btn btn-accent"
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      编辑
                    </span>
                  </button>
                )}
          </div>
        </div>
      </div>

      <ExpansionModule
        roleId={localRole.id}
      />
    </div>
  );
}
