import type { MoodRegulatorHandle } from "@/components/common/MoodRegulator";
import type { RoleAvatar } from "api";
import MoodRegulator from "@/components/common/MoodRegulator";
import { useUpdateAvatarTitleMutation } from "api/hooks/RoleAndAvatarHooks";
import { tuanchat } from "api/instance";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface MoodSettingsTabProps {
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
export function MoodSettingsTab({
  spritesAvatars,
  roleAvatars,
  selectedIndex,
  onApply,
}: MoodSettingsTabProps) {
  // 当前选中的头像（从完整列表中根据 spritesAvatars 的 avatarId 查找）
  const currentSpriteAvatar = spritesAvatars[selectedIndex];
  const currentAvatar = useMemo(() => {
    if (!currentSpriteAvatar)
      return null;
    return roleAvatars.find(a => a.avatarId === currentSpriteAvatar.avatarId) || currentSpriteAvatar;
  }, [roleAvatars, currentSpriteAvatar]);

  const { mutate: updateAvatarTitle } = useUpdateAvatarTitleMutation(currentAvatar?.roleId || 0);
  // 头像名编辑相关状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState("");
  const moodControlRef = useRef<MoodRegulatorHandle | null>(null);

  // 情绪调节器兜底标签
  const DEFAULT_MOOD_LABELS = useMemo(
    () => ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"],
    [],
  );

  // 根据当前选中头像的情绪键生成 labels
  const moodLabels = useMemo(() => {
    const keys = Object.keys((currentAvatar?.avatarTitle as Record<string, string>) || {});
    return keys.length > 0 ? keys : DEFAULT_MOOD_LABELS;
  }, [currentAvatar, DEFAULT_MOOD_LABELS]);

  // 内部暂存的情绪值（用于应用按钮）
  const [pendingMoodMap, setPendingMoodMap] = useState<Record<string, string>>({});

  // 同步情绪调节器值（当切换立绘时）
  useEffect(() => {
    if (currentAvatar) {
      const t = (currentAvatar.avatarTitle as Record<string, string>) || {};
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setPendingMoodMap(t);
      moodControlRef.current?.setValue(t);
    }
  }, [currentAvatar]);

  // 情绪变更回调（仅更新本地暂存）
  const handleMoodChange = useCallback((moodMap: Record<string, string>) => {
    setPendingMoodMap(moodMap);
  }, []);

  // 应用情感设定到选中的头像
  const handleApplyMood = useCallback(async () => {
    if (currentAvatar?.roleId && currentAvatar?.avatarId) {
      // 直接调用 API 更新整个 avatarTitle 对象
      const res = await tuanchat.avatarController.updateRoleAvatar({
        ...currentAvatar,
        avatarTitle: pendingMoodMap,
      });

      if (res.success) {
        console.warn("更新情感设定成功");
      }
    }
    // 应用后关闭弹窗
    onApply?.();
  }, [currentAvatar, pendingMoodMap, onApply]);

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">调整语音参数</h3>
        {currentAvatar && (
          <div className="text-sm text-base-content/70 flex items-center gap-2">
            <span>当前头像：</span>
            {isEditingName
              ? (
                  <>
                    <input
                      className="input input-xs input-bordered min-w-0 w-24 text-center"
                      value={editingName}
                      autoFocus
                      maxLength={16}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (currentAvatar?.avatarId) {
                            updateAvatarTitle({
                              avatarId: currentAvatar.avatarId,
                              title: editingName.trim() || "未命名",
                              avatarsForUpdate: roleAvatars,
                            });
                            setIsEditingName(false);
                          }
                        }
                        else if (e.key === "Escape") {
                          setIsEditingName(false);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      onClick={() => {
                        if (currentAvatar?.avatarId) {
                          updateAvatarTitle({
                            avatarId: currentAvatar.avatarId,
                            title: editingName.trim() || "未命名",
                            avatarsForUpdate: roleAvatars,
                          });
                          setIsEditingName(false);
                        }
                      }}
                      title="保存"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => setIsEditingName(false)}
                      title="取消"
                    >
                      ✕
                    </button>
                  </>
                )
              : (
                  <button
                    type="button"
                    className="text-base-content/70 hover:text-primary transition-colors truncate max-w-[120px] text-ellipsis text-left"
                    title="点击编辑头像名"
                    onClick={() => {
                      setEditingName(currentAvatar.avatarTitle?.label || "");
                      setIsEditingName(true);
                    }}
                  >
                    {currentAvatar.avatarTitle?.label || "未命名"}
                  </button>
                )}
          </div>
        )}
      </div>

      {/* 情绪调节器区域 */}
      <div className="flex-1 min-h-0 overflow-auto bg-base-200/50 rounded-lg p-4">
        {currentAvatar
          ? (
              <MoodRegulator
                controlRef={moodControlRef}
                onChange={handleMoodChange}
                labels={moodLabels}
                defaultValue={(currentAvatar?.avatarTitle as Record<string, string>) || undefined}
                fallbackDefaultLabels={true}
              />
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

      {/* 应用按钮 */}
      <div className="mt-4 flex justify-end gap-2 flex-shrink-0">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleApplyMood}
          disabled={!currentAvatar}
        >
          应用情感设定
        </button>
      </div>
    </div>
  );
}
