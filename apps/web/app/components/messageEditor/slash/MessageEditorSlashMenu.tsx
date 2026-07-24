import { useEffect, useRef } from "react";

import type { MessageEditorSlashMenuItem } from "./messageEditorSlash";

type MessageEditorSlashMenuProps = {
  items: MessageEditorSlashMenuItem[];
  onSelect: (item: MessageEditorSlashMenuItem) => void;
  selectedIndex: number;
  visible: boolean;
}

/**
 * message editor 的 slash 菜单。
 */
export function MessageEditorSlashMenu({
  items,
  onSelect,
  selectedIndex,
  visible,
}: MessageEditorSlashMenuProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    itemRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedIndex, visible]);

  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <div
      data-me-slash-menu="true"
      className="
        w-full max-w-[320px] rounded-xl border border-base-300 bg-base-100 p-1.5
        shadow-xl
      "
    >
      <div className="px-2 pb-1 pt-0.5 text-[11px] text-base-content/50">
        输入
        {" "}
        <span className="font-mono">/</span>
        {" "}
        选择块类型
      </div>
      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
        {items.map((item, index) => {
          const active = index === selectedIndex;
          return (
            <button
              key={`${item.kind}:${item.keyword}`}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              className={[
                "flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition",
                active
                  ? "bg-info/10 text-base-content"
                  : "text-base-content/75 hover:bg-base-200/70 hover:text-base-content",
              ].join(" ")}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onSelect(item)}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-base-content/50">{item.description}</div>
              </div>
              <div className="
                ml-3 shrink-0 font-mono text-[11px] text-base-content/50
              ">
                /
                {item.keyword}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
