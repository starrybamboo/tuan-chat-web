interface LoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * 加载状态组件
 * 通用的加载指示器
 */
export function LoadingState({
  message = "加载中...",
  className = "h-64",
}: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <div className="text-base-content/60 text-sm">{message}</div>
      </div>
    </div>
  );
}
