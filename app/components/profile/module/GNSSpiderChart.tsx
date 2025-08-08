import { PopWindow } from "@/components/common/popWindow";
import GNSPreferenceEditor from "@/components/profile/module/GNSEditor";
import { useState } from "react";

type RatingCategory = "Gamism" | "Narrativism" | "Simulationism";

interface Ratings {
  Gamism: number;
  Narrativism: number;
  Simulationism: number;
}

function GNSSpiderChart() {
  const [ratings, setRatings] = useState<Ratings>({
    Gamism: 3,
    Narrativism: 2,
    Simulationism: 4,
  });
  const [isEditOpen, setIsEditOpen] = useState(false);

  const categories: RatingCategory[] = ["Gamism", "Narrativism", "Simulationism"];
  const categoryNames = {
    Gamism: "游戏性",
    Narrativism: "叙事性",
    Simulationism: "模拟性",
  };

  const maxRating = Math.max(...Object.values(ratings));
  const highlightedCategory = (Object.entries(ratings) as [RatingCategory, number][])
    .find(([_, value]) => value === maxRating)?.[0] || "";

  const handleRatingChange = (category: RatingCategory, value: string) => {
    setRatings(prev => ({
      ...prev,
      [category]: Number.parseInt(value, 10),
    }));
  };

  // 计算正三角形的顶点坐标
  const calculateTrianglePoints = () => {
    const center = 150;
    const baseRadius = 100;

    // 正三角形的三个顶点（顶部、左下、右下）
    const vertices = [
      { x: center, y: center - baseRadius }, // 顶部 - Gamism
      { x: center - baseRadius * 0.866, y: center + baseRadius * 0.5 }, // 左下 - Narrativism
      { x: center + baseRadius * 0.866, y: center + baseRadius * 0.5 }, // 右下 - Simulationism
    ];

    // 根据评分计算实际点的位置
    return categories.map((category, index) => {
      const rating = ratings[category];
      const scaledDistance = (baseRadius * rating) / 5;
      const vertex = vertices[index];

      // 从中心点向顶点方向延伸
      const dx = vertex.x - center;
      const dy = vertex.y - center;

      return {
        x: center + (dx / baseRadius) * scaledDistance,
        y: center + (dy / baseRadius) * scaledDistance,
      };
    });
  };

  const points = calculateTrianglePoints();
  const pathData = points.map(point => `${point.x},${point.y}`).join(" ");

  // 三角形顶点位置（用于标签）
  const labelPositions = [
    { x: 150, y: 25 }, // 顶部
    { x: 60, y: 220 }, // 左下
    { x: 240, y: 220 }, // 右下
  ];

  return (
    <div className="flex flex-col items-center p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-center">
          {highlightedCategory ? `${categoryNames[highlightedCategory]}玩家` : "GMS 三角图"}
        </h1>
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          编辑
        </button>
      </div>

      <div className="relative">
        <svg width="300" height="260" viewBox="0 0 300 260" className="overflow-visible">
          {/* 背景网格线（5个档位的同心三角形） */}
          {[1, 2, 3, 4, 5].map((level) => {
            const scale = level / 5;
            const baseRadius = 100 * scale;
            const center = 150;

            const trianglePoints = [
              `${center},${center - baseRadius}`,
              `${center - baseRadius * 0.866},${center + baseRadius * 0.5}`,
              `${center + baseRadius * 0.866},${center + baseRadius * 0.5}`,
            ].join(" ");

            return (
              <polygon
                key={level}
                points={trianglePoints}
                fill="none"
                stroke={level === 5 ? "#94a3b8" : "#e2e8f0"}
                strokeWidth={level === 5 ? "2" : "1"}
              />
            );
          })}

          {/* 轴线 */}
          {categories.map((category, index) => {
            const vertices = [
              { x: 150, y: 50 }, // 顶部
              { x: 63.4, y: 200 }, // 左下
              { x: 236.6, y: 200 }, // 右下
            ];
            const vertex = vertices[index];

            return (
              <line
                key={category}
                x1="150"
                y1="150"
                x2={vertex.x}
                y2={vertex.y}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })}

          {/* 数据区域 */}
          <polygon
            points={pathData}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* 数据点 */}
          {points.map((point, index) => (
            <circle
              key={categories[index]}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* 类别标签 */}
          {categories.map((category, index) => {
            const pos = labelPositions[index];
            const rating = ratings[category];
            const isHighlighted = rating === maxRating;

            return (
              <g key={category}>
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-sm font-bold"
                  fill={isHighlighted ? "#1d4ed8" : "#64748b"}
                >
                  {categoryNames[category]}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 16}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs"
                  fill={isHighlighted ? "#1d4ed8" : "#94a3b8"}
                >
                  {rating}
                  /5
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 编辑弹窗 */}
      <PopWindow isOpen={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <GNSPreferenceEditor
          ratings={ratings}
          onRatingChange={handleRatingChange}
          onClose={() => setIsEditOpen(false)}
        />
      </PopWindow>
    </div>
  );
}

export default GNSSpiderChart;
