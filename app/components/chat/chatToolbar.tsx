import EmojiWindow from "@/components/chat/window/EmojiWindow";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  Detective,
  EmojiIconWhite,
  GalleryBroken,
  GirlIcon,
  PointOnMapPerspectiveLinear,
  SendIcon,
  SparklesOutline,
  SwordSwing,
} from "@/icons";
import React, { use } from "react";
import { SpaceContext } from "./spaceContext";

interface ChatToolbarProps {
  // 侧边栏状态
  sideDrawerState: "none" | "user" | "role" | "search" | "initiative" | "map" | "clue";
  setSideDrawerState: (state: "none" | "user" | "role" | "search" | "initiative" | "map" | "clue") => void;

  // 文件和表情处理
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateImgFiles: (updater: (draft: File[]) => void) => void;

  // 消息发送
  disableSendMessage: boolean;
  handleMessageSubmit: () => void;

  autoComplete: () => void;
  // 新增：当前聊天状态 & 手动切换
  currentChatStatus: "idle" | "input" | "wait" | "leave";
  onChangeChatStatus: (status: "idle" | "input" | "wait" | "leave") => void;
  // 是否是观战成员
  isSpectator?: boolean;
}

export function ChatToolbar({
  sideDrawerState,
  setSideDrawerState,
  updateEmojiUrls,
  updateImgFiles,
  disableSendMessage,
  handleMessageSubmit,
  autoComplete,
  currentChatStatus,
  onChangeChatStatus,
  isSpectator = false,
}: ChatToolbarProps) {
  const spaceContext = use(SpaceContext);

  // 调试日志
  console.warn("🛠️ ChatToolbar 渲染", {
    isSpectator,
    currentChatStatus,
    onChangeChatStatusType: typeof onChangeChatStatus,
  });

  return (
    <div className="flex pr-1 pl-2 justify-between ">
      <div className="flex gap-2">
        {/* 聊天状态选择器 - 观战成员不显示 */}
        {!isSpectator && (
          <details
            className="dropdown dropdown-top"
            onToggle={(e) => {
              console.warn("🔄 Dropdown 状态变化", { open: (e.target as HTMLDetailsElement).open });
            }}
            style={{ pointerEvents: "auto" }}
          >
            <summary
              tabIndex={0}
              className="min-w-0 cursor-pointer list-none px-2 h-7 rounded-md border border-base-300 flex items-center text-xs select-none gap-1 hover:border-info"
              style={{ pointerEvents: "auto", zIndex: 100, position: "relative" }}
              onClick={(e) => {
                console.warn("📋 Dropdown summary 被点击", {
                  isOpen: (e.currentTarget.parentElement as HTMLDetailsElement)?.open,
                  target: e.target,
                  currentTarget: e.currentTarget,
                });
              }}
              onMouseEnter={() => console.warn("🖱️ 鼠标进入 summary")}
              onMouseDown={() => console.warn("🖱️ 鼠标按下 summary")}
            >
              <span
                className={
                  currentChatStatus === "input"
                    ? "text-info"
                    : currentChatStatus === "wait"
                      ? "text-warning"
                      : currentChatStatus === "leave" ? "text-error" : "opacity-70"
                }
              >
                {currentChatStatus === "idle" && "空闲"}
                {currentChatStatus === "input" && "输入中"}
                {currentChatStatus === "wait" && "等待扮演"}
                {currentChatStatus === "leave" && "暂离"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.173l3.71-3.942a.75.75 0 111.08 1.04l-4.25 4.516a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </summary>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box w-36 p-2 shadow-md border border-base-200 gap-1 text-sm"
              style={{ zIndex: 9999, position: "absolute" }}
            >
              {[
                { value: "idle", label: "空闲", desc: "清除正在输入" },
                { value: "input", label: "输入中", desc: "标记正在输入" },
                { value: "wait", label: "等待扮演", desc: "等待他人行动" },
                { value: "leave", label: "暂离", desc: "临时离开" },
              ].map(item => (
                <li key={item.value}>
                  <a
                    className={`flex flex-col gap-0.5 py-1 ${currentChatStatus === item.value ? "active bg-base-200" : ""}`}
                    onClick={(e) => {
                      console.warn("🔘 状态按钮被点击", {
                        clickedValue: item.value,
                        currentStatus: currentChatStatus,
                        onChangeChatStatus: typeof onChangeChatStatus,
                      });
                      e.preventDefault();
                      e.stopPropagation();
                      console.warn("✅ 调用 onChangeChatStatus", item.value);
                      onChangeChatStatus(item.value as any);
                      // 关闭 dropdown
                      const details = (e.currentTarget as HTMLElement).closest("details");
                      if (details) {
                        details.removeAttribute("open");
                      }
                    }}
                  >
                    <span className="leading-none">{item.label}</span>
                    <span className="text-[10px] opacity-60 leading-none">{item.desc}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        {/* 发送表情 */}
        <div className="dropdown dropdown-top">
          <div role="button" tabIndex={2} className="">
            <div
              className="tooltip"
              data-tip="发送表情"
            >
              <EmojiIconWhite className="size-7 jump_icon"></EmojiIconWhite>
            </div>
          </div>
          <ul
            tabIndex={2}
            className="dropdown-content menu bg-base-100 rounded-box z-1 w-96 p-2 shadow-sm overflow-y-auto"
          >
            <EmojiWindow onChoose={async (emoji) => {
              updateEmojiUrls((draft) => {
                const newUrl = emoji?.imageUrl;
                if (newUrl && !draft.includes(newUrl)) {
                  draft.push(newUrl);
                }
              });
            }}
            >
            </EmojiWindow>
          </ul>
        </div>

        {/* 发送图片 */}
        <ImgUploader setImg={newImg => updateImgFiles((draft) => {
          draft.push(newImg);
        })}
        >
          <div className="tooltip" data-tip="发送图片">
            <GalleryBroken className="size-7 cursor-pointer jump_icon"></GalleryBroken>
          </div>
        </ImgUploader>

        <div className="tooltip" data-tip="AI帮写">
          <SparklesOutline
            className="size-7 cursor-pointer jump_icon"
            onMouseDown={(e) => {
              e.preventDefault(); // 防止失去焦点
            }}
            onClick={(e) => {
              e.preventDefault();
              autoComplete();
            }}
          >
          </SparklesOutline>
        </div>
      </div>

      {/* 右侧按钮组 */}
      <div className="flex gap-2">
        {spaceContext.isSpaceOwner && (
          <div
            className="tooltip tooltip-bottom hover:text-info"
            data-tip="查看线索"
            onClick={() => setSideDrawerState(sideDrawerState === "clue" ? "none" : "clue")}
          >
            <Detective className="size-7"></Detective>
          </div>
        )}

        <div
          className="tooltip"
          data-tip="展示先攻表"
          onClick={() => setSideDrawerState(sideDrawerState === "initiative" ? "none" : "initiative")}
        >
          <SwordSwing className="size-7 jump_icon"></SwordSwing>
        </div>

        <div
          className="tooltip"
          data-tip="地图"
          onClick={() => setSideDrawerState(sideDrawerState === "map" ? "none" : "map")}
        >
          <PointOnMapPerspectiveLinear className="size-7 jump_icon"></PointOnMapPerspectiveLinear>
        </div>

        <div
          className="tooltip"
          data-tip="展示角色"
          onClick={() => setSideDrawerState(sideDrawerState === "role" ? "none" : "role")}
        >
          <GirlIcon className="size-7 jump_icon"></GirlIcon>
        </div>

        {/* 发送按钮 */}
        <div className="tooltip" data-tip="发送">
          <SendIcon
            className={`size-7 font-light hover:text-info ${disableSendMessage ? "cursor-not-allowed opacity-20 " : ""}`}
            onClick={handleMessageSubmit}
          >
          </SendIcon>
        </div>
      </div>
    </div>
  );
}

export default ChatToolbar;
