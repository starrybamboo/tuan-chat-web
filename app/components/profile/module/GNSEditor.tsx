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

function GNSPreferenceEditor({ ratings, onRatingChange, onClose }: {
  ratings: Ratings;
  onRatingChange: (category: RatingCategory, value: string) => void;
  onClose: () => void;
}) {
  const categories = [
    { key: "Gamism" as RatingCategory, name: "游戏性 (G)", desc: "追求挑战、竞争和策略" },
    { key: "Narrativism" as RatingCategory, name: "叙事性 (N)", desc: "重视故事、角色和情感体验" },
    { key: "Simulationism" as RatingCategory, name: "模拟性 (S)", desc: "享受真实感、沉浸和探索" },
  ];

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
                onChange={e => onRatingChange(category.key, e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
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

      {/* 底部按钮 */}
      <div className="flex justify-center mt-6 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/70 cursor-pointer transition-colors"
        >
          完成设置
        </button>
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
    </div>
  );
}

export default GNSPreferenceEditor;
