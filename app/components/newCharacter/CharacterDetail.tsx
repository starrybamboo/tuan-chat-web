import type { Role } from "./types";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
import CharacterAvatar from "./CharacterAvatar";
import ExpansionModule from "./rules/ExpansionModule";
// import Section from "./Section";

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
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 字数统计状态
  const [charCount, setCharCount] = useState(role.description?.length || 0);
  // 描述的最大储存量
  const MAX_DESCRIPTION_LENGTH = 140;

  // 当角色变化时，更新本地状态和字数统计
  useEffect(() => {
    setLocalRole(role);
    setCharCount(role.description?.length || 0);
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
    onSuccess: () => {
      onSave(localRole);
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
    setIsTransitioning(true);
    const cleanedRole = {
      ...localRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };

    updateRole(cleanedRole, {
      onSuccess: () => {
        // 添加一个意义不明的延迟，故意浪费用户时间（不是
        setTimeout(() => {
          onSave(cleanedRole);
          setIsTransitioning(false);
        }, 300);
      },
      onError: () => {
        setIsTransitioning(false);
      },
    });
  };

  // 更新url和avatarId,方便更改服务器数据
  const handleAvatarChange = (previewUrl: string, avatarId: number) => {
    setLocalRole(prev => ({ ...prev, avatar: previewUrl, avatarId }));
    role.avatarId = avatarId;
    role.avatar = previewUrl;
    onSave(role);
    updateRole(role);
  };

  return (
    <div className={`space-y-6 pb-20 ${
      isTransitioning ? "opacity-50" : ""
    }`}
    >
      {/* 基础信息卡片 */}
      <div className={`card bg-base-100 shadow-xl transition-opacity duration-300 ease-in-out ${
        isEditing ? "ring-2 ring-primary" : ""
      }`}
      >
        <div className="card-body">
          <div className="flex items-center gap-8">
            <CharacterAvatar
              role={localRole}
              onchange={handleAvatarChange}
            />

            <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              {/* <Section title="基本信息"> */}
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
                        onChange={(e) => {
                          setLocalRole(prev => ({ ...prev, description: e.target.value }));
                          setCharCount(e.target.value.length);
                        }}
                        placeholder="角色描述"
                        className="textarea textarea-bordered w-full h-24 resize-none"
                      />
                      <div className="text-right mt-1">
                        <span className={`text-sm font-bold ${
                          charCount > MAX_DESCRIPTION_LENGTH
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
                    </>
                  )}
              {/* </Section> */}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <button
                    type="submit"
                    onClick={handleSave}
                    className={`btn btn-primary ${
                      isTransitioning ? "scale-95" : ""
                    }`}
                    disabled={isTransitioning}
                  >
                    {isTransitioning
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            保存
                          </span>
                        )}
                  </button>
                )
              : (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="btn btn-accent"
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 transition-transform duration-300" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
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
