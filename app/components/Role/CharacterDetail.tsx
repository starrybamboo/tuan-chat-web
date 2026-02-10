// import type { Transform } from "./sprite/TransformControl";
import type { Role } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAbilityByRuleAndRole,
  useGenerateAbilityByRuleMutation,
  useGenerateBasicInfoByRuleMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useCopyRoleMutation, useGetRoleAvatarsQuery, useGetRoleQuery, useUpdateRoleWithLocalMutation } from "api/hooks/RoleAndAvatarHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { CloseIcon, DiceD6Icon, EditIcon, InfoIcon, RoleListIcon, SaveIcon, SlidersIcon } from "app/icons";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useOutletContext } from "react-router";
import CharacterDetailLeftPanel from "./CharacterDetailLeftPanel";
import CharacterDetailLeftPanelHorizontal from "./CharacterDetailLeftPanelHorizontal";
import DiceMaidenLinkModal from "./DiceMaidenLinkModal";
import AIGenerateModal from "./RoleCreation/steps/AIGenerateModal";
import AudioUploadModal from "./RoleInfoCard/AudioUploadModal";
import DicerConfigJsonModal from "./rules/DicerConfigJsonModal";
import ExpansionModule from "./rules/ExpansionModule";
import RulesSection from "./rules/RulesSection";
// import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  onSave: (updatedRole: Role) => void;
  selectedRuleId: number;
  onRuleChange: (newRuleId: number) => void;
  layout?: "page" | "popup";
  canKickOut?: boolean;
  onKickOut?: () => void;
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
  layout = "page",
  canKickOut = false,
  onKickOut,
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

  console.warn(
    "角色头像列表(roleAvatars):",
    roleAvatars.map(a => ({
      avatarId: a.avatarId,
      originEqualsSprite: !!a.originUrl && a.originUrl === a.spriteUrl,
      spriteUrl: a.spriteUrl ? `${a.spriteUrl.substring(0, 80)}...` : a.spriteUrl,
      originUrl: a.originUrl ? `${a.originUrl.substring(0, 80)}...` : a.originUrl,
    })),
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
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false); // AI生成弹窗状态
  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false); // 骰娘关联弹窗状态
  const [isDicerConfigJsonModalOpen, setIsDicerConfigJsonModalOpen] = useState(false); // 骰娘配置JSON弹窗状态
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false); // 复制角色模态框状态
  const [cloneTargetType, setCloneTargetType] = useState<"dicer" | "normal">("dicer"); // 目标类型
  const [cloneName, setCloneName] = useState(""); // 新角色名称
  const [cloneDescription, setCloneDescription] = useState(""); // 新角色描述
  const [isCloneNameEdited, setIsCloneNameEdited] = useState(false); // 追踪名称是否被手动编辑
  const [isCloning, setIsCloning] = useState(false); // 复制中状态

  // 获取当前规则详情
  const { data: currentRuleData } = useRuleDetailQuery(selectedRuleId);

  // 获取骰娘文案配置数据
  const abilityQuery = useAbilityByRuleAndRole(role.id, selectedRuleId || 0);
  const { mutate: updateFieldAbility } = useUpdateRoleAbilityByRoleIdMutation();
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();

  // 接口部分
  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave);
  const { mutateAsync: copyRoleMutate } = useCopyRoleMutation();

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

  // 打开AI生成弹窗
  const handleOpenAIGenerateModal = () => {
    if (!selectedRuleId) {
      toast.error("请先选择规则");
      return;
    }
    setIsAIGenerateModalOpen(true);
  };

  // 应用AI生成数据到当前角色
  const handleAIApply = (data: {
    act?: Record<string, string>;
    basic?: Record<string, string>;
    ability?: Record<string, string>;
    skill?: Record<string, string>;
  }) => {
    const currentAbility = abilityQuery.data;
    const payload = {
      roleId: localRole.id,
      ruleId: selectedRuleId,
      act: { ...(currentAbility?.actTemplate ?? {}), ...(data.act ?? {}) },
      basic: { ...(currentAbility?.basicDefault ?? {}), ...(data.basic ?? {}) },
      ability: { ...(currentAbility?.abilityDefault ?? {}), ...(data.ability ?? {}) },
      skill: { ...(currentAbility?.skillDefault ?? {}), ...(data.skill ?? {}) },
    };

    updateFieldAbility(payload, {
      onSuccess: () => {
        toast.success("AI生成内容已应用");
      },
      onError: () => {
        toast.error("AI生成内容应用失败");
      },
    });
  };

  // 打开骰娘关联弹窗
  const handleOpenDiceMaidenLinkModal = () => {
    setIsDiceMaidenLinkModalOpen(true);
  };

  // 处理骰娘配置保存
  const handleDicerConfigSave = async (data: Record<string, string[]>) => {
    const payload = {
      roleId: localRole.id,
      ruleId: selectedRuleId,
      act: {},
      basic: {},
      ability: {},
      skill: {},
      extra: {
        copywriting: JSON.stringify(data),
      },
    };

    return new Promise<void>((resolve, reject) => {
      updateFieldAbility(payload, {
        onSuccess: () => {
          resolve();
        },
        onError: (error) => {
          reject(error);
        },
      });
    });
  };

  // 处理骰娘配置重置
  const handleDicerConfigReset = () => {
    // 重置为空对象，让其从规则模板中重新加载
    const payload = {
      roleId: localRole.id,
      ruleId: selectedRuleId,
      act: {},
      basic: {},
      ability: {},
      skill: {},
      extra: {
        copywriting: JSON.stringify({}),
      },
    };

    updateFieldAbility(payload, {
      onSuccess: () => {
        toast.success("已还原默认配置");
        setIsDicerConfigJsonModalOpen(false);
      },
      onError: () => {
        toast.error("重置失败");
      },
    });
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

  // 保存角色基础信息（名称、描述、头像等）
  const handleSaveRoleBase = (afterSave?: () => void) => {
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
          afterSave?.();
          setIsTransitioning(false);
        }, 300);
      },
      onError: () => setIsTransitioning(false),
    });
  };

  const handleStartEditingAll = () => {
    setIsEditing(true);
  };

  const handleSaveAll = () => {
    handleSaveRoleBase(() => {
      setIsEditing(false);
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

  // 监听类型切换，自动更新名称（仅当用户未手动编辑时）
  useEffect(() => {
    if (!isCloneModalOpen || isCloneNameEdited)
      return;

    const currentType = isDiceMaiden ? "dicer" : "normal";
    const isSameType = cloneTargetType === currentType;

    if (isSameType) {
      // 同类型：添加-二周目后缀
      setCloneName(`${localRole.name}-二周目`);
    }
    else {
      // 跨类型：保持原名称
      setCloneName(localRole.name);
    }
  }, [cloneTargetType, isCloneModalOpen, isDiceMaiden, localRole.name, isCloneNameEdited]);

  // 执行复制角色逻辑
  const handleCloneRole = async () => {
    if (!cloneName.trim()) {
      toast.error("请输入新角色名称");
      return;
    }

    try {
      setIsCloning(true);
      const newRole = await copyRoleMutate({
        sourceRole: localRole,
        targetType: cloneTargetType,
        newName: cloneName,
        newDescription: cloneDescription,
      });

      // 更新角色列表
      if (setRoles) {
        setRoles(prevRoles => [newRole, ...prevRoles]);
      }

      // 缓存失效由hook统一处理

      // 成功提示
      toast.success(`已复制为${cloneTargetType === "dicer" ? "骰娘" : "普通"}角色`);

      // 关闭模态框
      setIsCloneModalOpen(false);

      // 跳转到新角色页面
      navigate(`/role/${newRole.id}`);
    }
    catch (e) {
      console.error("复制角色失败", e);
      toast.error(`复制失败: ${e instanceof Error ? e.message : "未知错误"}`);
    }
    finally {
      setIsCloning(false);
    }
  };

  const rightPanel = (
    <>
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
            </div>
          )
        : (
            <ExpansionModule
              isEditing={isEditing}
              roleId={localRole.id}
              ruleId={selectedRuleId}
              isStImportModalOpen={isStImportModalOpen}
              onStImportModalClose={() => setIsStImportModalOpen(false)}
            />
          )}
    </>
  );

  return (
    <div className={`transition-opacity duration-300 p-4 ease-in-out ${isTransitioning ? "opacity-50" : ""
    }`}
    >

      {/* 顶部头部区域（包含总编辑入口） */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {layout === "popup"
            ? (
                <button
                  type="button"
                  className="btn btn-error btn-sm md:btn-lg rounded-md mr-4"
                  onClick={onKickOut}
                  disabled={!canKickOut}
                >
                  踢出角色
                </button>
              )
            : (
                <Link to="/role" type="button" className="btn btn-lg btn-outline rounded-md btn-ghost mr-4">
                  ← 返回
                </Link>
              )}
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
          {!isDiceMaiden && (
            <div className="tooltip tooltip-bottom" data-tip="使用ST指令快速导入角色属性">
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
          {!isDiceMaiden && (
            <div className="tooltip tooltip-bottom" data-tip="通过描述批量生成角色属性">
              <button
                type="button"
                onClick={handleOpenAIGenerateModal}
                className="btn btn-primary btn-sm md:btn-lg rounded-lg"
              >
                <span className="flex items-center gap-1">
                  AI生成
                </span>
              </button>
            </div>
          )}
          {isDiceMaiden && (
            <div className="tooltip tooltip-bottom" data-tip="查看和导出骰娘文案配置的JSON格式">
              <button
                type="button"
                onClick={() => setIsDicerConfigJsonModalOpen(true)}
                className="btn rounded-lg bg-info/70 text-info-content btn-sm md:btn-lg"
              >
                <span className="flex items-center gap-1">
                  <SlidersIcon className="w-4 h-4" />
                  配置
                </span>
              </button>
            </div>
          )}
          {isEditing
            ? (
                <div className="tooltip tooltip-bottom" data-tip="保存当前修改">
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className={`btn btn-primary btn-sm md:btn-lg rounded-lg ${isTransitioning ? "scale-95" : ""}`}
                    disabled={isTransitioning}
                  >
                    {isTransitioning
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          <span className="flex items-center gap-1">
                            <SaveIcon className="w-4 h-4" />
                            保存
                          </span>
                        )}
                  </button>
                </div>
              )
            : (
                <div className="tooltip tooltip-bottom" data-tip="编辑角色信息">
                  <button type="button" onClick={handleStartEditingAll} className="btn btn-accent btn-sm md:btn-lg rounded-lg">
                    <span className="flex items-center gap-1">
                      <EditIcon className="w-4 h-4" />
                      编辑
                    </span>
                  </button>
                </div>
              )}
        </div>
      </div>

      <div className="max-md:hidden divider"></div>
      {layout === "popup"
        ? (
            <div className="space-y-6">
              <CharacterDetailLeftPanelHorizontal
                isQueryLoading={isQueryLoading}
                isEditing={isEditing}
                isDiceMaiden={isDiceMaiden}
                localRole={localRole}
                roleAvatars={roleAvatars}
                selectedAvatarId={selectedAvatarId}
                selectedAvatarUrl={selectedAvatarUrl}
                selectedSpriteUrl={selectedSpriteUrl}
                charCount={charCount}
                maxDescriptionLength={MAX_DESCRIPTION_LENGTH}
                currentRuleName={currentRuleData?.ruleName}
                currentDicerRoleId={currentDicerRoleId}
                dicerRoleError={dicerRoleError}
                linkedDicerRoleName={linkedDicerRoleData?.data?.roleName}
                onOpenRuleModal={handleOpenRuleModal}
                onOpenAudioModal={handleOpenAudioModal}
                onOpenDiceMaidenLinkModal={handleOpenDiceMaidenLinkModal}
                onAvatarChange={handleAvatarChange}
                onAvatarSelect={handleAvatarSelect}
                onAvatarDelete={handleAvatarDelete}
                onAvatarUpload={handleAvatarUpload}
                setLocalRole={setLocalRole}
                onAudioRoleUpdate={(updatedRole) => {
                  setLocalRole(updatedRole);
                  updateRole(updatedRole);
                }}
                onAudioDelete={() => {
                  const updatedRole = { ...localRole, voiceUrl: undefined };
                  setLocalRole(updatedRole);
                  updateRole(updatedRole);
                }}
              />
              <div className="space-y-6">
                {rightPanel}
              </div>
            </div>
          )
        : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* 左侧：立绘与简介、规则选择（固定） */}
              <CharacterDetailLeftPanel
                isQueryLoading={isQueryLoading}
                isEditing={isEditing}
                isDiceMaiden={isDiceMaiden}
                localRole={localRole}
                roleAvatars={roleAvatars}
                selectedAvatarId={selectedAvatarId}
                selectedAvatarUrl={selectedAvatarUrl}
                selectedSpriteUrl={selectedSpriteUrl}
                charCount={charCount}
                maxDescriptionLength={MAX_DESCRIPTION_LENGTH}
                currentRuleName={currentRuleData?.ruleName}
                currentDicerRoleId={currentDicerRoleId}
                dicerRoleError={dicerRoleError}
                linkedDicerRoleName={linkedDicerRoleData?.data?.roleName}
                onOpenRuleModal={handleOpenRuleModal}
                onOpenAudioModal={handleOpenAudioModal}
                onOpenDiceMaidenLinkModal={handleOpenDiceMaidenLinkModal}
                onAvatarChange={handleAvatarChange}
                onAvatarSelect={handleAvatarSelect}
                onAvatarDelete={handleAvatarDelete}
                onAvatarUpload={handleAvatarUpload}
                setLocalRole={setLocalRole}
                onAudioRoleUpdate={(updatedRole) => {
                  setLocalRole(updatedRole);
                  updateRole(updatedRole);
                }}
                onAudioDelete={() => {
                  const updatedRole = { ...localRole, voiceUrl: undefined };
                  setLocalRole(updatedRole);
                  updateRole(updatedRole);
                }}
              />

              {/* 右侧：编辑信息、预览、扩展模块 */}
              <div className="lg:col-span-3 space-y-6">
                {rightPanel}
              </div>
            </div>
          )}

      {/* 规则选择弹窗 */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsRuleModalOpen(false)}>
          <div className="bg-base-100 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">选择规则系统</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => setIsRuleModalOpen(false)}
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <RulesSection
                currentRuleId={selectedRuleId}
                onRuleChange={handleRuleChange}
              />
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

      {/* 骰娘配置 JSON 模态框 */}
      <DicerConfigJsonModal
        isOpen={isDicerConfigJsonModalOpen}
        onClose={() => setIsDicerConfigJsonModalOpen(false)}
        copywritingTemplates={abilityQuery.data?.extraCopywriting}
        onReset={handleDicerConfigReset}
        onSave={handleDicerConfigSave}
      />

      {/* AI生成弹窗 */}
      <AIGenerateModal
        isOpen={isAIGenerateModalOpen}
        onClose={() => setIsAIGenerateModalOpen(false)}
        ruleId={selectedRuleId}
        onApply={handleAIApply}
        generateBasicInfoByRule={generateBasicInfoByRule}
        generateAbilityByRule={generateAbilityByRule}
      />

      {/* 复制角色模态框 */}
      <dialog className={`modal ${isCloneModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">复制角色</h3>

          {/* 类型切换按钮 */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setCloneTargetType("dicer")}
              className={`btn flex-1 ${cloneTargetType === "dicer" ? "btn-primary" : "btn-outline"}`}
            >
              <DiceD6Icon className="w-4 h-4 mr-1" />
              复制为骰娘
            </button>
            <button
              type="button"
              onClick={() => setCloneTargetType("normal")}
              className={`btn flex-1 ${cloneTargetType === "normal" ? "btn-primary" : "btn-outline"}`}
            >
              <RoleListIcon className="w-4 h-4 mr-1" />
              复制为普通角色
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text">角色名称</span>
              </label>
              <input
                type="text"
                value={cloneName}
                onChange={(e) => {
                  setCloneName(e.target.value);
                  setIsCloneNameEdited(true); // 标记名称已被手动编辑
                }}
                className="input input-bordered w-full"
                placeholder="输入新角色名称"
              />
            </div>

            <div>
              <label className="label">
                <span className="label-text">角色描述</span>
              </label>
              <textarea
                value={cloneDescription}
                onChange={e => setCloneDescription(e.target.value)}
                className="textarea textarea-bordered w-full h-24"
                placeholder="输入新角色描述"
              />
            </div>

            {/* 固定高度提示区域，避免切换时高度变化 */}
            <div className="min-h-15">
              {cloneTargetType !== (isDiceMaiden ? "dicer" : "normal") && (
                <div className="alert alert-info">
                  <InfoIcon className="stroke-current shrink-0 h-6 w-6" />
                  <span>跨类型复制时，能力数据不会被复制。</span>
                </div>
              )}
            </div>
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={() => {
                setIsCloneModalOpen(false);
                setCloneName("");
                setCloneDescription("");
                setIsCloneNameEdited(false);
              }}
              className="btn"
              disabled={isCloning}
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                await handleCloneRole();
                setCloneName("");
                setCloneDescription("");
                setIsCloneNameEdited(false);
              }}
              className="btn btn-primary"
              disabled={isCloning || !cloneName.trim()}
            >
              {isCloning
                ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      复制中...
                    </>
                  )
                : (
                    "确认复制"
                  )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button
            type="button"
            onClick={() => setIsCloneModalOpen(false)}
            disabled={isCloning}
          >
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}
