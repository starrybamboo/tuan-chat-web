import React from "react";

import { Button } from "@/components/common/Button";
import { Text } from "@/components/common/DesignLanguage";

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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="
          flex flex-row gap-2 items-center
          hover:text-info
          transition-colors motion-reduce:transition-none cursor-pointer
          rounded-md bg-transparent p-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/35
        "
        onClick={onFollowingClick}
        aria-label={`查看关注列表，共 ${followingCount} 个关注`}
      >
        <Text variant="data">{followingCount}</Text>
        <Text variant="label">关注</Text>
      </Button>
      <span className="border-l"></span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
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
        <Text variant="data">{followersCount}</Text>
        <Text variant="label">粉丝</Text>
      </Button>
    </div>
  );
};
