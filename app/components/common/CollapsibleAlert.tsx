import { useMemo, useState } from "react";

export type CollapsibleAlertType = "info" | "success";

export interface CollapsibleAlertProps {
  type: CollapsibleAlertType;
  message: string;
  /** Replace tokens like {label} in message */
  replacements?: Record<string, string>;
  defaultExpanded?: boolean;
}

export function CollapsibleAlert({
  type,
  message,
  replacements,
  defaultExpanded = false,
}: CollapsibleAlertProps) {
  const [isExpanded, setIsExpanded] = useState(() => defaultExpanded);

  const bgClass = type === "success" ? "bg-success/40" : "bg-info/40";
  const bgCollapsedClass = type === "success" ? "bg-success/30 hover:bg-success/50" : "bg-info/30 hover:bg-info/50";
  const iconPath = type === "success"
    ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    : "m13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z";

  const renderedMessage = useMemo(() => {
    if (!replacements)
      return message;

    let out = message;
    for (const [key, value] of Object.entries(replacements)) {
      out = out.replaceAll(`{${key}}`, value);
    }
    return out;
  }, [message, replacements]);

  return (
    <div
      className={`cursor-pointer select-none transition-all duration-200 rounded-lg overflow-hidden ${
        isExpanded ? `alert ${bgClass}` : `h-2 ${bgCollapsedClass}`
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
      title={isExpanded ? "点击收起" : "点击展开提示信息"}
    >
      {isExpanded && (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={iconPath}
            />
          </svg>
          <span>{renderedMessage}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4 ml-auto"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </>
      )}
    </div>
  );
}
