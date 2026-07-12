import type { ReactNode } from "react";

import { Button } from "@/components/common/Button";

type ToolButton = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

type CreatePageHeaderProps = {
  title: string;
  description: string;
  onBack?: () => void;
  children?: ReactNode;
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
    <div className="
      hidden
      md:flex
      items-center justify-between gap-3 mb-8
    ">
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            size="lg"
            variant="outline"
            className="mr-4 rounded-md"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span>
            返回上一步
          </Button>
        )}
        <div>
          <h1 className="
            font-semibold text-2xl
            md:text-3xl
            my-2
          ">{title}</h1>
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
            <Button
              key={button.id}
              size="sm"
              variant={button.variant === "primary" ? "primary" : "outline"}
              className={`rounded-lg md:h-12 md:min-h-12 md:px-6 md:text-lg ${button.variant === "primary" ? "" : "border-info/45 text-info hover:border-info/70 hover:bg-info/10"}`}
              onClick={button.onClick}
              disabled={button.disabled}
              title={button.label}
              aria-label={button.label}
            >
              <span className="flex items-center gap-1">
                {button.icon}
                <span className="
                  hidden
                  md:inline
                ">{button.label}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
