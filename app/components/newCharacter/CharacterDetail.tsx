// import type { Transform } from "./sprite/TransformControl";
import type { RoleAvatar } from "api";
import type { Role } from "./types";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useGetRoleAvatarsQuery, useUpdateRoleWithLocalMutation } from "api/queryHooks";
import { useEffect, useMemo, useRef, useState } from "react";
import CharacterAvatar from "./CharacterAvatar";
import ExpansionModule from "./rules/ExpansionModule";
import RulesSection from "./rules/RulesSection";
import Section from "./Section";
import { SpriteRenderStudio } from "./sprite/SpriteRenderStudio";
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

  // 头像相关状态管理
  const [roleAvatars, setRoleAvatars] = useState<RoleAvatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(role.avatarId);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(role.avatar || "/favicon.ico");
  const [selectedSpriteUrl, setSelectedSpriteUrl] = useState<string | null>("");

  // 获取角色所有头像
  const { data: roleAvatarsResponse, isSuccess } = useGetRoleAvatarsQuery(role.id);

  // 字数统计：由描述派生，避免在 useEffect 中 setState
  const charCount = useMemo(() => localRole.description?.length || 0, [localRole.description]);
  // 描述的最大储存量
  const MAX_DESCRIPTION_LENGTH = 140;

  // 立绘预览相关状态
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  // 已由SpriteRenderStudio内部管理transform相关状态

  // 规则选择状态
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1);
  const [isRuleLoading, setIsRuleLoading] = useState(false);

  // 获取当前规则详情
  const { data: currentRuleData } = useRuleDetailQuery(selectedRuleId);

  // 处理规则变更
  const handleRuleChange = (newRuleId: number) => {
    setIsRuleLoading(true);
    setSelectedRuleId(newRuleId);
    // 模拟加载延迟
    setTimeout(() => setIsRuleLoading(false), 300);
  };

  // 当切换到不同角色时，更新本地状态
  useEffect(() => {
    if (role.id !== localRole.id) {
      setLocalRole(role);
      setSelectedAvatarId(role.avatarId);
      setSelectedAvatarUrl(role.avatar || "/favicon.ico");

      // 如果头像列表已经加载，立即同步头像信息
      if (roleAvatars.length > 0 && role.avatarId !== 0) {
        const currentAvatar = roleAvatars.find(ele => ele.avatarId === role.avatarId);
        if (currentAvatar) {
          setSelectedAvatarUrl(currentAvatar.avatarUrl || "/favicon.ico");
          setSelectedSpriteUrl(currentAvatar.spriteUrl || null);
        }
      }
      else {
        setSelectedSpriteUrl("");
      }
    }
  }, [role, localRole.id, roleAvatars]);

  // 处理角色头像数据更新
  useEffect(() => {
    if (isSuccess && roleAvatarsResponse?.success && Array.isArray(roleAvatarsResponse.data)) {
      const avatarsData = roleAvatarsResponse.data;
      setRoleAvatars(avatarsData);

      // 使用 localRole.avatarId 而不是 role.avatarId，确保与当前状态同步
      if (localRole.avatarId !== 0) {
        const currentAvatar = avatarsData.find(ele => ele.avatarId === localRole.avatarId);
        const newAvatarUrl = currentAvatar?.avatarUrl || "/favicon.ico";
        const newSpriteUrl = currentAvatar?.spriteUrl || null;

        setSelectedAvatarUrl(newAvatarUrl);
        setSelectedSpriteUrl(newSpriteUrl);

        // 同时更新 localRole 的 avatar 字段，确保显示正确的头像
        setLocalRole(prev => ({
          ...prev,
          avatar: newAvatarUrl,
        }));
      }
      else {
        setSelectedAvatarUrl("/favicon.ico");
        setSelectedSpriteUrl("");
      }
    }
  }, [isSuccess, roleAvatarsResponse, localRole.avatarId]);

  // 接口部分
  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave);
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
  const handleAvatarChange = (previewUrl: string, avatarId: number, spriteUrl?: string | null) => {
    const updatedRole = {
      ...localRole,
      avatar: previewUrl,
      avatarId,
    };
    setLocalRole(updatedRole);
    // 同时更新选中的立绘URL
    if (spriteUrl !== undefined) {
      setSelectedSpriteUrl(spriteUrl);
    }
    const cleanedRole = {
      ...updatedRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };
    updateRole(cleanedRole);
  };

  // 处理头像选择
  const handleAvatarSelect = (avatarUrl: string, avatarId: number, spriteUrl: string | null) => {
    setSelectedAvatarUrl(avatarUrl);
    setSelectedAvatarId(avatarId);
    setSelectedSpriteUrl(spriteUrl);
  };

  // 处理头像删除
  const handleAvatarDelete = (avatarId: number) => {
    setRoleAvatars(prev => prev.filter(avatar => avatar.avatarId !== avatarId));

    // 如果删除的是当前选中的头像，重置为默认
    if (avatarId === selectedAvatarId) {
      setSelectedAvatarUrl("/favicon.ico");
      setSelectedAvatarId(0);
      setSelectedSpriteUrl("");
    }
  };

  // 处理头像上传
  const handleAvatarUpload = (data: any) => {
    // 上传成功后可能需要重新获取头像列表
    console.warn("头像上传数据:", data);
  };

  return (
    <div className={`transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""
    }`}
    >

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-2xl md:text-3xl my-2">
            {localRole.name || "未命名角色"}
          </h1>
          <p className="text-base-content/60">
            角色展示 ·
            {currentRuleData?.ruleName || "未选择规则"}
          </p>
        </div>
        {isEditing
          ? (
              <button
                type="button"
                onClick={handleSave}
                className={`btn btn-primary btn-sm md:btn-lg ${isTransitioning ? "scale-95" : ""}`}
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
              <button type="button" onClick={onEdit} className="btn btn-accent btn-sm md:btn-lg">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  编辑
                </span>
              </button>
            )}
      </div>

      <div className="divider divider-start font-bold" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：立绘与简介、规则选择（固定） */}
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4 space-y-6">
          {/* 规则选择区域（移至左侧） */}
          <Section title="规则选择" className="rounded-2xl border-2 border-base-content/10 bg-base-100" defaultOpen={false}>
            <RulesSection
              currentRuleId={selectedRuleId}
              onRuleChange={handleRuleChange}
            />
          </Section>
          {/* 立绘与简介卡片 */}
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
            <div className="card-body">
              <div className="flex justify-center">
                <CharacterAvatar
                  role={localRole}
                  roleAvatars={roleAvatars}
                  selectedAvatarId={selectedAvatarId}
                  selectedAvatarUrl={selectedAvatarUrl}
                  selectedSpriteUrl={selectedSpriteUrl}
                  onchange={handleAvatarChange}
                  onSpritePreviewChange={url => setSelectedSpriteUrl(url)}
                  onAvatarSelect={handleAvatarSelect}
                  onAvatarDelete={handleAvatarDelete}
                  onAvatarUpload={handleAvatarUpload}
                />
              </div>
              <div className="divider mt-4" />
              {/* 基础信息与编辑（已移至左侧） */}
              <div>
                {isEditing
                  ? (
                      <div>
                        <p className="text-lg">角色名：</p>
                        <input
                          type="text"
                          value={localRole.name}
                          onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="角色名称"
                          className="input input-bordered w-full text-lg font-bold mt-2"
                        />
                        <p className="text-lg mt-2">描述：</p>
                        <textarea
                          value={localRole.description}
                          onChange={(e) => {
                            setLocalRole(prev => ({ ...prev, description: e.target.value }));
                          }}
                          placeholder="角色描述"
                          className="textarea textarea-bordered w-full h-24 resize-none mt-2"
                        />
                        <div className="text-right mt-1">
                          <span className={`text-sm font-bold ${charCount > MAX_DESCRIPTION_LENGTH ? "text-error" : "text-base-content/70"
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
                      </div>
                    )
                  : (
                      <>
                        <p className="text-base md:text-lg whitespace-pre-wrap break-words max-w-full overflow-hidden md:min-h-22 text-center">
                          {localRole.description || "暂无描述"}
                        </p>
                        <div className="text-xs text-center mt-8">
                          <p>
                            角色ID号：
                            {localRole.id}
                          </p>
                          <p>
                            采用模型：
                            {localRole.modelName || "暂无描述"}
                          </p>
                          <p>
                            语音来源：
                            {localRole.speakerName || "暂无描述"}
                          </p>
                        </div>
                      </>
                    )}

                {/* 顶部已提供编辑/保存按钮 */}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：编辑信息、预览、扩展模块 */}
        <div className="lg:col-span-3 space-y-6">

          {/* 渲染结果预览 */}
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
            <Section title="渲染结果预览">
              <SpriteRenderStudio
                characterName={localRole.name || "未命名角色"}
                roleAvatars={roleAvatars}
                initialAvatarId={localRole.avatarId}
                externalCanvasRef={previewCanvasRef}
                className="w-full p-3 gap-4 flex mb-2"
              />
            </Section>
          </div>

          {/* 扩展模块（右侧） */}
          {isRuleLoading
            ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              )
            : (
                <ExpansionModule roleId={localRole.id} ruleId={selectedRuleId} />
              )}
        </div>
      </div>
    </div>
  );
}
