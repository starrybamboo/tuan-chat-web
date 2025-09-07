import type { ChatInputAreaHandle } from "@/components/chat/chatInputArea";
import type {
  RefObject,
} from "react";
import type { UserRole } from "../../api";
import { Mounter } from "@/components/common/mounter";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { getEditorRange, getSelectionCoords } from "@/utils/getSelectionCoords";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

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

    setTimeout(() => {
      chatInputRef.current?.getRawElement()?.focus();
    }, 10);
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
        {filteredRoles.map((role, index) => (
          <div
            className={`flex flex-row items-center gap-2 hover:bg-base-300 rounded pt-1 pb-1 ${
              index === selectedIndex ? "bg-base-300" : ""
            }`}
            key={role.roleId}
            onClick={() => {
              handleSelectRole(role);
            }}
            onMouseDown={e => e.preventDefault()} // 关键：防止点击选项时输入框失焦
          >
            <RoleAvatarComponent
              avatarId={role.avatarId ?? -1}
              width={8}
              isRounded={true}
              stopPopWindow={true}
            />
            {role.roleName}
          </div>
        ))}
      </div>
    </Mounter>
  );
}

export default AtMentionController;
