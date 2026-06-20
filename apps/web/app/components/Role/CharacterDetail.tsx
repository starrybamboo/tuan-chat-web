import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";
import { invalidateDicerRoleResolveCache } from "@/components/common/dicer/utils/utils";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";
import { CloseIcon, SlidersIcon } from "@/icons";
import {
  useAbilityByRuleAndRole,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useGetRoleAvatarsQuery, useGetRoleQuery, useUpdateAvatarNameMutation, useUpdateRoleWithLocalMutation } from "api/hooks/RoleAndAvatarHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";

// import type { Transform } from "./sprite/TransformControl";
import type { Role } from "./types";

import CharacterDetailLeftPanelHorizontal from "./CharacterDetailLeftPanelHorizontal";
import DiceMaidenLinkModal from "./DiceMaidenLinkModal";
import AudioUploadModal from "./RoleInfoCard/AudioUploadModal";
import { buildRoleVoiceClearPatch, buildRoleVoiceUploadPatch } from "./roleVoiceMedia";
import DicerConfigJsonModal from "./rules/DicerConfigJsonModal";
import ExpansionModule from "./rules/ExpansionModule";
import RulesSection from "./rules/RulesSection";
import { getEffectiveAvatarThumbUrl, getEffectiveAvatarUrl, getEffectiveSpriteUrl } from "./sprite/utils";
// import Section from "./Section";

