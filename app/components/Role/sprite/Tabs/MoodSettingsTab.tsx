import type { MoodRegulatorHandle } from "@/components/common/MoodRegulator";
import type { RoleAvatar } from "api";
import MoodRegulator from "@/components/common/MoodRegulator";
import { useUpdateAvatarTitleMutation } from "api/queryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpriteListGrid } from "./SpriteListGrid";

interface MoodSettingsTabProps {
  /** 有立绘的头像列表 */
  spritesAvatars: RoleAvatar[];
  /** 完整的角色头像列表（包含情感数据） */
  roleAvatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 索引变更回调（内部切换） */
  onIndexChange: (index: number) => void;
  /** 应用完成后的回调（用于关闭弹窗等） */
  onApply?: () => void;
}

/**
 * 情感设定 Tab 内容组件
 * 左侧立绘列表，右侧纵向情绪调节器，右下角应用按钮
 */
export function MoodSettingsTab({
  spritesAvatars,
  roleAvatars,
  selectedIndex,
  onIndexChange,
  onApply,
}: MoodSettingsTabProps) {
  const { mutate: updateAvatarTitle } = useUpdateAvatarTitleMutation();
  const moodControlRef = useRef<MoodRegulatorHandle | null>(null);

  // 情绪调节器兜底标签
  const DEFAULT_MOOD_LABELS = useMemo(
    () => ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"],
    [],
  );

  // 当前选中的头像（从完整列表中根据 spritesAvatars 的 avatarId 查找）
  const currentSpriteAvatar = spritesAvatars[selectedIndex];
  const currentAvatar = useMemo(() => {
    if (!currentSpriteAvatar)
      return null;
    return roleAvatars.find(a => a.avatarId === currentSpriteAvatar.avatarId) || currentSpriteAvatar;
  }, [roleAvatars, currentSpriteAvatar]);

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
  const handleApplyMood = useCallback(() => {
    if (currentAvatar?.roleId && currentAvatar?.avatarId) {
      updateAvatarTitle({
        roleId: currentAvatar.roleId,
        avatarId: currentAvatar.avatarId,
        avatarTitle: pendingMoodMap,
      });
    }
    // 应用后关闭弹窗
    onApply?.();
  }, [currentAvatar, pendingMoodMap, updateAvatarTitle, onApply]);

  // 情绪调节器渲染
  const renderMoodRegulator = () => (
    <div className="grid-cols-1">
      <MoodRegulator
        controlRef={moodControlRef}
        onChange={handleMoodChange}
        labels={moodLabels}
        defaultValue={(currentAvatar?.avatarTitle as Record<string, string>) || undefined}
        fallbackDefaultLabels={true}
      />
    </div>
  );

  // 应用按钮渲染
  const renderApplyButton = () => (
    <div className="mt-2 md:mt-4 flex justify-end gap-2 flex-shrink-0">
      <button
        type="button"
        className="btn btn-primary btn-sm md:btn-md"
        onClick={handleApplyMood}
        disabled={!currentAvatar}
      >
        应用情感设定
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      {/* 移动端：情绪调节区域在上方，固定高度 */}
      <div className="md:hidden flex flex-col flex-shrink-0">
        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">调整语音参数</h3>
        <div className="h-56 overflow-auto bg-info/10 rounded-lg p-4 flex-shrink-0">
          {renderMoodRegulator()}
        </div>
        {renderApplyButton()}
      </div>

      {/* 立绘列表 - 移动端可滚动，桌面端固定宽度 */}
      <div className="flex-1 md:w-1/3 md:flex-none flex flex-col min-h-0 border-t md:border-t-0 border-base-300 pt-4 md:pt-0">
        <h3 className="text-lg font-semibold mb-4 flex-shrink-0">选择立绘</h3>
        <div className="flex-1 min-h-0 overflow-auto">
          <SpriteListGrid
            avatars={spritesAvatars}
            selectedIndex={selectedIndex}
            onSelect={onIndexChange}
            className="h-full"
          />
        </div>
      </div>

      {/* 桌面端：右侧情绪调节区域 */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col border-l border-base-300 pl-4">
        <h3 className="text-lg font-semibold mb-4 flex-shrink-0">调整语音参数</h3>
        <div className="flex-1 min-h-0 overflow-auto bg-info/10 rounded-lg p-4">
          {renderMoodRegulator()}
        </div>
        {renderApplyButton()}
      </div>
    </div>
  );
}
