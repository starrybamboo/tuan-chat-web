import { useEffect, useState } from "react";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { useGlobalContext } from "@/components/globalContextProvider";

import GNSPreferenceEditor from "@/components/profile/toastWindows/GNSEditorToastWindow";
import { useGetMyUserInfoQuery, useGetUserProfileQuery, useUpdateUserInfoMutation } from "../../../../api/hooks/UserHooks";

type RatingCategory = "Gamism" | "Narrativism" | "Simulationism";

interface Ratings {
  Gamism: number;
  Narrativism: number;
  Simulationism: number;
}

interface GNSSpiderChartProps {
  userId: number;
}

interface GNSPreference {
  gameplayScore?: number | string;
  narrativeScore?: number | string;
  simulationScore?: number | string;
  preferenceDesc?: string;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
    }
    catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizePreference(rawPreference: unknown): GNSPreference | null {
  const source = parseRecord(rawPreference);
  if (!source) {
    return null;
  }

  const gameplayScore = source.gameplayScore ?? source.gameplay_score;
  const narrativeScore = source.narrativeScore ?? source.narrative_score;
  const simulationScore = source.simulationScore ?? source.simulation_score;
  const preferenceDesc = typeof source.preferenceDesc === "string"
    ? source.preferenceDesc
    : typeof source.preference_desc === "string"
      ? source.preference_desc
      : undefined;

  if (gameplayScore == null && narrativeScore == null && simulationScore == null && !preferenceDesc) {
    return null;
  }

  return {
    gameplayScore: gameplayScore as number | string | undefined,
    narrativeScore: narrativeScore as number | string | undefined,
    simulationScore: simulationScore as number | string | undefined,
    preferenceDesc,
  };
}

