// Section.tsx（通用模块容器）
import React from "react";

import { Disclosure } from "@/components/common/Disclosure";

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
    <Disclosure
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      hideTitleOnMobile={hideTitleOnMobile}
      className={className}
      titleClassName="text-lg font-semibold"
    >
      <div className="space-y-4">{children}</div>
    </Disclosure>
  );
}
