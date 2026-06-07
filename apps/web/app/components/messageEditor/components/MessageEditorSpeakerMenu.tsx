import type { MessageEditorSpeakerMenuItem } from "../model/messageEditorSpeaker";
import { X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { floatingListItemMotionProps, floatingPanelMotionProps } from "@/components/common/motion/floatingPanelMotion";
import RoleAvatarComponent from "@/components/common/roleAvatar";

interface MessageEditorSpeakerMenuProps {
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
    <motion.div
      data-me-speaker-menu="true"
      className="
        w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border
        border-base-300 bg-base-100 shadow-2xl
      "
      {...floatingPanelMotionProps}
    >
      {items.length === 0
        ? (
            <div className="bg-base-100 px-3 py-3 text-sm text-base-content/45">
              没有可选角色
            </div>
          )
        : (
            <div className="max-h-72 overflow-y-auto py-1">
              {items.map((item, index) => {
                const active = index === selectedIndex;
                if (item.kind === "clear") {
                  return (
                    <motion.button
                      key="speaker:clear"
                      ref={(element) => {
                        itemRefs.current[index] = element;
                      }}
                      type="button"
                      className={[
                        "flex w-full items-center gap-2 px-3 py-2 text-left transition",
                        active
                          ? "bg-base-300 text-base-content"
                          : "bg-base-100 text-base-content/75 hover:bg-base-200 hover:text-base-content",
                      ].join(" ")}
                      {...floatingListItemMotionProps(index)}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => onSelect(item)}
                    >
                      <span className="
                        flex size-6 shrink-0 items-center justify-center
                        rounded-full bg-base-200/70 text-base-content/45
                      ">
                        <X className="size-3.5" weight="bold" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        <span className="
                          mt-0.5 block truncate text-xs text-base-content/45
                        ">
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
                    </motion.button>
                  );
                }
                return (
                  <motion.button
                    key={`role:${item.roleId}`}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    type="button"
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-left transition",
                      active
                        ? "bg-base-300 text-base-content"
                        : "bg-base-100 text-base-content/75 hover:bg-base-200 hover:text-base-content",
                    ].join(" ")}
                    {...floatingListItemMotionProps(index)}
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
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      {item.description && (
                        <span className="
                          mt-0.5 block truncate text-xs text-base-content/45
                        ">
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
                  </motion.button>
                );
              })}
            </div>
          )}
    </motion.div>
  );
}