function getGNSPreference(extra: unknown): GNSPreference | null {
  const source = parseRecord(extra);
  if (!source) {
    return null;
  }
  return normalizePreference(source.gnsPreference) ?? normalizePreference(source.userPreference);
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
  const isOwner = loginUserId === userId;

  // API hooks
  const profileQuery = useGetUserProfileQuery(userId, {
    staleTime: 0,
    refetchOnMount: "always",
  });
  const myInfoQuery = useGetMyUserInfoQuery({
    enabled: isOwner,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const updateUserInfoMutation = useUpdateUserInfoMutation();
  // 本人优先使用 /user/info/me，避免公开接口裁剪或缓存导致读不到私有 extra
  const userInfo = isOwner
    ? (myInfoQuery.data?.data ?? profileQuery.data?.data)
    : profileQuery.data?.data;
  const isLoading = isOwner
    ? (profileQuery.isLoading && myInfoQuery.isLoading)
    : profileQuery.isLoading;
  const hasError = isOwner
    ? (Boolean(profileQuery.error) && Boolean(myInfoQuery.error))
    : Boolean(profileQuery.error);
  const gnsPreference = getGNSPreference(userInfo?.extra);
  const hasGnsPreference = Boolean(gnsPreference);
  const gameplayScore = Number(gnsPreference?.gameplayScore) || 0;
  const narrativeScore = Number(gnsPreference?.narrativeScore) || 0;
  const simulationScore = Number(gnsPreference?.simulationScore) || 0;

  // 初始化时从API加载数据
  useEffect(() => {
    const nextRatings = hasGnsPreference
      ? {
          Gamism: gameplayScore,
          Narrativism: narrativeScore,
          Simulationism: simulationScore,
        }
      : {
          Gamism: 0,
          Narrativism: 0,
          Simulationism: 0,
        };

    setRatings((previousRatings) => {
      if (
        previousRatings.Gamism === nextRatings.Gamism
        && previousRatings.Narrativism === nextRatings.Narrativism
        && previousRatings.Simulationism === nextRatings.Simulationism
      ) {
        return previousRatings;
      }
      return nextRatings;
    });
  }, [userId, hasGnsPreference, gameplayScore, narrativeScore, simulationScore]);

  const hasConfiguredScores = Object.values(ratings).some(rating => rating > 0);

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
  const isNotConfigured = !hasGnsPreference || !hasConfiguredScores;

  const handleSaveChanges = async (newRatings: Ratings) => {
    if (!userInfo) {
      return;
    }

    try {
      const updateData = {
        userId,
        extra: {
          gnsPreference: {
            gameplayScore: newRatings.Gamism,
            narrativeScore: newRatings.Narrativism,
            simulationScore: newRatings.Simulationism,
            preferenceDesc: gnsPreference?.preferenceDesc || "",
          },
        },
      };

      await updateUserInfoMutation.mutateAsync(updateData);

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
      <div className="flex flex-col items-center p-6 rounded-lg border border-base-300 bg-base-200">
        <div className="text-center text-base-content/70">加载中...</div>
      </div>
    );
  }

  // 真正的错误状态（排除用户未设置的情况）
  if (hasError && !userInfo) {
    return (
      <div className="flex flex-col items-center p-6 rounded-lg border border-base-300 bg-base-200">
        <div className="text-center text-error">加载失败，请稍后重试</div>
      </div>
    );
  }

  // 未配置状态的引导界面
  if (isNotConfigured) {
    // 只有登录用户本人才显示设置引导，其他人显示“未设置”状态
    if (isOwner) {
      return (
        <div className="flex flex-col items-center p-4 rounded-lg border border-base-300 bg-base-200">
          <div className="text-center mb-2">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/15 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-base-content mb-2">设置你的游戏偏好</h2>
            <p className="text-base-content/70 max-w-md">
              还没有设置 GNS 偏好？立即设置来发现你的游戏风格！
            </p>
          </div>

          <div className="bg-base-100 rounded-lg p-4 mb-4 border border-base-300">
            <h3 className="font-semibold text-base-content mb-2">GNS 理论简介</h3>
            <div className="space-y-2 text-sm text-base-content/75">
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
            className="btn btn-primary px-8 py-3 font-medium"
          >
            开始设置 GNS 偏好
          </button>

          {/* 编辑弹窗 */}
          <ToastWindow isOpen={isEditOpen} onClose={handleCloseEditor}>
            <GNSPreferenceEditor
              initialRatings={ratings}
              onSave={handleSaveChanges}
              onCancel={handleCloseEditor}
              isLoading={updateUserInfoMutation.isPending}
            />
          </ToastWindow>
        </div>
      );
    }
    else {
      // 查看其他用户的未设置状态
      return (
        <div className="flex flex-col items-center p-6 rounded-lg border border-base-300 bg-base-200">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-base-300 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-base-content/45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-base-content/75 mb-2">暂未设置 GNS 偏好</h3>
            <p className="text-sm text-base-content/60">唔...该用户还没有设置游戏偏好呢</p>
          </div>
        </div>
      );
    }
  }

  // 已配置状态的雷达图
  return (
    <div className="flex flex-col items-center rounded-lg text-base-content">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-xl font-bold text-center text-base-content">
          {highlightedCategory ? `${categoryNames[highlightedCategory]}玩家` : "GNS 三角图"}
        </h1>
        {isOwner && (
          <button
            type="button"
            onClick={handleOpenEditor}
            className="btn btn-primary btn-sm disabled:opacity-50"
            disabled={updateUserInfoMutation.isPending}
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
                stroke="currentColor"
                className={level === 5 ? "text-base-content/45" : "text-base-content/20"}
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
                stroke="currentColor"
                className="text-base-content/25"
                strokeWidth="1"
              />
            );
          })}

          {/* 数据区域 */}
          <polygon
            points={pathData}
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="2"
          />

          {/* 数据点 */}
          {points.map((point, index) => (
            <circle
              key={categories[index]}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="currentColor"
              className="text-primary"
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
                  className={`text-sm font-bold ${isHighlighted ? "text-primary" : "text-base-content/70"}`}
                  fill="currentColor"
                >
                  {categoryNames[category]}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 16}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-xs ${isHighlighted ? "text-primary" : "text-base-content/60"}`}
                  fill="currentColor"
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
      <ToastWindow isOpen={isEditOpen} onClose={handleCloseEditor}>
        <GNSPreferenceEditor
          initialRatings={ratings}
          onSave={handleSaveChanges}
          onCancel={handleCloseEditor}
          isLoading={updateUserInfoMutation.isPending}
        />
      </ToastWindow>
    </div>
  );
};

export default GNSSpiderChart;
