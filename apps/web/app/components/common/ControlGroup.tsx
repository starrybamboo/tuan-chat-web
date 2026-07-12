import type { HTMLAttributes } from "react";

export type ControlGroupProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  connected?: boolean;
};

export function controlGroupClassName({
  orientation = "horizontal",
  connected = true,
  className = "",
}: Pick<ControlGroupProps, "orientation" | "connected" | "className"> = {}) {
  const childShapeClass = connected && orientation === "horizontal"
    ? "[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none"
    : connected
      ? "[&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none"
      : "";

  return `${orientation === "horizontal" ? "inline-flex" : "inline-flex flex-col"} ${childShapeClass} ${className}`;
}

/** 统一相邻控件的边框、圆角和横纵排列。 */
export function ControlGroup({
  orientation = "horizontal",
  connected = true,
  className = "",
  ...rest
}: ControlGroupProps) {
  return (
    <div
      role="group"
      className={controlGroupClassName({ orientation, connected, className })}
      {...rest}
    />
  );
}
