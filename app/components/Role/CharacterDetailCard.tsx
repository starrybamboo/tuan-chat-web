// import type { Transform } from "./sprite/TransformControl";
import type { Role } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import { useAbilityByRuleAndRole, useUpdateRoleAbilityByRoleIdMutation } from "api/hooks/abilityQueryHooks";
import { useCopyRoleMutation, useGetRoleAvatarsQuery, useGetRoleQuery, useUpdateRoleWithLocalMutation } from "api/hooks/RoleAndAvatarHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { ChevronRightIcon, CloseIcon, DiceD6Icon, DiceFiveIcon, EditIcon, GearOutline, InfoIcon, MicrophoneIcon, RoleListIcon, SaveIcon, SlidersIcon } from "app/icons";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useOutletContext } from "react-router";
import DiceMaidenLinkModal from "./DiceMaidenLinkModal";
import AudioPlayer from "./RoleInfoCard/AudioPlayer";
import AudioUploadModal from "./RoleInfoCard/AudioUploadModal";
import CharacterAvatar from "./RoleInfoCard/CharacterAvatar";
import DicerConfigJsonModal from "./rules/DicerConfigJsonModal";
import ExpansionModule from "./rules/ExpansionModule";
import RulesSection from "./rules/RulesSection";
// import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  onSave: (updatedRole: Role) => void;
  selectedRuleId: number;
  onRuleChange: (newRuleId: number) => void;
  className?: string;
}

export default function CharacterDetailCard(props: CharacterDetailProps) {
  return <CharacterDetailCardInner key={props.role.id} {...props} />;
}
/**
 * 角色详情卡片组件
 */
