import type { DetailsHTMLAttributes, ReactNode } from "react";

import { CaretDownIcon } from "@phosphor-icons/react";
import { useState } from "react";

export type DisclosureProps = Omit<DetailsHTMLAttributes<HTMLDetailsElement>, "children" | "title" | "open"> & {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  titleClassName?: string;
  contentClassName?: string;
  hideTitleOnMobile?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
};

/** 统一可折叠区域的原生语义、展开图标、焦点和表面状态。 */
export function Disclosure({
  title,
  icon,
  children,
  className = "",
  titleClassName = "",
  contentClassName = "",
  hideTitleOnMobile = false,
  open,
  defaultOpen = false,
  onToggle,
  ...rest
}: DisclosureProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? uncontrolledOpen;

  return (
    <details
      {...rest}
      open={resolvedOpen}
      className={`group rounded-md border border-base-300 bg-base-100 ${className}`}
      onToggle={(event) => {
        if (open == null) {
          setUncontrolledOpen(event.currentTarget.open);
        }
        onToggle?.(event);
      }}
    >
      <summary
        className={`cursor-pointer list-none rounded-md p-0 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/20 [&::-webkit-details-marker]:hidden ${hideTitleOnMobile ? "hidden md:block" : ""}`}
      >
        <span className={`flex min-h-control-default w-full items-center gap-2 px-4 py-3 text-component-title font-medium text-base-content ${titleClassName}`}>
          {icon}
          <span className="min-w-0 flex-1">{title}</span>
          <CaretDownIcon
            className="size-icon-compact shrink-0 transition-transform duration-200 group-open:rotate-180"
            weight="regular"
            aria-hidden="true"
          />
        </span>
      </summary>
      <div className={`px-4 pb-4 pt-2 ${contentClassName}`}>{children}</div>
    </details>
  );
}
