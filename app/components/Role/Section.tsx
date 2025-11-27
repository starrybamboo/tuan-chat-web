// Section.tsx（通用模块容器）
import React from "react";

export default function Section({
  title,
  children,
  className = "",
  defaultOpen = true,
  collapsible = true,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean; // 是否可折叠
}) {
  if (!collapsible) {
    return (
      <div className={`border border-base-300 rounded-xl py-4 ${className}`}>
        {title && (
          <div className="px-4 text-lg font-semibold mb-2">
            ⚡
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
    <div className={`collapse collapse-arrow border border-base-300 ${className}`}>

      <input type="checkbox" defaultChecked={defaultOpen} />
      <div className="collapse-title px-4 py-3 text-lg font-semibold">
        {title}
      </div>
      <div className="collapse-content">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
