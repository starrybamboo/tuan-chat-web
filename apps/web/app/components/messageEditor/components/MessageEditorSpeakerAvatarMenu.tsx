import { X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef } from "react";

import { FloatingMotionButton, FloatingMotionPanel } from "@/components/common/motion/FloatingMotionPanel";
import RoleAvatarComponent from "@/components/common/roleAvatar";

import type { MessageEditorSpeakerAvatarMenuItem } from "../model/messageEditorSpeakerAvatar";

type MessageEditorSpeakerAvatarMenuProps = {
  items: MessageEditorSpeakerAvatarMenuItem[];
  loading?: boolean;
  onSelect: (item: MessageEditorSpeakerAvatarMenuItem) => void;
  query: string;
  roleLabel: string;
  selectedIndex: number;
  visible: boolean;
}

/**
 * 文档消息块的 speaker 头像候选菜单。
 */
export function MessageEditorSpeakerAvatarMenu({
  items,
  loading = false,
  onSelect,
  query,
  roleLabel,
  selectedIndex,
  visible,
}: MessageEditorSpeakerAvatarMenuProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    itemRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedIndex, visible]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, MessageEditorSpeakerAvatarMenuItem[]>();
    for (const item of items) {
      const bucket = groups.get(item.category);
      if (bucket) {
        bucket.push(item);
      }
      else {
        groups.set(item.category, [item]);
      }
    }
    return [...groups.entries()].map(([category, categoryItems]) => ({
      category,
      items: categoryItems,
    }));
  }, [items]);
  const avatarItemCount = useMemo(() => items.filter(item => item.kind === "avatar").length, [items]);

  if (!visible) {
    return null;
  }

  return (
    <FloatingMotionPanel
      data-me-speaker-avatar-menu="true"
      className="
        w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border
        border-base-300 bg-base-100 shadow-2xl
      "
    >
      <div className="
        flex items-center justify-between gap-3 border-b border-base-300
        bg-base-200 px-3 py-2 text-[11px] text-base-content/55
      ">
        <span className="min-w-0 truncate" title={`${roleLabel} 立绘`}>
          {roleLabel}
          {" "}
          立绘
        </span>
        {query
          ? <span className="max-w-[45%] shrink-0 truncate font-mono" title={query}>{query}</span>
          : (
              <span className="shrink-0">
                {avatarItemCount}
                {" "}
                个差分
              </span>
            )}
      </div>

      {loading && items.length === 0
        ? (
            <div className="bg-base-100 px-3 py-3 text-sm text-base-content/50">
              载入中
            </div>
          )
        : items.length === 0
          ? (
              <div className="
                bg-base-100 px-3 py-3 text-sm text-base-content/50
              ">
                没有可选头像
              </div>
            )
          : (
              <div className="max-h-80 overflow-y-auto py-1">
                {(() => {
                  let baseIndex = 0;
                  return groupedItems.map(({ category, items: categoryItems }) => {
                    const currentBaseIndex = baseIndex;
                    baseIndex += categoryItems.length;
                    if (category === "操作") {
                      const item = categoryItems[0];
                      if (!item || item.kind !== "clear") {
                        return null;
                      }
                      const active = currentBaseIndex === selectedIndex;
                      return (
                        <div key={category} className="space-y-1">
                          <div className="
                            flex items-center gap-1 px-3 pt-1 text-[11px]
                            font-medium text-base-content/50
                          ">
                            <span className="truncate" title={category}>{category}</span>
                            <span className="shrink-0">{categoryItems.length}</span>
                          </div>
                          <FloatingMotionButton
                            index={currentBaseIndex}
                            ref={(element) => {
                              itemRefs.current[currentBaseIndex] = element;
                            }}
                            type="button"
                            className={[
                              "flex w-full items-center gap-2 px-3 py-2 text-left transition",
                              active
                                ? "bg-base-300 text-base-content"
                                : "bg-base-100 text-base-content/75 hover:bg-base-200 hover:text-base-content",
                            ].join(" ")}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => onSelect(item)}
                            aria-label={item.avatarTitle}
                            aria-pressed={item.selected}
                          >
                            <span className="
                              flex size-6 shrink-0 items-center justify-center
                              rounded-full bg-base-200/70 text-base-content/50
                            ">
                              <X className="size-3.5" weight="regular" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="
                                  block truncate text-sm font-medium
                                "
                                title={item.avatarTitle}
                              >{item.avatarTitle}</span>
                              <span className="
                                mt-0.5 block truncate text-xs
                                text-base-content/50
                              ">
                                取消头像
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
                        </div>
                      );
                    }
                    return (
                      <div key={category} className="space-y-1">
                        <div className="
                          flex items-center gap-1 px-3 pt-1 text-[11px]
                          font-medium text-base-content/50
                        ">
                          <span className="truncate">{category}</span>
                          <span className="shrink-0">{categoryItems.length}</span>
                        </div>
                        <div className="
                          grid grid-cols-4 gap-1 px-2 pb-1.5
                          sm:grid-cols-5
                        ">
                          {categoryItems.map((item, index) => {
                            if (item.kind === "clear") {
                              return null;
                            }
                            const active = currentBaseIndex + index === selectedIndex;
                            return (
                              <FloatingMotionButton
                                key={item.kind === "avatar" ? item.avatarId : `clear-${category}`}
                                index={currentBaseIndex + index}
                                ref={(element) => {
                                  itemRefs.current[currentBaseIndex + index] = element;
                                }}
                                type="button"
                                className={[
                                  "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1.5 py-2 text-center transition",
                                  active
                                    ? "bg-base-300 text-base-content"
                                    : "text-base-content/75 hover:bg-base-200 hover:text-base-content",
                                ].join(" ")}
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => onSelect(item)}
                                title={item.avatarTitle}
                                aria-label={item.avatarTitle}
                                aria-pressed={item.selected}
                              >
                                <RoleAvatarComponent
                                  avatarId={item.avatarId}
                                  roleId={item.roleId}
                                  width={10}
                                  isRounded={true}
                                  withTitle={false}
                                  stopToastWindow={true}
                                  hoverToScale={false}
                                />
                                <span
                                  className="
                                    min-w-0 truncate text-[11px] font-medium
                                    leading-4
                                  "
                                  title={item.avatarTitle}
                                >
                                  {item.avatarTitle}
                                </span>
                                {item.selected && (
                                  <span className="
                                    rounded-md bg-base-200 px-1 py-0.5
                                    text-[10px] text-base-content/55
                                  ">
                                    当前
                                  </span>
                                )}
                              </FloatingMotionButton>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
    </FloatingMotionPanel>
  );
}
