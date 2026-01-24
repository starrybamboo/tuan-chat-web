import type {
  RefObject,
} from "react";
import type { UserRole } from "../../api";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Mounter } from "@/components/common/mounter";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { getEditorRange, getSelectionCoords } from "@/utils/getSelectionCoords";

// 定义 props 类型
interface AtMentionProps {
  chatInputRef: RefObject<ChatInputAreaHandle | null>;
  allRoles: UserRole[];
}

// 定义将通过 ref 暴露的句柄（Handle）类型
export interface AtMentionHandle {
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

  // 2. 派生状态
  const filteredRoles = showDialog
    ? allRoles.filter(r => (r.roleName ?? "").includes(searchKey))
    : [];

  // 3. 相关的 Effects
  useEffect(() => {
    setSelectedIndex(0);
  }, [showDialog, searchKey]); // searchKey 依赖是必要的，以便在过滤列表更改时重置

  useEffect(() => {
    if (showDialog) {
      const { x: cursorX, y: cursorY } = getSelectionCoords();
      setDialogPosition({
        x: Math.min(cursorX, screen.width - 100),
        y: cursorY,
      });
    }
  }, [showDialog, searchKey]);

  // 监听输入框的焦点状态，如果失焦，则关闭@选项框
  useEffect(() => {
    const editorEl = chatInputRef.current?.getRawElement();
    if (!editorEl)
      return;

    const handleBlur = () => {
      setShowDialog(false);
      setSearchKey("");
    };

    editorEl.addEventListener("blur", handleBlur);
    return () => {
      editorEl.removeEventListener("blur", handleBlur);
    };
  }, [chatInputRef]);

  // 4. 所有内部逻辑函数
  const checkDialogTrigger = useCallback(() => {
    const editorEl = chatInputRef.current?.getRawElement();
    const rangeInfo = getEditorRange(editorEl);

    if (!rangeInfo || !rangeInfo.range || !rangeInfo.selection)
      return;

    const curNode = rangeInfo.range.endContainer;
    if (!curNode.textContent?.includes("@")) {
      setShowDialog(false);
      setSearchKey("");
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
        setShowDialog(false);
        setSearchKey("");
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
  }, [chatInputRef]);

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
    span.className = "inline text-blue-500 bg-transparent px-0 py-0 border-none";
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

  // 5. 使用 useImperativeHandle 暴露 API
  useImperativeHandle(ref, () => ({
    /** 返回当前对话框是否打开 */
    isDialogOpen: () => showDialog,

    /** 处理按键导航。如果事件被消耗（例如按下了回车或箭头键），则返回 true。 */
    onKeyDown: (e: React.KeyboardEvent): boolean => {
      if (!showDialog)
        return false;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (filteredRoles[selectedIndex]) {
            handleSelectRole(filteredRoles[selectedIndex]);
          }
          return true;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          return true;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredRoles.length - 1));
          return true;
        default:
          return false; // 未处理此键
      }
    },

    /** 处理按键释放，用于触发和更新对话框。 */
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === "@") {
        setShowDialog(true);
      }
      // 总是在 key up 时检查触发器
      checkDialogTrigger();
    },

    /** 处理鼠标按下。如果对话框打开，则返回 true 以阻止默认行为（例如输入框失焦）。 */
    onMouseDown: (e: React.MouseEvent): boolean => {
      if (showDialog) {
        e.preventDefault();
        return true;
      }
      return false;
    },

    /** 关闭对话框 */
    closeDialog: () => {
      setShowDialog(false);
      setSearchKey("");
    },

    /** 处理输入事件 */
    onInput: () => {
      checkDialogTrigger();
    },
  }));

  // 6. 渲染 JSX（弹出窗口）
  if (!showDialog || dialogPosition.x <= 0 || filteredRoles.length === 0) {
    return null; // 不打开时，不渲染任何东西
  }

  return (
    <Mounter targetId="modal-root">
      <div
        className="absolute flex flex-col card shadow-md bg-base-100 p-2 gap-2 z-20 max-h-[30vh] overflow-auto"
        style={{
          top: dialogPosition.y - 5,
          left: dialogPosition.x,
          transform: "translateY(-100%)",
        }}
      >
        {filteredRoles.map((role, index) => {
          const roleNote = role.extra?.mentionNote;
          return (
            <div
              className={`flex flex-row items-center gap-2 hover:bg-base-300 rounded pt-1 pb-1 ${
                index === selectedIndex ? "bg-base-300" : ""
              }`}
              key={role.roleId}
              onClick={() => {
                handleSelectRole(role);
              }}
              onMouseDown={e => e.preventDefault()} // ???????????????
            >
              <RoleAvatarComponent
                avatarId={role.avatarId ?? -1}
                width={8}
                isRounded={true}
                stopPopWindow={true}
              />
              <div className="flex flex-col">
                <span>{role.roleName}</span>
                {roleNote ? <span className="text-xs text-base-content/60">{roleNote}</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Mounter>
  );
}

export default AtMentionController;
