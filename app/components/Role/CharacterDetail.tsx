// import type { Transform } from "./sprite/TransformControl";
import type { Role } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import { useAbilityByRuleAndRole, useUpdateRoleAbilityByRoleIdMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { tuanchat } from "api/instance";
import { useCreateRoleMutation, useGetRoleAvatarsQuery, useGetRoleQuery, useUpdateRoleWithLocalMutation } from "api/queryHooks";
import { Suspense, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import DiceMaidenLinkModal from "./DiceMaidenLinkModal";
import Section from "./Editors/Section";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import AudioUploadModal from "./RoleInfoCard/AudioUploadModal";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";
import ExpansionModule from "./rules/ExpansionModule";
import RulesSection from "./rules/RulesSection";
import { SpriteRenderStudio } from "./sprite/SpriteRenderStudio";
// import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  onSave: (updatedRole: Role) => void;
  selectedRuleId: number;
  onRuleChange: (newRuleId: number) => void;
}

export default function CharacterDetail(props: CharacterDetailProps) {
  return <CharacterDetailInner key={props.role.id} {...props} />;
}
/**
 * 角色详情组件
 */
function CharacterDetailInner({
  role,
  onSave,
  selectedRuleId,
  onRuleChange,
}: CharacterDetailProps) {
  // 从 Outlet Context 获取 setRoles 用于手动更新角色列表
  const context = useOutletContext<{ setRoles?: React.Dispatch<React.SetStateAction<Role[]>> }>();
  const setRoles = context?.setRoles;

  // --- MOVED --- isEditing 状态现在是组件的本地状态，非常清晰！
  const [isEditing, setIsEditing] = useState(false);

  // 初始化角色数据
  const [localRole, setLocalRole] = useState<Role>(role);
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 头像选择状态 - 只保留 ID,URL 通过计算得出
  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(role.avatarId);

  // 获取角色所有头像
  const { data: roleAvatarsResponse, isLoading: isQueryLoading } = useGetRoleAvatarsQuery(role.id);
  // 获取最新角色数据（用于判断类型）
  const { data: currentRoleData } = useGetRoleQuery(role.id);
  const queryClient = useQueryClient();

  // 获取当前关联的骰娘ID
  const currentDicerRoleId = useMemo(() => {
    const extra = localRole.extra;
    if (!extra || !extra.dicerRoleId)
      return undefined;
    const id = Number(extra.dicerRoleId);
    return (Number.isNaN(id) || id <= 0) ? undefined : id;
  }, [localRole.extra]);

  // 查询关联的骰娘信息
  const { data: linkedDicerRoleData } = useGetRoleQuery(currentDicerRoleId || 0);

  // 检查骰娘是否有效
  const dicerRoleError = useMemo(() => {
    if (!currentDicerRoleId)
      return null;
    const roleData = linkedDicerRoleData?.data;
    if (!roleData)
      return "骰娘角色不存在";
    if (roleData.type !== 1)
      return "关联的角色不是骰娘类型";
    return null;
  }, [currentDicerRoleId, linkedDicerRoleData]);

  // 直接使用 query 数据,无需额外 state
  const roleAvatars = useMemo(
    () => roleAvatarsResponse?.data ?? [],
    [roleAvatarsResponse?.data],
  );

  // 判断是否为骰娘角色（使用实时数据）
  const isDiceMaiden = useMemo(() => {
    const roleData = currentRoleData?.data;
    return !!(roleData?.diceMaiden || roleData?.type === 1);
  }, [currentRoleData]);

  // 通过 useMemo 派生展示用的头像/立绘 URL
  const { selectedAvatarUrl, selectedSpriteUrl } = useMemo(() => {
    const avatarFromList = (
      localRole.avatarId && localRole.avatarId !== 0
    )
      ? roleAvatars.find(item => item.avatarId === localRole.avatarId)
      : undefined;

    return {
      selectedAvatarUrl: avatarFromList?.avatarUrl ?? localRole.avatar ?? "/favicon.ico",
      selectedSpriteUrl: avatarFromList?.spriteUrl ?? "",
    };
  }, [localRole.avatarId, localRole.avatar, roleAvatars]);

  // 字数统计：由描述派生，避免在 useEffect 中 setState
  const charCount = useMemo(() => localRole.description?.length || 0, [localRole.description]);
  // 描述的最大储存量
  const MAX_DESCRIPTION_LENGTH = 140;

  // 已由SpriteRenderStudio内部管理transform相关状态

  // 规则选择状态 - 使用 searchParams 替代 state
  // const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false); // 规则选择弹窗状态
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false); // 音频上传弹窗状态
  const [isStImportModalOpen, setIsStImportModalOpen] = useState(false); // ST导入弹窗状态
  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false); // 骰娘关联弹窗状态
  const [isConverting, setIsConverting] = useState(false); // 转换为骰娘的过程状态

  // 获取当前规则详情
  const { data: currentRuleData } = useRuleDetailQuery(selectedRuleId);

  // 能力查询（用于复制当前角色的能力到新骰娘）
  const abilityQuery = useAbilityByRuleAndRole(role.id, selectedRuleId);

  // 接口部分
  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave);
  const createRoleMutation = useCreateRoleMutation();
  const { mutate: updateFieldAbility } = useUpdateRoleAbilityByRoleIdMutation();

  // 处理规则变更
  // --- CHANGED --- handleRuleChange 现在只调用从 prop 传来的函数
  const handleRuleChange = (newRuleId: number) => {
    onRuleChange(newRuleId); // 调用父组件的函数来更新 URL
    setIsRuleModalOpen(false);
    // loading 状态由 useEffect 管理，这里不需要重复设置
  };

  // 打开规则选择弹窗
  const handleOpenRuleModal = () => {
    setIsRuleModalOpen(true);
  };

  // 打开音频上传弹窗
  const handleOpenAudioModal = () => {
    setIsAudioModalOpen(true);
  };

  // 打开骰娘关联弹窗
  const handleOpenDiceMaidenLinkModal = () => {
    setIsDiceMaidenLinkModalOpen(true);
  };

  // 处理骰娘关联确认
  const handleDiceMaidenLinkConfirm = (dicerRoleId: number) => {
    const newExtra = { ...localRole.extra };

    if (dicerRoleId === 0) {
      // 清除绑定
      delete newExtra.dicerRoleId;
    }
    else {
      // 设置或更新绑定
      newExtra.dicerRoleId = String(dicerRoleId);
    }

    const updatedRole = {
      ...localRole,
      extra: newExtra,
    };
    setLocalRole(updatedRole);

    // 使用updateRole保存到后端
    updateRole(updatedRole, {
      onSuccess: () => {
        // 骰娘关联成功
      },
      onError: (error) => {
        console.error("保存骰娘关联失败:", error);
      },
    });
  };

  // 处理音频上传成功
  const handleAudioUploadSuccess = (audioUrl: string) => {
    // 更新本地角色状态，添加音频URL
    const updatedRole = {
      ...localRole,
      voiceUrl: audioUrl,
    };
    setLocalRole(updatedRole);

    // 使用updateRole保存到后端
    updateRole(updatedRole, {
      onSuccess: () => {
        console.warn("音频文件上传并保存成功:", audioUrl);
        console.warn("更新后的角色数据:", updatedRole);
        console.warn("更新后的本地数据", localRole);
      },
      onError: (error) => {
        console.error("保存音频URL失败:", error);
      },
    });
  };

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

  // --- CHANGED --- onSave 现在也负责重置本地的 isEditing 状态
  const handleSave = () => {
    setIsTransitioning(true);
    const cleanedRole = {
      ...localRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };
    updateRole(cleanedRole, {
      onSuccess: () => {
        setTimeout(() => {
          onSave(cleanedRole); // 通知父级更新全局状态
          setIsEditing(false); // 重置本地编辑状态
          setIsTransitioning(false);
        }, 300);
      },
      onError: () => setIsTransitioning(false),
    });
  };

  // 更新url和avatarId,方便更改服务器数据
  const handleAvatarChange = (previewUrl: string, avatarId: number) => {
    const updatedRole = {
      ...localRole,
      avatar: previewUrl,
      avatarId,
    };
    setLocalRole(updatedRole);
    setSelectedAvatarId(avatarId); // 更新选中ID,URL会自动通过useMemo计算
    const cleanedRole = {
      ...updatedRole,
      name: cleanText(localRole.name),
      description: cleanText(localRole.description),
    };
    updateRole(cleanedRole);
  };

  // 处理头像选择 - 简化为只更新ID
  const handleAvatarSelect = (avatarId: number) => {
    setSelectedAvatarId(avatarId);
  };

  // 处理头像删除 - 使用 React Query 的乐观更新
  const handleAvatarDelete = (avatarId: number) => {
    // 乐观更新:直接修改query cache
    queryClient.setQueryData(
      ["getRoleAvatars", role.id],
      (old: any) => {
        if (!old?.data)
          return old;
        return {
          ...old,
          data: old.data.filter((avatar: any) => avatar.avatarId !== avatarId),
        };
      },
    );

    // 如果删除的是当前选中的头像，重置为默认
    if (avatarId === selectedAvatarId) {
      setSelectedAvatarId(0);
    }
  };

  // 处理头像上传
  const handleAvatarUpload = (data: any) => {
    // 上传成功后可能需要重新获取头像列表
    console.warn("头像上传数据:", data);
  };

  // 转换为骰娘：创建新角色并复制头像（含 Transform）与能力，完成后跳转
  const handleConvertToDiceMaiden = async () => {
    try {
      setIsConverting(true);
      // 1. 创建骰娘角色
      createRoleMutation.mutate({
        roleName: localRole.name,
        description: localRole.description,
        type: 1,
      }, {
        onSuccess: async (newRoleId?: number) => {
          if (!newRoleId || newRoleId <= 0) {
            setIsConverting(false);
            return;
          }

          let finalAvatarUrl = "/favicon.ico";
          let finalAvatarId: number | undefined;

          // 2. 复制头像与 Transform 参数（如果当前有选中头像）
          try {
            const avatarUrl = selectedAvatarUrl;
            const spriteUrl = selectedSpriteUrl;
            if (avatarUrl && avatarUrl !== "/favicon.ico") {
              // 查找当前角色选中的头像，获取 Transform 参数
              const currentAvatar = roleAvatars.find(a => a.avatarId === selectedAvatarId);
              const setRes = await tuanchat.avatarController.setRoleAvatar({ roleId: newRoleId });
              const avatarId = setRes?.data;
              if (avatarId) {
                await tuanchat.avatarController.updateRoleAvatar({
                  roleId: newRoleId,
                  avatarId,
                  avatarUrl,
                  spriteUrl,
                  // 复制 Transform 参数
                  spriteXPosition: currentAvatar?.spriteXPosition ?? 0,
                  spriteYPosition: currentAvatar?.spriteYPosition ?? 0,
                  spriteScale: currentAvatar?.spriteScale ?? 1,
                  spriteTransparency: currentAvatar?.spriteTransparency ?? 1,
                  spriteRotation: currentAvatar?.spriteRotation ?? 0,
                });
                // 更新新角色的头像引用
                await tuanchat.roleController.updateRole({ roleId: newRoleId, avatarId });
                finalAvatarUrl = avatarUrl;
                finalAvatarId = avatarId;
              }
            }
          }
          catch (e) {
            console.error("复制头像失败", e);
          }

          // 3. 仅保留 extra（如骰娘文案），清空 act/basic/ability/skill
          try {
            const extraCopywriting = abilityQuery.data?.extraCopywriting ?? {};
            const serializedData = JSON.stringify(extraCopywriting);
            updateFieldAbility({
              roleId: newRoleId,
              ruleId: selectedRuleId,
              act: {},
              basic: {},
              ability: {},
              skill: {},
              extra: { copywriting: serializedData },
            });
          }
          catch (e) {
            console.error("设置骰娘extra失败", e);
          }

          // 4. 创建新角色对象并手动更新 roles 状态（立即显示在侧边栏）
          const newRole: Role = {
            id: newRoleId,
            name: localRole.name,
            description: localRole.description,
            avatar: finalAvatarUrl,
            avatarId: finalAvatarId ?? 0,
            type: 1, // 骰娘类型
            modelName: localRole.modelName,
            speakerName: localRole.speakerName,
            voiceUrl: localRole.voiceUrl,
            extra: {}, // 新骰娘初始化空的extra
          };

          // 手动更新角色列表，让侧边栏立即显示新角色
          if (setRoles) {
            setRoles(prevRoles => [newRole, ...prevRoles]);
          }

          // 5. 刷新缓存
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["getRole", newRoleId] }),
            queryClient.invalidateQueries({ queryKey: ["getUserRoles"] }),
            queryClient.invalidateQueries({ queryKey: ["roleInfinite"] }),
            queryClient.invalidateQueries({ queryKey: ["getRoleAvatars", newRoleId] }),
          ]);

          // 6. 跳转到新角色页面
          setIsConverting(false);
          navigate(`/role/${newRoleId}?rule=${selectedRuleId}`);
        },
        onError: () => setIsConverting(false),
      });
    }
    catch (e) {
      console.error("转换为骰娘失败", e);
      setIsConverting(false);
    }
  };

  return (
    <div className={`transition-opacity duration-300 p-4 ease-in-out ${isTransitioning ? "opacity-50" : ""
    }`}
    >

      {/* 桌面端显示的头部区域 */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/role" type="button" className="btn btn-lg btn-outline rounded-md btn-ghost mr-4">
            ← 返回
          </Link>
          <div>
            <h1 className="font-semibold text-2xl md:text-3xl my-2">
              {localRole.name || "未命名角色"}
            </h1>
            <p className="text-base-content/60">
              {isDiceMaiden ? "骰娘展示" : "角色展示"}
              {" "}
              ·
              {currentRuleData?.ruleName || "未选择规则"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 普通角色显示转换为骰娘按钮 */}
          {!isDiceMaiden && (
            <div className="tooltip tooltip-bottom" data-tip="将当前角色复制为骰娘角色">
              <button
                type="button"
                onClick={handleConvertToDiceMaiden}
                className={`btn btn-outline btn-sm md:btn-lg rounded-lg ${isConverting ? "scale-95" : ""}`}
                disabled={isConverting}
              >
                {isConverting
                  ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    )
                  : (
                      <span className="flex items-center gap-1">
                        To骰娘
                      </span>
                    )}
              </button>
            </div>
          )}
          {!isDiceMaiden && (
            <div className="tooltip tooltip-bottom" data-tip="从ST格式导入角色数据">
              <button
                type="button"
                onClick={() => setIsStImportModalOpen(true)}
                className="btn rounded-lg bg-info/70 text-info-content btn-sm md:btn-lg"
              >
                <span className="flex items-center gap-1">
                  ST导入
                </span>
              </button>
            </div>
          )}
          {isEditing
            ? (
                <div className="tooltip tooltip-bottom" data-tip="保存当前修改">
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`btn btn-primary btn-sm md:btn-lg rounded-lg ${isTransitioning ? "scale-95" : ""}`}
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
                </div>
              )
            : (
                <div className="tooltip tooltip-bottom" data-tip="编辑角色信息">
                  <button type="button" onClick={() => setIsEditing(true)} className="btn btn-accent btn-sm md:btn-lg rounded-lg">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      编辑
                    </span>
                  </button>
                </div>
              )}
        </div>
      </div>

      <div className="max-md:hidden divider"></div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧：立绘与简介、规则选择（固定） */}
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4 space-y-6">
          {/* 立绘与简介卡片 */}
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10">
            <div className="card-body p-4 max-h-168">
              {/* 移动端显示的头部区域 */}
              <div className="md:hidden mb-4 pl-4 pr-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h1 className="font-semibold text-xl max-w-32 truncate">
                      {localRole.name || "未命名角色"}
                    </h1>
                    <p className="text-base-content/60 text-sm">
                      {isDiceMaiden ? "骰娘展示" : "角色展示"}
                      {" "}
                      ·
                      {currentRuleData?.ruleName || "未选择规则"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDiceMaiden && (
                      <button
                        type="button"
                        onClick={handleConvertToDiceMaiden}
                        className={`btn btn-success btn-sm ${isConverting ? "scale-95" : ""}`}
                        disabled={isConverting}
                      >
                        {isConverting
                          ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            )
                          : (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                  <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="2" />
                                  <circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="2" />
                                  <circle cx="12" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
                                  <path d="M6 8v4a4 4 0 004 4h4a4 4 0 004-4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                转为骰娘
                              </span>
                            )}
                      </button>
                    )}

                    {isEditing
                      ? (
                          <button
                            type="button"
                            onClick={handleSave}
                            className={`btn btn-primary btn-sm ${isTransitioning ? "scale-95" : ""}`}
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
                          <button type="button" onClick={() => setIsEditing(true)} className="btn btn-accent btn-sm">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                                <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                              </svg>
                              编辑
                            </span>
                          </button>
                        )}

                    {!isDiceMaiden && (
                      <button
                        type="button"
                        onClick={() => setIsStImportModalOpen(true)}
                        className="btn btn-secondary btn-sm"
                      >
                        <span className="flex items-center gap-1">
                          ST导入
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="divider my-0" />
              </div>

              <div className="flex justify-center mt-6 mb-2">
                {isQueryLoading
                  ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="skeleton w-24 h-24 rounded-full"></div>
                        <div className="skeleton h-4 w-20"></div>
                      </div>
                    )
                  : (
                      <CharacterAvatar
                        role={localRole} // 当前角色基本信息
                        roleAvatars={roleAvatars} // 当前角色的头像列表
                        selectedAvatarId={selectedAvatarId} // 选中的头像ID
                        selectedAvatarUrl={selectedAvatarUrl}// 选中的头像URL
                        selectedSpriteUrl={selectedSpriteUrl}// 选中的立绘URL
                        onchange={handleAvatarChange}// 头像变化的回调
                        onAvatarSelect={handleAvatarSelect} // 头像选择的回调
                        onAvatarDelete={handleAvatarDelete} // 头像删除的回调
                        onAvatarUpload={handleAvatarUpload} // 头像上传的回调
                      />
                    )}
              </div>
              {!isEditing && (
                <div className="divider font-bold text-center text-xl flex">
                  <span className="flex-shrink-0 lg:max-w-48 truncate">
                    {localRole.name}
                  </span>
                </div>
              )}
              {isEditing && <div className="divider my-0" />}
              {/* 基础信息与编辑（已移至左侧） */}
              <div>
                {isEditing
                  ? (
                      <div>
                        <label className="input rounded-md w-full">
                          <input
                            type="text"
                            value={localRole.name}
                            onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="角色名称"
                          />
                        </label>
                        <textarea
                          value={localRole.description}
                          onChange={(e) => {
                            setLocalRole(prev => ({ ...prev, description: e.target.value }));
                          }}
                          placeholder="角色描述"
                          className="textarea textarea-sm w-full h-24 resize-none mt-4 rounded-md"
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
                        <p className="text-base break-words max-w-full text-center line-clamp-6 overflow-hidden text-ellipsis">
                          {localRole.description || "暂无描述"}
                        </p>
                      </>
                    )}
                {/* 顶部已提供编辑/保存按钮 */}

              </div>

            </div>

            <p className="text-center text-xs text-base-content/60">
              角色ID号：
              {localRole.id}
            </p>
            <div className="divider p-4 my-0" />

            <div>

              <div
                className="card bg-base-100 rounded-xl cursor-pointer transition-all duration-200"
                onClick={handleOpenRuleModal}
              >
                <div className="card-body p-4 hover:bg-base-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">当前规则</h3>
                        <p className="text-primary font-medium text-sm">
                          {currentRuleData?.ruleName || "未选择规则"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-base-content/50">
                      <span className="text-xs">切换</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="divider p-4 my-0" />

              {/* 音频上传卡片 */}
              <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
                <div className="card-body p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2"
                    onClick={handleOpenAudioModal}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">上传音频</h3>
                        <p className="text-secondary font-medium text-sm">
                          {localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-base-content/50">
                      <span className="text-xs">上传</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* 音频播放器 */}
                  <AudioPlayer
                    role={localRole}
                    onRoleUpdate={(updatedRole) => {
                      setLocalRole(updatedRole);
                      // 调用后端API更新
                      updateRole(updatedRole);
                    }}
                    onDelete={() => {
                      const updatedRole = { ...localRole, voiceUrl: undefined };
                      setLocalRole(updatedRole);
                      // 调用后端API更新
                      updateRole(updatedRole);
                    }}
                  />
                </div>
              </div>

              {/* 关联骰娘卡片 */}
              <div className="card bg-base-100 rounded-xl transition-all duration-200 mb-4">
                <div className="card-body p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2"
                    onClick={handleOpenDiceMaidenLinkModal}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                          <circle cx="7" cy="7" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="17" cy="17" r="1.5" fill="currentColor" />
                          <circle cx="7" cy="17" r="1.5" fill="currentColor" />
                          <circle cx="17" cy="7" r="1.5" fill="currentColor" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">关联骰娘</h3>
                        <p className={`font-medium text-sm ${
                          dicerRoleError ? "text-error" : "text-accent"
                        }`}
                        >
                          {currentDicerRoleId
                            ? dicerRoleError || linkedDicerRoleData?.data?.roleName || `ID: ${currentDicerRoleId}`
                            : "选择使用的骰娘角色"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-base-content/50">
                      <span className="text-xs">{currentDicerRoleId ? "更改" : "设置"}</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 右侧：编辑信息、预览、扩展模块 */}
        <div className="lg:col-span-3 space-y-6">

          {/* 渲染结果预览 */}
          {isQueryLoading
            ? (
                <div className="card-sm md:card-xl bg-base-100 shadow-xs md:rounded-xl md:border-2 border-base-content/10">
                  <Section title="⚙️渲染结果预览" defaultOpen={false}>
                    {/* 默认折叠时不展示大型骨架，展开后显示简短骨架占位 */}
                    <div className="p-4">
                      <div className="skeleton h-24 w-full rounded-md"></div>
                    </div>
                  </Section>
                </div>
              )
            : (
                <div className="card-sm md:card-xl bg-base-100 shadow-xs md:rounded-xl md:border-2 border-base-content/10">
                  <Section title="⚙️渲染结果预览" defaultOpen={false}>
                    <SpriteRenderStudio
                      characterName={localRole.name || "未命名角色"}
                      roleAvatars={roleAvatars}
                      initialAvatarId={localRole.avatarId}
                      className="w-full gap-4 flex mb-2"
                      onAvatarChange={handleAvatarChange}
                      role={localRole}
                    />
                  </Section>
                </div>
              )}

          {/* 扩展模块（右侧） */}
          {isQueryLoading
            ? (
                <div className="space-y-6">
                  {/* 骨架屏 - 模拟扩展模块 */}
                  <div className="flex gap-2">
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                  </div>
                  <div className="card-sm md:card-xl bg-base-100 shadow-xs md:rounded-xl md:border-2 border-base-content/10">
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="skeleton h-6 w-32"></div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="skeleton h-10 w-full"></div>
                          <div className="skeleton h-10 w-full"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="skeleton h-10 w-full"></div>
                          <div className="skeleton h-10 w-full"></div>
                        </div>
                        <div className="skeleton h-20 w-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* <div className="card-sm md:card-xl bg-base-100 shadow-xs md:rounded-xl md:border-2 border-base-content/10">
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="skeleton h-6 w-40"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="skeleton h-8 w-full"></div>
                        <div className="skeleton h-8 w-full"></div>
                        <div className="skeleton h-8 w-full"></div>
                        <div className="skeleton h-12 w-full"></div>
                      </div>
                    </div>
                  </div> */}
                </div>
              )
            : (
                <ExpansionModule
                  roleId={localRole.id}
                  ruleId={selectedRuleId}
                  isStImportModalOpen={isStImportModalOpen}
                  onStImportModalClose={() => setIsStImportModalOpen(false)}
                />
              )}
        </div>
      </div>

      {/* 规则选择弹窗 */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsRuleModalOpen(false)}>
          <div className="bg-base-100 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">选择规则系统</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => setIsRuleModalOpen(false)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <Suspense fallback={(
                  <div className="flex flex-col items-center gap-4 py-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-sm text-base-content/60">加载规则列表...</p>
                  </div>
                )}
                >
                  <RulesSection
                    currentRuleId={selectedRuleId}
                    onRuleChange={handleRuleChange}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 音频上传弹窗 */}
      <AudioUploadModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onSuccess={handleAudioUploadSuccess}
      />

      {/* 骰娘关联弹窗 */}
      <DiceMaidenLinkModal
        isOpen={isDiceMaidenLinkModalOpen}
        onClose={() => setIsDiceMaidenLinkModalOpen(false)}
        currentDicerRoleId={currentDicerRoleId}
        onConfirm={handleDiceMaidenLinkConfirm}
      />
    </div>
  );
}
