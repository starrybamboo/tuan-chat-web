import { X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { FloatingMotionButton, FloatingMotionPanel } from "@/components/common/motion/FloatingMotionPanel";
import RoleAvatarComponent from "@/components/common/roleAvatar";

import type { MessageEditorSpeakerMenuItem } from "./messageEditorSpeaker";

type MessageEditorSpeakerMenuProps = {
  items: MessageEditorSpeakerMenuItem[];
  onSelect: (item: MessageEditorSpeakerMenuItem) => void;
  selectedIndex: number;
  visible: boolean;
}

/**
 * 文档消息块的 speaker 候选菜单。
 */
export function MessageEditorSpeakerMenu({
  items,
  onSelect,
  selectedIndex,
  visible,
}: MessageEditorSpeakerMenuProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    itemRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedIndex, visible]);

  if (!visible) {
    return null;
  }

  return (
    <FloatingMotionPanel
      data-me-speaker-menu="true"
      role="listbox"
      aria-label="角色候选"
      className="
        w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border
        border-base-300 bg-base-100 shadow-2xl
      "
    >
      {items.length === 0
        ? (
            <div className="bg-base-100 px-3 py-3 text-sm text-base-content/50">
              没有可选角色
            </div>
          )
        : (
            <div className="max-h-72 overflow-y-auto py-1">
              {items.map((item, index) => {
                const active = index === selectedIndex;
                if (item.kind === "clear") {
                  return (
                    <FloatingMotionButton
                      key="speaker:clear"
                      index={index}
                      ref={(element) => {
                        itemRefs.current[index] = element;
                      }}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={[
                        "flex w-full items-center gap-2 px-3 py-2 text-left transition motion-reduce:transition-none",
                        active
                          ? "bg-base-300 text-base-content"
                        : "bg-base-100 text-base-content/75 hover:bg-base-200 hover:text-base-content",
                      ].join(" ")}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => onSelect(item)}
                    >
                      <span className="
                        flex size-6 shrink-0 items-center justify-center
                        rounded-full bg-base-200/70 text-base-content/50
                      ">
                        <X className="size-3.5" weight="regular" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium" title={item.label}>{item.label}</span>
                        <span
                          className="
                            mt-0.5 block truncate text-xs text-base-content/50
                          "
                          title={item.description || "取消角色"}
                        >
                          {item.description || "取消角色"}
                        </span>
                      </span>
                      {item.selected && (
                        <span className="
                          shrink-0 rounded-md bg-base-200 px-1.5 py-0.5
                          text-[11px] text-base-content/55
                        ">
                          当前
                        </span>
                      )}
                    </FloatingMotionButton>
                  );
                }
                return (
                  <FloatingMotionButton
                    key={`role:${item.roleId}`}
                    index={index}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition motion-reduce:transition-none",
                      active
                        ? "bg-base-300 text-base-content"
                      : "bg-base-100 text-base-content/75 hover:bg-base-200 hover:text-base-content",
                    ].join(" ")}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => onSelect(item)}
                  >
                    <RoleAvatarComponent
                      avatarId={item.avatarId ?? -1}
                      roleId={item.roleId}
                      width={6}
                      isRounded={true}
                      withTitle={false}
                      stopToastWindow={true}
                      hoverToScale={false}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium" title={item.label}>{item.label}</span>
                      {item.description && (
                        <span
                          className="
                            mt-0.5 block truncate text-xs text-base-content/50
                          "
                          title={item.description}
                        >
                          {item.description}
                        </span>
                      )}
                    </span>
                    {item.selected && (
                      <span className="
                        shrink-0 rounded-md bg-base-200 px-1.5 py-0.5
                        text-[11px] text-base-content/55
                      ">
                        当前
                      </span>
                    )}
                  </FloatingMotionButton>
                );
              })}
            </div>
          )}
    </FloatingMotionPanel>
  );
}
