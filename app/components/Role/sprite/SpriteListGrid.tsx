import type { RoleAvatar } from "api";

interface SpriteListGridProps {
  /** 头像/立绘列表 */
  avatars: RoleAvatar[];
  /** 当前选中的索引 */
  selectedIndex: number;
  /** 选中回调 */
  onSelect: (index: number) => void;
  /** 自定义类名 */
  className?: string;
  /** 网格列数类名，默认 "grid-cols-4 md:grid-cols-3" */
  gridCols?: string;
}

/**
 * 立绘/头像列表网格组件
 * 可复用于立绘列表 Tab 和情感设定 Tab
 */
export function SpriteListGrid({
  avatars,
  selectedIndex,
  onSelect,
  className = "",
  gridCols = "grid-cols-4 md:grid-cols-3",
}: SpriteListGridProps) {
  if (avatars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-base-content/70">
        <svg className="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p>暂无立绘</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className={`grid ${gridCols} gap-2 overflow-auto content-start`}>
        {avatars.map((avatar, index) => (
          <button
            type="button"
            key={avatar.avatarId}
            onClick={() => onSelect(index)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-[border-color,box-shadow] duration-200 ${
              index === selectedIndex
                ? "border-primary shadow-lg ring-2 ring-primary/30"
                : "border-base-300 hover:border-primary/50 hover:shadow-md"
            }`}
            title={`切换到立绘 ${index + 1}`}
          >
            {avatar.avatarUrl
              ? (
                  <img
                    src={avatar.avatarUrl}
                    alt={`头像 ${index + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    style={{ aspectRatio: "1 / 1" }}
                  />
                )
              : (
                  <div className="w-full h-full bg-base-200 flex items-center justify-center text-base-content/50">
                    {index + 1}
                  </div>
                )}
            {index === selectedIndex && (
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="text-sm text-center mt-3 text-base-content/70 flex-shrink-0">
        当前选中:
        {" "}
        {selectedIndex + 1}
        {" "}
        /
        {" "}
        {avatars.length}
      </div>
    </div>
  );
}
