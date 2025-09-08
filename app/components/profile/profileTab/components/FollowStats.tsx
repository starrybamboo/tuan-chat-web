import React from "react";

interface FollowStatsProps {
  followingCount: number;
  followersCount: number;
  onFollowingClick: () => void;
  onFollowersClick: () => void;
  variant?: "mobile" | "desktop";
}

export const FollowStats: React.FC<FollowStatsProps> = ({
  followingCount,
  followersCount,
  onFollowingClick,
  onFollowersClick,
  variant = "desktop",
}) => {
  const containerClass = variant === "mobile"
    ? "md:hidden flex justify-center gap-8 py-3 rounded-2xl mt-2"
    : "flex gap-8 justify-center w-full mt-4";

  return (
    <div className={containerClass}>
      <div
        className={`flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer ${
          variant === "mobile" ? "btn-active" : ""
        }`}
        onClick={onFollowingClick}
      >
        <div className="stat-value text-sm">{followingCount}</div>
        <div className="stat-title text-sm">关注</div>
      </div>
      <span className="border-l"></span>
      <div
        className="flex flex-row gap-2 items-center hover:text-info transition-colors cursor-pointer"
        onClick={onFollowersClick}
      >
        <div className="stat-value text-sm">{followersCount}</div>
        <div className="stat-title text-sm">粉丝</div>
      </div>
    </div>
  );
};
