import type { MessageEditorInsertableBlockKind } from "../model/messageEditorTransforms";

export interface MessageEditorSlashMenuItem {
  description: string;
  keyword: string;
  kind: MessageEditorInsertableBlockKind;
  label: string;
}

interface MessageEditorSlashMenuProps {
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
  if (!visible || items.length === 0) {
    return null;
  }

  return (
    <div data-me-slash-menu="true" className="mt-2 w-full max-w-[320px] rounded-xl border border-base-300 bg-base-100 p-1.5 shadow-xl">
      <div className="px-2 pb-1 pt-0.5 text-[11px] text-base-content/45">
        输入
        {" "}
        <span className="font-mono">/</span>
        {" "}
        选择块类型
      </div>
      <div className="flex flex-col gap-1">
        {items.map((item, index) => {
          const active = index === selectedIndex;
          return (
            <button
              key={`${item.kind}:${item.keyword}`}
              type="button"
              className={[
                "flex w-full items-start justify-between rounded-lg px-2.5 py-2 text-left transition",
                active
                  ? "bg-primary/10 text-base-content"
                  : "text-base-content/75 hover:bg-base-200/70 hover:text-base-content",
              ].join(" ")}
              onMouseDown={event => event.preventDefault()}
              onClick={() => onSelect(item)}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-base-content/45">{item.description}</div>
              </div>
              <div className="ml-3 shrink-0 font-mono text-[11px] text-base-content/35">
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
