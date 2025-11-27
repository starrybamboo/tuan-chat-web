// Section.tsx（通用模块容器）
import React from "react";

export default function Section({
  title,
  children,
  className = "",
  defaultOpen = true,
  collapsible = true,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  collapsible?: boolean; // 是否可折叠
}) {
  if (!collapsible) {
    return (
      <div className={`border border-base-300 rounded-lg ${className}`}>
        <div className="px-4 py-3 text-xl font-medium">
          {title}
        </div>
        <div className="px-4 pb-4">
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`collapse collapse-arrow border border-base-300 ${className}`}>
      <input type="checkbox" defaultChecked={defaultOpen} />
      <div className="collapse-title text-xl font-medium">
        {title}
      </div>
      <div className="collapse-content">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
