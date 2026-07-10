import type {
  RefObject,
} from "react";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { handleAtMentionInputMouseDown } from "@/components/atMentionMouseDown";
import { resolveNextAtMentionSelectionIndex } from "@/components/atMentionSelection";
import { FloatingMotionList, FloatingMotionListItem } from "@/components/common/motion/FloatingMotionPanel";
import { Mounter } from "@/components/common/mounter";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { HexagonDice } from "@/icons";
import { getEditorRange, getSelectionCoords } from "@/utils/getSelectionCoords";

import type { UserRole } from "../../api";

// 定义 props 类型
type AtMentionProps = {
  chatInputRef: RefObject<ChatInputAreaHandle | null>;
  allRoles: UserRole[];
}

// 定义将通过 ref 暴露的句柄（Handle）类型
export type AtMentionHandle = {
  isDialogOpen: () => boolean;
  onKeyDown: (e: React.KeyboardEvent) => boolean; // 返回 true 表示事件已被处理
  onKeyUp: (e: React.KeyboardEvent) => void;
  onMouseDown: (e: React.MouseEvent) => boolean; // 返回 true 表示事件已被处理
  closeDialog: () => void; // 关闭对话框的方法
  onInput: () => void; // 处理输入事件
}

function AtMentionController({ ref, chatInputRef, allRoles }: AtMentionProps & { ref?: React.RefObject<AtMentionHandle | null> }) {
  // 1. 将所有 @ 相关的状态移动到这里
  const [showDialog, setShowDialog] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [searchKey, setSearchKey] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setSearchKey("");
  }, []);

  // 2. 所有内部逻辑函数
  const checkDialogTrigger = useCallback(() => {
    const editorEl = chatInputRef.current?.getRawElement();
    const rangeInfo = getEditorRange(editorEl);

    if (!rangeInfo || !rangeInfo.range || !rangeInfo.selection)
      return;

    const curNode = rangeInfo.range.endContainer;
    if (!curNode.textContent?.includes("@")) {
      closeDialog();
      return;
    }

    if (!curNode || !curNode.textContent || curNode.nodeName !== "#text") {
      return;
    }
    const searchStr = curNode.textContent.slice(0, rangeInfo.selection.focusOffset);
    const keywords = /@([^@]*)$/.exec(searchStr);

    if (keywords) {
      const keyWord = keywords[1];
      if (keyWord != null && keyWord.length > 20) {
        closeDialog();
        return;
      }
      setSearchKey(keyWord ?? ""); // 如果 keyWord 是 null/undefined，则设置为空字符串
      // 注意：这里我们不设置 setShowDialog(true)，因为那应该由 onKeyUp 触发
      // 修正：为了支持移动端，如果检测到有效的 @ 模式，也应该尝试打开对话框
      setShowDialog(true);
    }
    else {
      setShowDialog(false);
    }
  }, [chatInputRef, closeDialog]);

  const handleSelectRole = useCallback((role: UserRole) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !chatInputRef.current)
      return;

    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE)
      return;

    const text = textNode.textContent || "";
    const offset = range.startOffset;
    const atIndex = Math.max(text.lastIndexOf("@", offset - 1), 0);

    range.setStart(textNode, atIndex);
    range.setEnd(textNode, offset);
    range.deleteContents();

    const span = document.createElement("span");
    span.textContent = `@${role.roleName}` + "\u00A0"; // 非断行空格
    span.className = "inline text-info bg-transparent px-0 py-0 border-none";
    span.contentEditable = "false";
    span.style.display = "inline-block";
    span.dataset.role = JSON.stringify(role);

    chatInputRef.current.insertNodeAtCursor(span, { moveCursorToEnd: true });
    setShowDialog(false);
    chatInputRef.current.triggerSync();

    // 设置光标
    setTimeout(() => {
      const editorEl = chatInputRef.current?.getRawElement();
      const sel = window.getSelection(); // 再次获取最新的 selection
      if (!editorEl || !sel)
        return; // 必须同时具有两者

      // A. 创建一个新的、空白的 Range (光标)
      const newRange = document.createRange();
      // B. 将此 Range 的起始点设置在我们的 span 节点 *之后*
      newRange.setStartAfter(span);
      // C. 将 Range 折叠到其起始点 (使其成为光标，而不是选区)
      newRange.collapse(true);
      // D. 移除所有旧的/损坏的选区
      sel.removeAllRanges();
      // E. 添加我们新创建的、位置正确的光标
      sel.addRange(newRange);
      // F. 现在，用一个保证有效的光标位置来聚焦元素
      editorEl.focus();
    }, 0); // 0 毫秒延迟将其推到事件循环的末尾
  }, [chatInputRef]);

  // 3. 派生状态
  const filteredRoles = useMemo(() => {
    if (!showDialog)
      return [];
    return allRoles.filter(r => r.roleId === -9999 || (r.roleName ?? "").includes(searchKey));
  }, [allRoles, searchKey, showDialog]);

  const handleMentionKeyDown = useCallback((e: Pick<KeyboardEvent, "key" | "preventDefault" | "stopPropagation">) => {
    if (!showDialog || filteredRoles.length === 0)
      return false;

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
        return true;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (filteredRoles[selectedIndex]) {
          handleSelectRole(filteredRoles[selectedIndex]);
        }
        return true;
      case "ArrowUp":
      case "Up":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => resolveNextAtMentionSelectionIndex({
          currentIndex: prev,
          direction: -1,
          itemCount: filteredRoles.length,
        }));
        return true;
      case "ArrowDown":
      case "Down":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(prev => resolveNextAtMentionSelectionIndex({
          currentIndex: prev,
          direction: 1,
          itemCount: filteredRoles.length,
        }));
        return true;
      default:
        return false;
    }
  }, [closeDialog, filteredRoles, handleSelectRole, selectedIndex, showDialog]);

  // 4. 相关的 Effects
  useEffect(() => {
    queueMicrotask(() => setSelectedIndex(0));
  }, [showDialog, searchKey]); // searchKey 依赖是必要的，以便在过滤列表更改时重置

  useEffect(() => {
    if (showDialog) {
      const { x: cursorX, y: cursorY } = getSelectionCoords();
      queueMicrotask(() => setDialogPosition({
        x: Math.min(cursorX, screen.width - 100),
        y: cursorY,
      }));
    }
  }, [showDialog, searchKey]);

  useEffect(() => {
    if (!showDialog)
      return;
    const listEl = listRef.current;
    if (!listEl)
      return;
    const selectedEl = listEl.querySelector<HTMLElement>(`[data-at-mention-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showDialog]);

  // 监听输入框的焦点状态，如果失焦，则关闭@选项框
  useEffect(() => {
    const editorEl = chatInputRef.current?.getRawElement();
    if (!editorEl)
      return;

    const handleBlur = () => {
      closeDialog();
    };

    const handleNativeKeyDown = (ev: KeyboardEvent) => {
      handleMentionKeyDown(ev);
    };

    editorEl.addEventListener("blur", handleBlur);
    editorEl.addEventListener("keydown", handleNativeKeyDown, true);
    return () => {
      editorEl.removeEventListener("blur", handleBlur);
      editorEl.removeEventListener("keydown", handleNativeKeyDown, true);
    };
  }, [chatInputRef, closeDialog, handleMentionKeyDown]);

  // 5. 使用 useImperativeHandle 暴露 API
  useImperativeHandle(ref, () => ({
    /** 返回当前对话框是否打开 */
    isDialogOpen: () => showDialog,

    /** 处理按键导航。如果事件被消耗（例如按下了回车或箭头键），则返回 true。 */
    onKeyDown: (e: React.KeyboardEvent) => handleMentionKeyDown(e.nativeEvent),

    /** 处理按键释放，用于触发和更新对话框。 */
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === "@") {
        setShowDialog(true);
      }
      // 总是在 key up 时检查触发器
      checkDialogTrigger();
    },

    /** 处理输入区鼠标按下。允许浏览器按点击位置更新 contentEditable 光标。 */
    onMouseDown: (): boolean => handleAtMentionInputMouseDown({ closeDialog, showDialog }),

    /** 关闭对话框 */
    closeDialog,

    /** 处理输入事件 */
    onInput: () => {
      checkDialogTrigger();
    },
  }), [checkDialogTrigger, closeDialog, handleMentionKeyDown, showDialog]);

  // 6. 渲染 JSX（弹出窗口）
  if (!showDialog || dialogPosition.x <= 0 || filteredRoles.length === 0) {
    return null; // 不打开时，不渲染任何东西
  }

  return (
    <Mounter targetId="modal-root">
      <FloatingMotionList
        ref={listRef}
        className="
          absolute z-50 flex max-h-[40vh] min-w-[220px] flex-col gap-1 overflow-x-hidden overflow-y-auto
          rounded-box border border-base-200 bg-base-100 p-1 shadow-xl
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        "
        style={{
          top: dialogPosition.y - 8,
          left: dialogPosition.x,
          translate: "0 -100%",
        }}
        onMouseDown={e => e.preventDefault()}
      >
        {filteredRoles.map((role, index) => {
          const roleNote = role.extra?.mentionNote;
          const isAtAll = role.roleId === -9999;
          const isSelected = index === selectedIndex;

          if (isAtAll) {
            return (
              <FloatingMotionListItem
                key={role.roleId}
                index={index}
                className="mb-1 border-b border-base-300/40 pb-1"
              >
                <button
                  type="button"
                  data-at-mention-index={index}
                  aria-selected={isSelected}
                  aria-label={roleNote ? `${role.roleName}（${roleNote}）` : role.roleName}
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left
                    text-base-content/80 transition-colors
                    ${isSelected ? `
                      bg-base-200 text-base-content ring-1 ring-info/20
                    ` : "hover:bg-base-200/70"}
                  `}
                  onClick={() => handleSelectRole(role)}
                >
                  <span
                    className={`
                      flex size-8 shrink-0 items-center justify-center rounded-lg
                      ${isSelected ? "text-info" : "text-base-content/55"}
                    `}
                    aria-hidden="true"
                  >
                    <HexagonDice className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span className="w-full truncate text-sm font-medium" title={role.roleName}>{role.roleName}</span>
                    {roleNote && (
                      <span
                        className={`
                          w-full truncate text-xs
                          ${isSelected ? "text-base-content/70" : "text-base-content/50"}
                        `}
                        title={roleNote}
                      >
                        {roleNote}
                      </span>
                    )}
                  </div>
                </button>
              </FloatingMotionListItem>
            );
          }

          return (
            <FloatingMotionListItem
              key={role.roleId}
              index={index}
            >
              <button
                type="button"
                data-at-mention-index={index}
                aria-selected={isSelected}
                aria-label={roleNote ? `${role.roleName}（${roleNote}）` : role.roleName}
                className={`
                  flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left
                  ${isSelected ? `bg-info text-info-content` : "hover:bg-base-200"}
                `}
                onClick={() => handleSelectRole(role)}
              >
                <RoleAvatarByRole
                  role={role}
                  width={8}
                  isRounded={true}
                  stopToastWindow={true}
                />
                <div className="
                  flex flex-col gap-0.5 items-start flex-1 min-w-0
                ">
                  <span className="font-medium truncate w-full" title={role.roleName}>{role.roleName}</span>
                  {roleNote && (
                    <span
                      className={`
                        text-xs truncate w-full
                        ${
                        isSelected ? "text-info-content/90" : `
                          text-base-content
                        `
                      }
                      `}
                      title={roleNote}
                    >
                      {roleNote}
                    </span>
                  )}
                </div>
              </button>
            </FloatingMotionListItem>
          );
        })}
      </FloatingMotionList>
    </Mounter>
  );
}

export default AtMentionController;
