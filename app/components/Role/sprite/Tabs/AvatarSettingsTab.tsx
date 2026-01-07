import type { MoodRegulatorHandle } from "@/components/common/MoodRegulator";
import type { RoleAvatar } from "api";
import { CollapsibleAlert } from "@/components/common/CollapsibleAlert";
import MoodRegulator from "@/components/common/MoodRegulator";
import { useUpdateRoleAvatarMutation } from "api/hooks/RoleAndAvatarHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

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

  // 情绪调节器兜底标签
  const DEFAULT_MOOD_LABELS = useMemo(
    () => ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"],
    [],
  );

  // 根据当前选中头像的情绪键生成 labels
  const moodLabels = useMemo(() => {
    const keys = Object.keys(avatarTitleRecord);
    return keys.length > 0 ? keys : DEFAULT_MOOD_LABELS;
  }, [avatarTitleRecord, DEFAULT_MOOD_LABELS]);

  // 内部暂存的情绪值（用于应用按钮）
  const [pendingMoodMap, setPendingMoodMap] = useState<Record<string, string>>({});

  // 同步情绪调节器值（当切换立绘时）
  useEffect(() => {
    if (currentAvatar) {
      setPendingMoodMap(avatarTitleRecord);
      setEditingName(avatarTitleRecord.label || "");
      moodControlRef.current?.setValue(avatarTitleRecord);
    }
  }, [currentAvatar, avatarTitleRecord]);

  // 情绪变更回调（仅更新本地暂存）
  const handleMoodChange = useCallback((moodMap: Record<string, string>) => {
    // 保留可能存在的 label 等非情绪字段，避免被 moodMap 覆盖丢失
    setPendingMoodMap(prev => ({ ...prev, ...moodMap }));
  }, []);

  // 应用情感设定到选中的头像
  const handleApplyMood = useCallback(async () => {
    if (currentAvatar?.avatarId) {
      const nextAvatarTitle: Record<string, string> = {
        ...avatarTitleRecord,
        ...pendingMoodMap,
        label: editingName.trim() || avatarTitleRecord.label || "未命名",
      };

      try {
        await updateAvatar({
          ...currentAvatar,
          roleId: currentAvatar.roleId ?? currentSpriteAvatar?.roleId,
          avatarTitle: nextAvatarTitle,
        });
        toast.success("头像设置已保存");
      }
      catch (error) {
        console.error("更新情感设定失败:", error);
        toast.error("保存失败，请稍后重试");
      }
    }
  }, [currentAvatar, currentSpriteAvatar, pendingMoodMap, editingName, updateAvatar, avatarTitleRecord]);

  const avatarDisplayUrl = useMemo(() => {
    if (!currentAvatar)
      return "";
    return currentAvatar.avatarUrl || currentAvatar.spriteUrl || currentAvatar.originUrl || "";
  }, [currentAvatar]);

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="flex justify-between items-center mb-2 flex-shrink-0 min-h-8">
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
                    <div className="flex-shrink-0">
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
                        <label className="font-semibold flex-shrink-0">头像标题</label>
                        <input
                          className="input input-md input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
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
                      message="提示：情感参数用于导出后的 AI 语音情感。"
                      defaultExpanded={true}
                    />
                    <MoodRegulator
                      controlRef={moodControlRef}
                      onChange={handleMoodChange}
                      labels={moodLabels}
                      defaultValue={Object.keys(avatarTitleRecord).length ? avatarTitleRecord : undefined}
                      fallbackDefaultLabels={true}
                    />
                  </div>
                </div>
              )
            : (
                <div className="flex flex-col items-center justify-center h-full text-base-content/50">
                  <svg className="w-16 h-16 mb-2 opacity-50" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 19v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p>请从左侧选择一个头像</p>
                </div>
              )}
        </div>
      </div>

      {/* 应用按钮 */}
      <div className="mt-4 flex justify-end gap-2 flex-shrink-0">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApplyMood}
          disabled={!currentAvatar || isSaving}
        >
          {isSaving ? "保存中..." : "应用设置"}
        </button>
      </div>
    </div>
  );
}
