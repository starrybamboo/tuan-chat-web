// CharacterDetail.tsx
import type { ChangeEvent } from "react";
import type { Role } from "./types";
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

  const handleSave = () => {
    onSave(localRole);
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