type CharacterDetailProps = {
  role: Role;
  onSave: (updatedRole: Role) => void;
  selectedRuleId: number;
  onRuleChange: (newRuleId: number) => void;
  layout?: "page" | "popup";
  canKickOut?: boolean;
  onKickOut?: () => void;
}

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
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
  // 头像选择状态 - 只保留 ID,URL 通过计算得出
  const [selectedAvatarIdOverride, setSelectedAvatarIdOverride] = useState<number | null>(null);

  // 获取角色所有头像
  const { data: roleAvatarsResponse, isLoading: isQueryLoading } = useGetRoleAvatarsQuery(role.id);
  // 获取最新角色数据（用于判断类型）
  const { data: currentRoleData } = useGetRoleQuery(role.id);
  const queryClient = useQueryClient();

  const displayRole = useMemo<Role>(() => {
    const queriedRole = currentRoleData?.data;
    if (!queriedRole) {
      return role;
    }

    return {
      ...role,
      name: queriedRole.roleName ?? role.name,
      description: queriedRole.description ?? role.description,
      avatarId: queriedRole.avatarId ?? role.avatarId,
      type: queriedRole.type ?? role.type,
      voiceFileId: Object.prototype.hasOwnProperty.call(queriedRole, "voiceFileId") ? queriedRole.voiceFileId : role.voiceFileId,
      extra: queriedRole.extra ?? role.extra,
    };
  }, [currentRoleData?.data, role]);

  // 获取当前关联的骰娘ID
  const currentDicerRoleId = useMemo(() => {
    const extra = displayRole.extra;
    if (!extra || !extra.dicerRoleId)
      return undefined;
    const id = Number(extra.dicerRoleId);
    return (Number.isNaN(id) || id <= 0) ? undefined : id;
  }, [displayRole.extra]);

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
    const selectedAvatarId = selectedAvatarIdOverride ?? displayRole.avatarId;
    const avatarFromList = (
      selectedAvatarId && selectedAvatarId !== 0
    )
      ? roleAvatars.find(item => item.avatarId === selectedAvatarId)
      : undefined;

    return {
      selectedAvatarUrl: getEffectiveAvatarUrl(avatarFromList) || displayRole.avatar || ROLE_DEFAULT_AVATAR_URL,
      selectedSpriteUrl: getEffectiveSpriteUrl(avatarFromList),
    };
  }, [displayRole.avatar, displayRole.avatarId, roleAvatars, selectedAvatarIdOverride]);
  const selectedAvatarId = selectedAvatarIdOverride ?? displayRole.avatarId;
  // 描述的最大储存量
  const MAX_DESCRIPTION_LENGTH = 140;
  const MAX_ROLE_NAME_LENGTH = 50;

  // 已由SpriteRenderStudio内部管理transform相关状态

  // 规则选择状态 - 使用 searchParams 替代 state
  // const [searchParams] = useSearchParams();
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false); // 规则选择弹窗状态
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false); // 音频上传弹窗状态
  const [isStImportModalOpen, setIsStImportModalOpen] = useState(false); // ST导入弹窗状态
  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false); // 骰娘关联弹窗状态
  const [isDicerConfigJsonModalOpen, setIsDicerConfigJsonModalOpen] = useState(false); // 骰娘配置JSON弹窗状态

  // 获取当前规则详情
  const { data: currentRuleData } = useRuleDetailQuery(selectedRuleId);

  // 获取骰娘文案配置数据
  const abilityQuery = useAbilityByRuleAndRole(role.id, selectedRuleId || 0);
  const { mutate: updateFieldAbility } = useUpdateRoleAbilityByRoleIdMutation();

  // 接口部分
  // 发送post数据部分,保存角色数据
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave);
  const updateAvatarNameMutation = useUpdateAvatarNameMutation(role.id);

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
      roleId: displayRole.id,
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
      roleId: displayRole.id,
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
    const newExtra = { ...displayRole.extra };

    if (dicerRoleId === 0) {
      // 清除绑定
      delete newExtra.dicerRoleId;
    }
    else {
      // 设置或更新绑定
      newExtra.dicerRoleId = String(dicerRoleId);
    }

    const updatedRole = {
      ...displayRole,
      extra: newExtra,
    };

    // 使用updateRole保存到后端
    updateRole(updatedRole, {
      onSuccess: () => {
        invalidateDicerRoleResolveCache();
      },
      onError: (error) => {
        console.error("保存骰娘关联失败:", error);
      },
    });
  };

  // 处理音频上传成功
  const handleAudioUploadSuccess = (audio: { voiceFileId: number; mediaType?: string | null }) => {
    // 新上传只持久化 fileId。
    const updatedRole = {
      ...displayRole,
      ...buildRoleVoiceUploadPatch(audio),
    };

    // 使用updateRole保存到后端
    updateRole(updatedRole, {
      onError: (error) => {
        console.error("保存角色语音失败:", error);
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

  const buildCleanedRole = (sourceRole: Role) => ({
    ...sourceRole,
    name: cleanText(sourceRole.name),
    description: cleanText(sourceRole.description),
  });

  const saveRoleBase = (nextRole: Role) => {
    const cleanedRole = buildCleanedRole(nextRole);
    updateRole(cleanedRole, {
      onError: (error) => {
        toast.error(`角色保存失败：${getMutationErrorMessage(error, "请稍后重试")}`);
      },
    });
  };

  // 更新url和avatarId,方便更改服务器数据
  const handleAvatarChange = (previewUrl: string, avatarId: number) => {
    const selectedAvatar = roleAvatars.find(item => item.avatarId === avatarId);
    const nextAvatarUrl = getEffectiveAvatarUrl(selectedAvatar) || previewUrl;
    const nextAvatarThumb = getEffectiveAvatarThumbUrl(selectedAvatar) || nextAvatarUrl;
    const updatedRole = {
      ...displayRole,
      avatar: nextAvatarUrl,
      avatarThumb: nextAvatarThumb,
      avatarId,
    };
    setSelectedAvatarIdOverride(avatarId); // 更新选中ID,URL会自动通过useMemo计算
    const cleanedRole = buildCleanedRole(updatedRole);
    updateRole(cleanedRole);
  };

  // 处理头像选择 - 简化为只更新ID
  const handleAvatarSelect = (avatarId: number) => {
    setSelectedAvatarIdOverride(avatarId);
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
      setSelectedAvatarIdOverride(0);
    }
  };

  // 处理头像上传
  const handleAvatarUpload = (_data: any) => {
    // 上传完成后由查询缓存自动刷新，这里不再输出调试日志
  };

  const handleAvatarTitleSave = (avatarId: number, title: string) => {
    const targetAvatar = roleAvatars.find(avatar => avatar.avatarId === avatarId);
    if (!targetAvatar) {
      return;
    }
    updateAvatarNameMutation.mutate({
      avatar: targetAvatar,
      name: title,
    });
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
              <div className="
                card-sm
                md:card-xl
                bg-base-100 shadow-xs
                md:rounded-xl md:border-2
                border-base-content/10
              ">
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
              roleId={displayRole.id}
              ruleId={selectedRuleId}
              isStImportModalOpen={isStImportModalOpen}
              onStImportModalClose={() => setIsStImportModalOpen(false)}
              onOpenStImportModal={() => setIsStImportModalOpen(true)}
            />
          )}
    </>
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden p-4">

      {/* 顶部头部区域 */}
      <div className="
        flex flex-col gap-2
        md:flex-row md:items-center md:justify-between md:gap-3
      ">
        <div className="
          flex w-full items-start justify-between gap-2 px-6
          md:w-auto md:items-center md:justify-start md:gap-4 md:px-0
        ">
          {layout !== "popup" && (
            <Link to="/role" type="button" className="
              hidden
              md:inline-flex
              btn btn-lg btn-outline rounded-md btn-ghost
            ">
              ← 返回
            </Link>
          )}
          <div className="
            order-1 hidden min-w-0
            md:order-0 md:block md:flex-none
          ">
            <h1 className="md:my-2">
              <DoubleClickEditableText
                value={displayRole.name ?? ""}
                onCommit={nextName => saveRoleBase({ ...displayRole, name: nextName })}
                trigger="click"
                commitOnBlur
                commitOnEnter
                invalidBehavior="keepEditing"
                placeholder="未命名角色"
                validate={nextName => nextName.length > MAX_ROLE_NAME_LENGTH ? `角色名称不能超过${MAX_ROLE_NAME_LENGTH}字` : null}
                inputProps={{
                  maxLength: MAX_ROLE_NAME_LENGTH,
                  "aria-label": "角色名称",
                }}
                className="block min-w-0"
                displayClassName="
                  block max-w-[min(46vw,36rem)] truncate rounded-md px-1 py-0.5
                  text-2xl font-semibold text-base-content transition-colors
                  hover:bg-base-200/70 hover:text-primary
                  md:text-3xl
                "
                inputClassName="
                  w-[min(46vw,36rem)] max-w-full rounded-md border
                  border-base-content/15 bg-base-100 px-2 py-1
                  text-2xl font-semibold text-base-content
                  md:text-3xl
                "
              />
            </h1>
          </div>
          <div className="
            order-2 flex shrink-0 items-center gap-1.5
            md:order-0 md:gap-2
          ">
            {layout === "popup"
              ? (
                  <button
                    type="button"
                    className="
                      btn btn-error btn-sm
                      md:btn-lg
                      rounded-md
                      md:mr-4
                    "
                    onClick={onKickOut}
                    disabled={!canKickOut}
                  >
                    踢出角色
                  </button>
                )
              : isDiceMaiden && (
                <div className="
                  tooltip tooltip-bottom
                  md:hidden
                " data-tip="查看和导出骰娘文案配置的JSON格式">
                  <button
                    type="button"
                    onClick={() => setIsDicerConfigJsonModalOpen(true)}
                    className="
                      btn rounded-lg bg-info/70 text-info-content btn-md px-4
                    "
                  >
                    配置
                  </button>
                </div>
              )}
          </div>
        </div>
        <div className={`
          ${layout === "popup" ? "flex" : `
            hidden
            md:flex
          `}
          w-full items-center justify-center gap-1.5
          md:w-auto md:justify-end md:gap-2
        `}>
          <div className="
            hidden rounded-lg border border-base-content/10 bg-base-100/50
            px-3 py-1.5 font-mono text-sm text-base-content/70
            md:block
          ">
            id:
            {" "}
            {displayRole.id}
          </div>
          {isDiceMaiden && (
            <div className="
              tooltip tooltip-bottom hidden
              md:block
            " data-tip="查看和导出骰娘文案配置的JSON格式">
              <button
                type="button"
                onClick={() => setIsDicerConfigJsonModalOpen(true)}
                className="
                  btn rounded-lg bg-info/70 text-info-content btn-sm
                  md:btn-lg
                "
              >
                <span className="flex items-center gap-1">
                  <SlidersIcon className="size-4" />
                  配置
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="
        md:hidden
        divider my-0
      "></div>
      <div className="
        max-md:hidden
        divider
      "></div>
      {layout === "popup"
        ? (
            <div className="space-y-6">
              <CharacterDetailLeftPanelHorizontal
                isQueryLoading={isQueryLoading}
                isDiceMaiden={isDiceMaiden}
                localRole={displayRole}
                roleAvatars={roleAvatars}
                selectedAvatarId={selectedAvatarId}
                selectedAvatarUrl={selectedAvatarUrl}
                selectedSpriteUrl={selectedSpriteUrl}
                maxDescriptionLength={MAX_DESCRIPTION_LENGTH}
                maxRoleNameLength={MAX_ROLE_NAME_LENGTH}
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
                onAvatarTitleSave={handleAvatarTitleSave}
                onBaseRoleSave={saveRoleBase}
                onAudioRoleUpdate={updatedRole => updateRole(updatedRole)}
                onAudioDelete={() => {
                  const updatedRole = { ...displayRole, ...buildRoleVoiceClearPatch() };
                  updateRole(updatedRole);
                }}
              />
              <div className="space-y-6">
                {rightPanel}
              </div>
            </div>
          )
        : (
            <div className="space-y-6">
              <CharacterDetailLeftPanelHorizontal
                isQueryLoading={isQueryLoading}
                isDiceMaiden={isDiceMaiden}
                localRole={displayRole}
                roleAvatars={roleAvatars}
                selectedAvatarId={selectedAvatarId}
                selectedAvatarUrl={selectedAvatarUrl}
                selectedSpriteUrl={selectedSpriteUrl}
                maxDescriptionLength={MAX_DESCRIPTION_LENGTH}
                maxRoleNameLength={MAX_ROLE_NAME_LENGTH}
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
                onAvatarTitleSave={handleAvatarTitleSave}
                onBaseRoleSave={saveRoleBase}
                onAudioRoleUpdate={updatedRole => updateRole(updatedRole)}
                onAudioDelete={() => {
                  const updatedRole = { ...displayRole, ...buildRoleVoiceClearPatch() };
                  updateRole(updatedRole);
                }}
              />
              <div className="space-y-6">
                {rightPanel}
              </div>
            </div>
          )}

      {/* 规则选择弹窗 */}
      {isRuleModalOpen && (
        <div className="
          fixed inset-0 z-50 flex items-center justify-center bg-black/50
        " onClick={() => setIsRuleModalOpen(false)}>
          <div className="
            bg-base-100 rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh]
            overflow-auto
          " onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">选择规则系统</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => setIsRuleModalOpen(false)}
                >
                  <CloseIcon className="size-4" />
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

    </div>
  );
}
