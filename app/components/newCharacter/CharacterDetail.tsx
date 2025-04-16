/* eslint-disable react-dom/no-missing-button-type */
// CharacterDetail.tsx
import type { ChangeEvent } from "react";
import type { Role } from "./types";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
import AbilitySection from "./AbilitySection";
import InventorySection from "./InventorySection";
import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updatedRole: Role) => void;
}

export default function CharacterDetail({
  role,
  isEditing,
  onEdit,
  onSave,
}: CharacterDetailProps) {
  const [localRole, setLocalRole] = useState(role);

  useEffect(() => {
    setLocalRole(role);
  }, [role]);

  // 接口部分
  // 发送post数据部分
  const { mutate: creatOrUpdateRole } = useMutation({
    mutationKey: ["creatOrUpdateRole"],
    mutationFn: async (data: any) => {
      if (role.id === 0) {
        const res = await tuanchat.roleController.createRole({});
        console.warn(`创建角色信息`);
        if (res.success) {
          const roleId = res.data;
          if (roleId) {
            const updateRes = await tuanchat.roleController.updateRole({
              roleId,
              roleName: data.name,
              description: data.description,
            },
            );
            console.warn(`成功${roleId}`);
            return { ...updateRes, roleId };
          }
          else {
            console.error(`更新角色信息失败`);
            return undefined;
          }
        }
        else {
          console.error("创建角色失败");
        }
      }
      else {
        const updateRes = await tuanchat.roleController.updateRole({
          roleId: role.id,
          roleName: data.name,
          description: data.description,
        });
        return updateRes;
      }
    },
    onSuccess: (data) => {
      if (data?.success) {
        onSave(localRole);
      }
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
      }
    },
  });
  const handleSave = () => {
    onSave(localRole);
    creatOrUpdateRole(localRole);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setLocalRole(prev => ({ ...prev, avatar: previewUrl }));
    }
  };

  return (
    <div className="space-y-6">
      {/* 基础信息卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <AvatarSection
              avatar={localRole.avatar}
              isEditing={isEditing}
              onChange={handleAvatarChange}
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
                          onChange={e => setLocalRole(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="角色描述"
                          className="textarea textarea-bordered w-full h-24 resize-none"
                        />

                      </>
                    )
                  : (
                      <>
                        <h2 className="card-title text-2xl">{localRole.name || "未命名角色"}</h2>
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
                  <button onClick={handleSave} className="btn btn-primary">
                    保存
                  </button>
                )
              : (
                  <button onClick={onEdit} className="btn btn-ghost">
                    编辑
                  </button>
                )}
          </div>
        </div>
      </div>

      {/* 扩展模块 */}
      <InventorySection
        items={localRole.inventory}
        isEditing={isEditing}
        onChange={inventory => setLocalRole(prev => ({ ...prev, inventory }))}
      />

      <AbilitySection
        role={localRole}
        abilities={localRole.abilities}
        isEditing={isEditing}
        onChange={abilities => setLocalRole(prev => ({ ...prev, abilities }))}
      />
    </div>
  );
}

// 头像组件
function AvatarSection({ avatar, isEditing, onChange }: {
  avatar?: string;
  isEditing: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="avatar">
      <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
        {avatar
          ? (
              <img src={avatar} alt="角色头像" className="object-cover" />
            )
          : (
              <div className="bg-neutral-content flex items-center justify-center">
                <span className="text-neutral">无头像</span>
              </div>
            )}
      </div>
      {isEditing && (
        <div className="mt-2">
          <input
            type="file"
            accept="image/*"
            className="file-input file-input-xs"
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
