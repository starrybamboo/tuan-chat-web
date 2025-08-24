import { useState } from "react";

type RatingCategory = "Gamism" | "Narrativism" | "Simulationism";

interface Ratings {
  Gamism: number;
  Narrativism: number;
  Simulationism: number;
}

// GNS排序表达
function getGNSOrder(ratings: Ratings): string {
  const entries = Object.entries(ratings) as [RatingCategory, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);

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

interface GNSPreferenceEditorProps {
  initialRatings: Ratings;
  onSave: (ratings: Ratings) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

function GNSPreferenceEditor({
  initialRatings,
  onSave,
  onCancel,
  isLoading = false,
}: GNSPreferenceEditorProps) {
  // 编辑器内部状态，独立于外部组件
  const [ratings, setRatings] = useState<Ratings>(initialRatings);

  const categories = [
    { key: "Gamism" as RatingCategory, name: "游戏性 (G)", desc: "追求挑战、竞争和策略" },
    { key: "Narrativism" as RatingCategory, name: "叙事性 (N)", desc: "重视故事、角色和情感体验" },
    { key: "Simulationism" as RatingCategory, name: "模拟性 (S)", desc: "享受真实感、沉浸和探索" },
  ];

  const handleRatingChange = (category: RatingCategory, value: string) => {
    setRatings(prev => ({
      ...prev,
      [category]: Number.parseInt(value, 10),
    }));
  };

  const handleSave = async () => {
    await onSave(ratings);
  };

  const handleCancel = () => {
    // 重置到初始状态
    setRatings(initialRatings);
    onCancel();
  };

  const order = getGNSOrder(ratings);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">设置你的 GNS 偏好</h2>

      {/* 单列布局 */}
      <div className="space-y-4">
        {/* 排序显示 */}
        {Object.values(ratings).some(v => v > 0) && (
          <div className="p-3 rounded-lg">
            <div className="text-md font-medium text-green-600">
              当前您的 GNS 排序：
              {order}
            </div>
          </div>
        )}

        {/* 评分控制器 */}
        <div className="space-y-5">
          {categories.map(category => (
            <div key={category.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-base-700">
                  {category.name}
                </label>
                <span className="text-lg font-bold text-primary min-w-[2rem] text-center">
                  {ratings[category.key]}
                </span>
              </div>
              <div className="text-ms text-base-500 mb-2">
                {category.desc}
              </div>
              <input
                type="range"
                min="0"
                max="5"
                value={ratings[category.key]}
                onChange={e => handleRatingChange(category.key, e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GNS理论介绍 */}
      <div className="p-4 rounded-lg text-sm mt-4">
        <p className="text-primary mb-2">TIP: 什么是 GNS 理论？</p>
        <p className="text-base-400 leading-relaxed">
          GNS理论将玩家偏好分为三类：
          <strong>游戏性</strong>
          （追求挑战）、
          <strong>叙事性</strong>
          （重视故事）、
          <strong>模拟性</strong>
          （享受沉浸）
        </p>
      </div>
      {/* 操作按钮 */}
      <div className="flex justify-center gap-4 mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
          disabled={isLoading}
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/70 cursor-pointer transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "保存中..." : "完成设置"}
        </button>
      </div>
    </div>
  );
}

export default GNSPreferenceEditor;
