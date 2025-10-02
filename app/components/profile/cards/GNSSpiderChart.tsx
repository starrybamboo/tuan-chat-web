import { PopWindow } from "@/components/common/popWindow";
import { useGlobalContext } from "@/components/globalContextProvider";
import GNSPreferenceEditor from "@/components/profile/popWindows/GNSEditorPop";

import { useEffect, useState } from "react";
import { useGetGNSQuery, useUpsertGNSMutation } from "../../../../api/hooks/userGNSQuerryHooks";

type RatingCategory = "Gamism" | "Narrativism" | "Simulationism";

interface Ratings {
  Gamism: number;
  Narrativism: number;
  Simulationism: number;
}

interface GNSSpiderChartProps {
  userId: number;
}

/**
 * GNS 雷达图小卡片，调用了 GNSPreferenceEditor 弹窗，供用户编辑
 */
const GNSSpiderChart: React.FC<GNSSpiderChartProps> = ({ userId }) => {
  const [ratings, setRatings] = useState<Ratings>({
    Gamism: 0,
    Narrativism: 0,
    Simulationism: 0,
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const loginUserId = useGlobalContext().userId ?? -1;

  // API hooks
  const { data: gnsData, isLoading, error } = useGetGNSQuery(userId);
  const upsertMutation = useUpsertGNSMutation();

  // 初始化时从API加载数据
  useEffect(() => {
    if (gnsData?.data) {
      const apiData = gnsData.data;
      const loadedRatings = {
        Gamism: Number(apiData.gameplayScore) || 0,
        Narrativism: Number(apiData.narrativeScore) || 0,
        Simulationism: Number(apiData.simulationScore) || 0,
      };
      setRatings(loadedRatings);
    }
  }, [gnsData]);

  const categories: RatingCategory[] = ["Gamism", "Narrativism", "Simulationism"];
  const categoryNames = {
    Gamism: "游戏性",
    Narrativism: "叙事性",
    Simulationism: "模拟性",
  };

  const maxRating = Math.max(...Object.values(ratings));
  const highlightedCategory = (Object.entries(ratings) as [RatingCategory, number][])
    .find(([_, value]) => value === maxRating)?.[0] || "";

  // 检查是否所有评分都是0（未设置状态）
  const isNotConfigured = !gnsData?.data || Object.values(ratings).every(rating => rating === 0);

  const handleSaveChanges = async (newRatings: Ratings) => {
    try {
      const updateData = {
        userId,
        gameplayScore: newRatings.Gamism.toString(),
        narrativeScore: newRatings.Narrativism.toString(),
        simulationScore: newRatings.Simulationism.toString(),
        preferenceDesc: gnsData?.data?.preferenceDesc || "",
        isCreate: !gnsData?.data,
      };

      await upsertMutation.mutateAsync(updateData);

      // 保存成功后更新本地状态并关闭编辑器
      setRatings(newRatings);
      setIsEditOpen(false);
    }
    catch (error) {
      console.error("保存GNS偏好失败:", error);
      // TODO: 这里可以添加错误提示
    }
  };

  const handleOpenEditor = () => {
    setIsEditOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditOpen(false);
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

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-col items-center p-6 rounded-lg shadow-md">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  // 真正的错误状态（排除用户未设置的情况）
  if (error && !isNotConfigured) {
    return (
      <div className="flex flex-col items-center p-6 rounded-lg shadow-md">
        <div className="text-center text-red-500">加载失败，请稍后重试</div>
      </div>
    );
  }

  // 未配置状态的引导界面
  if (isNotConfigured) {
    // 只有登录用户本人才显示设置引导，其他人显示"未设置"状态
    if (loginUserId === userId) {
      return (
        <div className="flex flex-col items-center p-4 rounded-lg shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center mb-2">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">设置你的游戏偏好</h2>
            <p className="text-gray-600 max-w-md">
              还没有设置 GNS 偏好？立即设置来发现你的游戏风格！
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-2">GNS 理论简介</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                <span>
                  <strong>游戏性 (G)</strong>
                  {" "}
                  - 追求挑战、策略和竞争
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>
                  <strong>叙事性 (N)</strong>
                  {" "}
                  - 重视故事情节和角色发展
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>
                  <strong>模拟性 (S)</strong>
                  {" "}
                  - 享受真实感和沉浸体验
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditor}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md font-medium"
          >
            开始设置 GNS 偏好
          </button>

          {/* 编辑弹窗 */}
          <PopWindow isOpen={isEditOpen} onClose={handleCloseEditor}>
            <GNSPreferenceEditor
              initialRatings={ratings}
              onSave={handleSaveChanges}
              onCancel={handleCloseEditor}
              isLoading={upsertMutation.isPending}
            />
          </PopWindow>
        </div>
      );
    }
    else {
      // 查看其他用户的未设置状态
      return (
        <div className="flex flex-col items-center p-6 rounded-lg border border-gray-200 bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">暂未设置 GNS 偏好</h3>
            <p className="text-sm text-gray-500">唔...该用户还没有设置游戏偏好呢</p>
          </div>
        </div>
      );
    }
  }

  // 已配置状态的雷达图
  return (
    <div className="flex flex-col items-center rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-center">
          {highlightedCategory ? `${categoryNames[highlightedCategory]}玩家` : "GNS 三角图"}
        </h1>
        {loginUserId === userId && (
          <button
            type="button"
            onClick={handleOpenEditor}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50 cursor-pointer duration-200"
            disabled={upsertMutation.isPending}
          >
            编辑
          </button>
        )}
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
      <PopWindow isOpen={isEditOpen} onClose={handleCloseEditor}>
        <GNSPreferenceEditor
          initialRatings={ratings}
          onSave={handleSaveChanges}
          onCancel={handleCloseEditor}
          isLoading={upsertMutation.isPending}
        />
      </PopWindow>
    </div>
  );
};

export default GNSSpiderChart;
