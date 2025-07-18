import React from "react";

// 定义状态类型
type StatusType = "active" | "offline" | "busy" | "away";

interface UserStatusDotProps {
  status?: StatusType | string; // 允许传入 string 或 undefined
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  className?: string;
}

const UserStatusDot: React.FC<UserStatusDotProps> = ({
  status,
  size = "md",
  editable = false,
  className = "",
}) => {
  // 检查传入的 status 是否合法，否则返回默认值 "offline"
  const getValidStatus = (status?: string | StatusType): StatusType => {
    const validStatuses: StatusType[] = ["active", "offline", "busy", "away"];
    return validStatuses.includes(status as StatusType)
      ? (status as StatusType)
      : "offline";
  };

  // 最终使用的状态
  const finalStatus = getValidStatus(status);

  // 尺寸映射
  const sizeMap = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-7 h-7",
  };

  // 状态颜色映射
  const statusColorMap = {
    active: "bg-success",
    offline: "bg-gray-600",
    busy: "bg-warning",
    away: "bg-info",
  };

  return (
    <div
      className={`
        rounded-full 
        ring-1 ring-white/50 
        ${sizeMap[size]} 
        ${statusColorMap[finalStatus]}
        ${editable ? "cursor-pointer" : ""}
        ${className}
      `}
      title={`当前状态: ${finalStatus}`}
    />
  );
};

export default UserStatusDot;
