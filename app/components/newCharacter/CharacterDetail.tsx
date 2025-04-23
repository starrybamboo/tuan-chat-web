import type { Role } from "./types";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useMemo, useState } from "react";
import CharacterAvatar from "./CharacterAvatar";
import ExpansionModule from "./rules/ExpansionModule";
import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updatedRole: Role) => void;
}

/**
 * 角色详情组件
 */
export default function CharacterDetail({
  role,
  isEditing,
  onEdit,
  onSave,
}: CharacterDetailProps) {
  // 初始化角色数据
  const [localRole, setLocalRole] = useState<Role>(role);

  useMemo(() => {
    setLocalRole(role);
  }, [role]);

  // 接口部分
  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useMutation({
    mutationKey: ["UpdateRole"],
    mutationFn: async (data: any) => {
      if (role.id !== 0) {
        const updateRes = await tuanchat.roleController.updateRole({
          roleId: role.id,
          roleName: data.name,
          description: data.description,
          avatarId: data.avatarId,
        });
        return updateRes;
      }
    },
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
    const cleanedRole = {
      ...localRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };
    onSave(cleanedRole);
    updateRole(cleanedRole);
  };

  // 更新url和avatarId,方便更改服务器数据
  const handleAvatarChange = (previewUrl: string, avatarId: number) => {
    setLocalRole(prev => ({ ...prev, avatar: previewUrl, avatarId }));
  };

  return (
    <div className="space-y-6">
      {/* 基础信息卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-8">
            <CharacterAvatar
              role={localRole}
              onchange={handleAvatarChange}
              isEditing={isEditing}
            />

            <div className="flex-1 space-y-4">
              <Section title="基本信息">
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
                          onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="角色名称"
                          className="input input-bordered w-full text-lg font-bold"
                        />
                        <textarea
                          value={localRole.description}
                          onChange={e =>
                            setLocalRole(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="角色描述"
                          className="textarea textarea-bordered w-full h-24 resize-none"
                        />
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
                        <p className="text-base-content/70 whitespace-pre-wrap">
                          {localRole.description || "暂无描述"}
                        </p>
                      </>
                    )}
              </Section>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <button type="submit" onClick={handleSave} className="btn btn-primary">
                    保存
                  </button>
                )
              : (
                  <button type="button" onClick={onEdit} className="btn btn-accent">
                    编辑
                  </button>
                )}
          </div>
        </div>
      </div>

      {/* 扩展模块， */}
      <ExpansionModule />
    </div>
  );
}