function CharacterDetailCardInner({
  role,
  onSave,
  selectedRuleId,
  onRuleChange,
  className,
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

  return (
    <div
      className={`bg-base-100 border border-base-200 rounded-xl shadow-sm p-3 sm:p-4 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate min-w-0">
                {localRole.name || "未命名角色"}
              </h1>
              <span className="badge badge-outline badge-xs font-mono">
                ID
                {" "}
                {localRole.id}
              </span>
            </div>
            <p className="text-xs text-base-content/60">
              {isDiceMaiden ? "骰娘展示" : "角色展示"}
              {" "}
              ·
              {" "}
              {currentRuleData?.ruleName || "未选择规则"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Link to="/role" type="button" className="btn btn-ghost btn-xs">
              角色页
            </Link>
            {!isDiceMaiden && (
              <button
                type="button"
                onClick={() => setIsStImportModalOpen(true)}
                className="btn btn-secondary btn-xs"
              >
                ST导入
              </button>
            )}
            {isDiceMaiden && (
              <button
                type="button"
                onClick={() => setIsDicerConfigJsonModalOpen(true)}
                className="btn btn-info btn-xs"
              >
                <span className="flex items-center gap-1">
                  <SlidersIcon className="w-3.5 h-3.5" />
                  配置
                </span>
              </button>
            )}
            {isEditing
              ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`btn btn-primary btn-xs ${isTransitioning ? "scale-95" : ""}`}
                    disabled={isTransitioning}
                  >
                    {isTransitioning
                      ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        )
                      : (
                          <span className="flex items-center gap-1">
                            <SaveIcon className="w-3.5 h-3.5" />
                            保存
                          </span>
                        )}
                  </button>
                )
              : (
                  <button type="button" onClick={() => setIsEditing(true)} className="btn btn-accent btn-xs">
                    <span className="flex items-center gap-1">
                      <EditIcon className="w-3.5 h-3.5" />
                      编辑
                    </span>
                  </button>
                )}
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg border border-base-200 bg-base-100 p-2 sm:p-3">
            <div className="flex justify-center">
              {isQueryLoading
                ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="skeleton w-20 h-20 rounded-full"></div>
                      <div className="skeleton h-3 w-16"></div>
                    </div>
                  )
                : (
                    <CharacterAvatar
                      role={localRole} // 当前角色基本信息
                      roleAvatars={roleAvatars} // 当前角色的头像列表
                      selectedAvatarId={selectedAvatarId} // 选中的头像ID
                      selectedAvatarUrl={selectedAvatarUrl}// 选中的头像URL
                      selectedSpriteUrl={selectedSpriteUrl}// 选中的立绘URL
                      avatarSizeClassName="w-36"
                      onchange={handleAvatarChange}// 头像变化的回调
                      onAvatarSelect={handleAvatarSelect} // 头像选择的回调
                      onAvatarDelete={handleAvatarDelete} // 头像删除的回调
                      onAvatarUpload={handleAvatarUpload} // 头像上传的回调
                      useUrlState={false}
                    />
                  )}
            </div>
          </div>

          <div className="flex flex-1 min-w-0 flex-col gap-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-left hover:bg-base-200 transition-colors"
              onClick={handleOpenRuleModal}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <GearOutline className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold">当前规则</h3>
                <p className="text-primary font-medium text-[11px] truncate max-w-35">
                  {currentRuleData?.ruleName || "未选择规则"}
                </p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-base-content/50 ml-auto" />
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-left hover:bg-base-200 transition-colors"
              onClick={handleOpenAudioModal}
            >
              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                <MicrophoneIcon className="w-4 h-4 text-secondary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold">上传音频</h3>
                <p className="text-secondary font-medium text-[11px]">
                  {localRole.voiceUrl ? "已上传音频" : "用于AI生成角色音色"}
                </p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-base-content/50 ml-auto" />
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-base-200 bg-base-100 px-3 py-2 text-left hover:bg-base-200 transition-colors"
              onClick={handleOpenDiceMaidenLinkModal}
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <DiceFiveIcon className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold">关联骰娘</h3>
                <p className={`font-medium text-[11px] ${
                  dicerRoleError ? "text-error" : "text-accent"
                }`}
                >
                  {currentDicerRoleId
                    ? dicerRoleError || linkedDicerRoleData?.data?.roleName || `ID: ${currentDicerRoleId}`
                    : "选择使用的骰娘角色"}
                </p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-base-content/50 ml-auto" />
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-base-200 bg-base-100 p-2">
          {isEditing
            ? (
                <div>
                  <label className="input input-sm rounded-md w-full">
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
                    className="textarea textarea-sm w-full h-20 resize-none mt-3 rounded-md"
                  />
                  <div className="text-right mt-1">
                    <span className={`text-xs font-semibold ${charCount > MAX_DESCRIPTION_LENGTH ? "text-error" : "text-base-content/70"
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
                <p className="text-sm text-base-content/80 wrap-break-words line-clamp-5">
                  {localRole.description || "暂无描述"}
                </p>
              )}
        </div>

        <div className="rounded-lg border border-base-200 bg-base-100 p-2">
          <AudioPlayer
            size="compact"
            role={localRole}
            onRoleUpdate={(updatedRole) => {
              setLocalRole(updatedRole);
              updateRole(updatedRole);
            }}
            onDelete={() => {
              const updatedRole = { ...localRole, voiceUrl: undefined };
              setLocalRole(updatedRole);
              updateRole(updatedRole);
            }}
          />
        </div>

        <div className="rounded-lg border border-base-200 bg-base-100 p-2">
          {isQueryLoading
            ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="skeleton h-8 w-16 rounded-lg"></div>
                    <div className="skeleton h-8 w-16 rounded-lg"></div>
                    <div className="skeleton h-8 w-16 rounded-lg"></div>
                  </div>
                  <div className="skeleton h-24 w-full rounded-lg"></div>
                </div>
              )
            : (
                <ExpansionModule
                  roleId={localRole.id}
                  ruleId={selectedRuleId}
                  isStImportModalOpen={isStImportModalOpen}
                  onStImportModalClose={() => setIsStImportModalOpen(false)}
                  size="small"
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
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <RulesSection
                  currentRuleId={selectedRuleId}
                  onRuleChange={handleRuleChange}
                />
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

      {/* 骰娘配置 JSON 模态框 */}
      <DicerConfigJsonModal
        isOpen={isDicerConfigJsonModalOpen}
        onClose={() => setIsDicerConfigJsonModalOpen(false)}
        copywritingTemplates={abilityQuery.data?.extraCopywriting}
        onReset={handleDicerConfigReset}
        onSave={handleDicerConfigSave}
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
