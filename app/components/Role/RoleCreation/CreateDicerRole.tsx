import type { Role } from "../types";
import { Plus } from "@phosphor-icons/react";
import { useCreateRoleMutation, useUploadAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useState } from "react";
import CreatePageHeader from "./CreatePageHeader";

interface CreateDicerRoleProps {
  onBack?: () => void;
  onComplete?: (role: Role, ruleId?: number) => void;
}

export default function CreateDicerRole({ onBack, onComplete }: CreateDicerRoleProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      // 1. 创建骰娘角色（type=1）
      const roleId = await createRole({
        roleName: name.trim(),
        description: description.trim(),
        type: 1,
      });

      if (!roleId || roleId <= 0) {
        throw new Error("创建角色失败");
      }

      // 2. 上传默认头像
      const avatarResult = await uploadAvatar({
        roleId,
        avatarUrl: "/favicon.ico",
        spriteUrl: "/favicon.ico",
      });

      // 3. 构建新角色对象
      const newRole: Role = {
        id: roleId,
        name: name.trim(),
        description: description.trim(),
        avatar: avatarResult?.data?.avatarUrl || "/favicon.ico",
        avatarId: avatarResult?.data?.avatarId || 0,
        type: 1,
        modelName: "",
        speakerName: "",
        extra: {},
      };

      // 4. 通知完成
      onComplete?.(newRole, 1); // 默认规则ID为1
    }
    catch (error) {
      console.error("创建骰娘失败:", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  const canSubmit = name.trim().length > 0 && description.trim().length > 0 && !isSaving;

  return (
    <div className={`transition-opacity duration-300 ease-in-out ${isSaving ? "opacity-50" : ""}`}>
      {/* 头部区域 */}
      <div className="max-w-4xl mx-auto p-6">
        <CreatePageHeader
          title={name || "创建骰娘"}
          description="骰娘创建"
          onBack={onBack}
          toolButtons={[
            {
              id: "create-dicer",
              label: isSaving ? "创建中..." : "创建骰娘",
              icon: <Plus className="size-4" weight="bold" />,
              onClick: handleSubmit,
              disabled: !canSubmit,
              variant: "primary",
            },
          ]}
        />

        <div className="md:hidden mb-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="btn btn-sm btn-ghost"
                >
                  ← 返回
                </button>
              )}
              <h1 className="font-semibold text-xl">{name || "创建骰娘"}</h1>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`btn btn-sm md:btn-lg rounded-lg btn-primary ${isSaving ? "scale-95" : ""}`}
            >
              {isSaving
                ? <span className="loading loading-spinner loading-xs"></span>
                : (
                    <span className="flex items-center gap-1">
                      <Plus className="size-4" weight="bold" />
                      创建骰娘
                    </span>
                  )}
            </button>
          </div>
          <p className="text-sm text-base-content/60">骰娘创建</p>
        </div>

        {/* 表单区域 */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2 mb-4">基础信息设置</h2>

              <div className="space-y-6">
                {/* 名称 */}
                <div>
                  <div className="flex gap-2 mb-2 items-center font-semibold">
                    <span>骰娘名称</span>
                    <span className="label-text-alt text-base-content/60">
                      {name.length}
                      /32
                    </span>
                  </div>
                  <input
                    type="text"
                    className="input input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="输入骰娘名称"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={32}
                  />
                </div>

                {/* 描述 */}
                <div>
                  <div className="flex gap-2 mb-2 items-center font-semibold">
                    <span>骰娘简介</span>
                    <span className="label-text-alt text-base-content/60">
                      {description.length}
                      /150
                    </span>
                  </div>
                  <textarea
                    className="textarea textarea-bordered bg-base-200 rounded-md min-h-[120px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="描述这个骰娘的背景故事、性格特点、说话风格等"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={150}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
