// Section.tsx（通用模块容器）
import React from "react";

export default function Section({
  title,
  icon,
  children,
  className = "",
  defaultOpen = true,
  collapsible = true,
  hideTitleOnMobile = false,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean; // 是否可折叠
  hideTitleOnMobile?: boolean;
}) {
  const titleClassName = hideTitleOnMobile
    ? "hidden md:flex items-center gap-2 px-4 text-lg font-semibold mb-2"
    : "flex items-center gap-2 px-4 text-lg font-semibold mb-2";

  if (!collapsible) {
    return (
      <div className={`
        border border-base-300 rounded-xl py-4
        ${className}
      `}>
        {title && (
          <div className={titleClassName}>
            {icon}
            {title}
          </div>
        )}
        <div className="px-4 pb-4">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      collapse collapse-arrow border border-base-300
      ${className}
    `}>

      <input type="checkbox" defaultChecked={defaultOpen} />
      <div className={`
        collapse-title px-4 py-3 text-lg font-semibold
        ${hideTitleOnMobile ? `
          hidden
          md:flex
        ` : `flex`}
        items-center gap-2
      `}>
        {icon}
        {title}
      </div>
      <div className="collapse-content">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
