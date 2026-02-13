interface ToolButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

interface CreatePageHeaderProps {
  title: string;
  description: string;
  onBack?: () => void;
  children?: React.ReactNode;
  toolButtons?: ToolButton[];
}

/**
 * 创建页面通用头部组件
 * 统一三个创建入口的头部样式和返回按钮
 */
export default function CreatePageHeader({
  title,
  description,
  onBack,
  children,
  toolButtons,
}: CreatePageHeaderProps) {
  return (
    <div className="hidden md:flex items-center justify-between gap-3 mb-8">
      <div className="flex items-center gap-4">
        {onBack && (
          <button type="button" className="btn btn-lg btn-outline rounded-md btn-ghost mr-4" onClick={onBack}>
            ← 返回
          </button>
        )}
        <div>
          <h1 className="font-semibold text-2xl md:text-3xl my-2">{title}</h1>
          <p className="text-base-content/60">
            {description}
            {children}
          </p>
        </div>
      </div>

      {/* 工具按钮区域 */}
      {toolButtons && toolButtons.length > 0 && (
        <div className="flex items-center gap-2">
          {toolButtons.map(button => (
            <button
              key={button.id}
              type="button"
              className={`btn btn-sm md:btn-lg rounded-lg ${
                button.variant === "primary"
                  ? "btn-primary"
                  : "bg-info/70 text-info-content"
              }`}
              onClick={button.onClick}
              disabled={button.disabled}
              title={button.label}
            >
              <span className="flex items-center gap-1">
                {button.icon}
                <span className="hidden md:inline">{button.label}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
