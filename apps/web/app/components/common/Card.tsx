import type { ReactNode } from "react";

/**
 * 统一卡片容器：圆角/边框/底色/阴影基线，可选 hover 交互态。
 * 业务卡片内容各异，本组件只提供视觉基线（rounded-lg + base-300 边框 + base-100 底 + shadow-sm），
 * 新代码复用以避免散写 `border border-... bg-... rounded-... shadow-...`。
 */
export type CardProps = {
  children: ReactNode;
  className?: string;
  /** 启用 hover 上浮 + 边框提亮（用于可点击卡片）。 */
  interactive?: boolean;
};

export function Card({ children, className, interactive = false }: CardProps) {
  return (
    <div
      className={[
        "rounded-lg border border-base-300 bg-base-100 shadow-sm",
        interactive
          ? "transition hover:-translate-y-0.5 hover:shadow-md hover:border-base-content/20 motion-reduce:transition-none"
          : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
