import React, { useEffect, useMemo, useState } from "react";

type RatingCategory = "Gamism" | "Narrativism" | "Simulationism";

interface Ratings {
  Gamism: number;
  Narrativism: number;
  Simulationism: number;
}

interface GNSPreferenceEditorProps {
  initialRatings: Ratings;
  onSave: (ratings: Ratings) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function GNSPreferenceEditor({
  initialRatings,
  onSave,
  onCancel,
  isLoading = false,
}: GNSPreferenceEditorProps) {
  // 本地状态独立于外部传入值
  const [ratings, setRatings] = useState<Ratings>({ ...initialRatings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 如果外部 initialRatings 发生变化（例如重新打开弹窗），重置本地状态
    setRatings({ ...initialRatings });
  }, [initialRatings]);

  const categories: { key: RatingCategory; name: string; desc: string }[] = [
    { key: "Gamism", name: "游戏性 (G)", desc: "追求挑战、竞争和策略" },
    { key: "Narrativism", name: "叙事性 (N)", desc: "重视故事、角色和情感体验" },
    { key: "Simulationism", name: "模拟性 (S)", desc: "享受真实感、沉浸和探索" },
  ];

  const handleRatingChange = (category: RatingCategory, value: string) => {
    setRatings(prev => ({
      ...prev,
      [category]: Number.parseInt(value, 10),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(ratings);
    }
    finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setRatings({ ...initialRatings });
    onCancel();
  };

  // 计算排序展示并用 aria-live 让屏幕阅读器能读取到变化
  const order = useMemo(() => getGNSOrder(ratings), [ratings]);

  const isDisabled = isLoading || saving;
  const unchanged
      = ratings.Gamism === initialRatings.Gamism
        && ratings.Narrativism === initialRatings.Narrativism
        && ratings.Simulationism === initialRatings.Simulationism;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 text-center text-base-content">设置你的 GNS 偏好</h2>

      {/* 排序与说明 */}
      <div className="space-y-3 justify-center">
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <div className="collapse collapse-arrow border-base-300 border">
            <input type="checkbox" />
            <div className="collapse-title font-semibold text-base-content">
              什么是 GNS 偏好？
            </div>
            <div className="collapse-content text-sm text-base-content/80">
              <p>
                GNS（Game–Narrative–Simulation）模型是角色扮演游戏的一种理论框架。
                <br />
                你可以根据偏好在 0–5 之间选择数值，表示你在游戏、叙事和模拟三方面的侧重点。
              </p>
            </div>
          </div>

          <div className="min-w-[10rem] p-2 bg-base-100 rounded-md shadow-sm text-center dark:bg-base-300">
            <div className="text-xs text-base-content/60">当前排序</div>
            <div
              className="font-semibold text-sm mt-1 text-pink-500"
              aria-live="polite"
              role="status"
              title={`当前 GNS 排序：${order}`}
            >
              {order}
            </div>
          </div>
        </div>

        {/* 控件区：小屏幕单列，大屏幕两列 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {categories.map(category => (
            <div
              key={category.key}
              className="p-3 bg-base-100 rounded-lg shadow-sm flex flex-col justify-between dark:bg-base-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-base-content">{category.name}</h3>
                  <p className="text-xs text-base-content/70 mt-1">{category.desc}</p>
                </div>
                <div className="text-xl font-semibold text-primary min-w-[2.2rem] text-right">
                  {ratings[category.key]}
                </div>
              </div>

              <div className="mt-3">
                <input
                  aria-label={`${category.name} 分数`}
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={ratings[category.key]}
                  onChange={e => handleRatingChange(category.key, e.target.value)}
                  className="w-full h-2 bg-base-200 rounded-full appearance-none cursor-pointer disabled:opacity-50"
                  disabled={isDisabled}
                />
                <div className="mt-2 flex justify-between text-xs text-base-content/80">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 按钮区：在移动端占满宽度，在大屏居中 */}
        <div className="mt-4 pt-4 border-t border-base-200 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isDisabled}
            className={`w-full sm:w-auto px-5 py-2 rounded-md border hover:bg-base-200 transition disabled:opacity-50 cursor-pointer ${
              isDisabled ? "" : "bg-base-100"
            }`}
          >
            取消
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isDisabled || unchanged}
            className={`w-full sm:w-auto px-6 py-2 rounded-md text-base-100 transition disabled:opacity-50 ${
              unchanged || isDisabled ? "bg-primary/40" : "bg-primary hover:bg-primary-focus cursor-pointer"
            }`}
          >
            {saving ? "保存中..." : "完成设置"}
          </button>
        </div>

      </div>
    </div>
  );
}

// GNS排序表达
function getGNSOrder(ratings: Ratings): string {
  const entries = Object.entries(ratings) as [RatingCategory, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  const categoryMap = {
    Gamism: "G",
    Narrativism: "N",
    Simulationism: "S",
  };

  let result = "";
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const currentValue = sorted[i][1];
      const prevValue = sorted[i - 1][1];
      result += currentValue === prevValue ? " = " : " > ";
    }
    result += categoryMap[sorted[i][0]];
  }

  return result;
}

export default GNSPreferenceEditor;
