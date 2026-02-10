import type { RoleAvatar } from "api";
import type { MoodRegulatorHandle } from "@/components/common/MoodRegulator";
import { UserCircle } from "@phosphor-icons/react";
import { useUpdateRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CollapsibleAlert } from "@/components/common/CollapsibleAlert";
import MoodRegulator from "@/components/common/MoodRegulator";

interface AvatarSettingsTabProps {
  /** 有立绘的头像列表 */
  spritesAvatars: RoleAvatar[];
  /** 完整的角色头像列表（包含情感数据） */
  roleAvatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 应用完成后的回调（用于关闭弹窗等） */
  onApply?: () => void;
}

/**
 * 情感设定 Tab 内容组件
 * 使用外部（左侧）的头像列表，显示情绪调节器
 */
export function AvatarSettingsTab({
  spritesAvatars,
  roleAvatars,
  selectedIndex,
}: AvatarSettingsTabProps) {
  // 当前选中的头像（从完整列表中根据 spritesAvatars 的 avatarId 查找）
  const currentSpriteAvatar = spritesAvatars[selectedIndex];
  const currentAvatar = useMemo(() => {
    if (!currentSpriteAvatar)
      return null;
    return roleAvatars.find(a => a.avatarId === currentSpriteAvatar.avatarId) || currentSpriteAvatar;
  }, [roleAvatars, currentSpriteAvatar]);
  // 头像标题设置
  const [editingName, setEditingName] = useState("");
  const DEFAULT_CATEGORY = "默认";
  const [editingCategory, setEditingCategory] = useState("");
  const moodControlRef = useRef<MoodRegulatorHandle | null>(null);
  const roleIdForMutation = currentAvatar?.roleId ?? currentSpriteAvatar?.roleId ?? 0;
  const { mutateAsync: updateAvatar, isPending: isSaving } = useUpdateRoleAvatarMutation(roleIdForMutation);
  const avatarTitleRecord = useMemo<Record<string, string>>(() => {
    if (!currentAvatar?.avatarTitle)
      return {};
    if (typeof currentAvatar.avatarTitle === "string") {
      return { label: currentAvatar.avatarTitle };
    }
    return currentAvatar.avatarTitle as Record<string, string>;
  }, [currentAvatar]);
  const normalizedAvatarTitleRecord = useMemo<Record<string, string>>(() => {
    if (Object.keys(avatarTitleRecord).length === 0) {
      return avatarTitleRecord;
    }
    const normalized = { ...avatarTitleRecord };
    // 兼容历史错误键名（ϲ/ŭ），避免已有数据丢失
    if (normalized["喜"] == null && normalized["ϲ"] != null) {
      normalized["喜"] = normalized["ϲ"];
    }
    if (normalized["怒"] == null && normalized["ŭ"] != null) {
      normalized["怒"] = normalized["ŭ"];
    }
    return normalized;
  }, [avatarTitleRecord]);
  // 情绪调节器兜底标签
  const DEFAULT_MOOD_LABELS = useMemo(
    () => ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"],
    [],
  );

  // 固定情感标签为默认 8 个
  const moodLabels = DEFAULT_MOOD_LABELS;

  // 内部暂存的情绪值（用于应用按钮）
  const [pendingMoodMap, setPendingMoodMap] = useState<Record<string, string>>({});

  // 同步情绪调节器值（当切换立绘时）
  useEffect(() => {
    if (currentAvatar) {
      const defaultMoodMap: Record<string, string> = {};
      moodLabels.forEach((label) => {
        defaultMoodMap[label] = normalizedAvatarTitleRecord[label] || "";
      });
      setPendingMoodMap({ ...defaultMoodMap, label: normalizedAvatarTitleRecord.label || "" });
      setEditingName(normalizedAvatarTitleRecord.label || "");
      setEditingCategory(currentAvatar.category?.trim() || DEFAULT_CATEGORY);
      moodControlRef.current?.setValue(defaultMoodMap);
    }
  }, [currentAvatar, normalizedAvatarTitleRecord, moodLabels, DEFAULT_CATEGORY]);

  // 情绪变更回调（仅更新本地暂存）
  const handleMoodChange = useCallback((moodMap: Record<string, string>) => {
    // 保留可能存在的 label 等非情绪字段，避免被 moodMap 覆盖丢失
    setPendingMoodMap(prev => ({ ...prev, ...moodMap }));
  }, []);

  // 应用情感设定到选中的头像
  const handleApplyMood = useCallback(async () => {
    if (currentAvatar?.avatarId) {
      const moodKeySet = new Set(moodLabels);
      const baseMood: Record<string, string> = {};
      moodKeySet.forEach((key) => {
        baseMood[key] = normalizedAvatarTitleRecord[key] || "";
      });

      const nextMoodMap: Record<string, string> = { ...baseMood };
      Object.entries(pendingMoodMap).forEach(([key, value]) => {
        if (moodKeySet.has(key))
          nextMoodMap[key] = value;
      });

      const nextAvatarTitle: Record<string, string> = {
        ...nextMoodMap,
        label: editingName.trim() || normalizedAvatarTitleRecord.label || "未命名",
      };
      const nextCategory = editingCategory.trim() || DEFAULT_CATEGORY;

      try {
        await updateAvatar({
          ...currentAvatar,
          roleId: currentAvatar.roleId ?? currentSpriteAvatar?.roleId,
          avatarTitle: nextAvatarTitle,
          category: nextCategory,
        });
        toast.success("头像设置已保存");
      }
      catch (error) {
        console.error("更新情感设定失败:", error);
        toast.error("保存失败，请稍后重试");
      }
    }
  }, [currentAvatar, currentSpriteAvatar, pendingMoodMap, editingName, editingCategory, updateAvatar, normalizedAvatarTitleRecord, moodLabels]);

  const avatarDisplayUrl = useMemo(() => {
    if (!currentAvatar)
      return "";
    return currentAvatar.avatarUrl || currentAvatar.spriteUrl || currentAvatar.originUrl || "";
  }, [currentAvatar]);

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="flex justify-between items-center mb-2 shrink-0 min-h-8">
        <h3 className="text-lg font-semibold">头像设置</h3>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 relative bg-base-200 rounded-lg overflow-hidden">
        <div className="absolute inset-0 overflow-auto p-4">
          {currentAvatar
            ? (
                <div className="flex flex-col gap-4">
                  {/* 头像展示 + 标题表单 */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="shrink-0">
                      {avatarDisplayUrl
                        ? (
                            <img
                              src={avatarDisplayUrl}
                              alt="头像预览"
                              className="w-32 h-32 rounded-lg object-contain bg-base-200"
                              loading="lazy"
                              decoding="async"
                            />
                          )
                        : (
                            <div className="w-32 h-32 rounded-lg bg-base-200 flex items-center justify-center text-base-content/50">
                              暂无图片
                            </div>
                          )}
                    </div>

                    <div className="flex flex-col gap-4 w-full sm:max-w-sm min-w-0 min-h-32">
                      <div className="flex flex-col gap-2">
                        <label className="font-semibold shrink-0" htmlFor="avatar-title">
                          头像标题
                        </label>
                        <input
                          id="avatar-title"
                          className="input input-md input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          placeholder="请输入头像标题"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-semibold shrink-0" htmlFor="avatar-category">
                          头像分类
                        </label>
                        <input
                          id="avatar-category"
                          className="input input-md input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={editingCategory}
                          onChange={e => setEditingCategory(e.target.value)}
                          placeholder="请输入分类"
                        />
                      </div>
                      <div className="text-xs font-mono text-base-content/70 mt-auto">
                        头像ID：
                        <span className="text-xs font-mono">{currentAvatar.avatarId ?? "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="divider my-2" />
                  {/* 情感参数（头像设置的一部分） */}
                  <div className="flex flex-col gap-4">
                    <div className="font-semibold">情感参数</div>
                    <CollapsibleAlert
                      type="info"
                      message="提示：情感参数用于webgal导出后，确定的 AI 朗读的情感"
                      defaultExpanded={true}
                    />
                    <MoodRegulator
                      controlRef={moodControlRef}
                      onChange={handleMoodChange}
                      labels={moodLabels}
                      defaultValue={Object.keys(normalizedAvatarTitleRecord).length ? normalizedAvatarTitleRecord : undefined}
                      fallbackDefaultLabels={true}
                    />
                  </div>
                </div>
              )
            : (
                <div className="flex flex-col items-center justify-center h-full text-base-content/50">
                  <UserCircle className="w-16 h-16 mb-2 opacity-50" weight="duotone" aria-hidden="true" />
                  <p>请从左侧选择一个头像</p>
                </div>
              )}
        </div>
      </div>

      {/* 应用按钮 */}
      <div className="mt-4 flex justify-end gap-2 shrink-0">
        <button
          type="button"
          className="btn btn-primary rounded-md"
          onClick={handleApplyMood}
          disabled={!currentAvatar || isSaving}
        >
          {isSaving ? "保存中..." : "应用设置"}
        </button>
      </div>
    </div>
  );
}
