import React from "react";

type FollowStatsProps = {
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
      <button
        type="button"
        className={`
          flex flex-row gap-2 items-center
          hover:text-info
          transition-colors motion-reduce:transition-none cursor-pointer
          rounded-md bg-transparent p-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/35
          ${
          variant === "mobile" ? "btn-active" : ""
        }
        `}
        onClick={onFollowingClick}
        aria-label={`查看关注列表，共 ${followingCount} 个关注`}
      >
        <div className="stat-value text-sm">{followingCount}</div>
        <div className="stat-title text-sm">关注</div>
      </button>
      <span className="border-l"></span>
      <button
        type="button"
        className="
          flex flex-row gap-2 items-center
          hover:text-info
          transition-colors motion-reduce:transition-none cursor-pointer
          rounded-md bg-transparent p-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/35
        "
        onClick={onFollowersClick}
        aria-label={`查看粉丝列表，共 ${followersCount} 个粉丝`}
      >
        <div className="stat-value text-sm">{followersCount}</div>
        <div className="stat-title text-sm">粉丝</div>
      </button>
    </div>
  );
};
