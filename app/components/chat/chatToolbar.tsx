import EmojiWindow from "@/components/chat/window/EmojiWindow";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  Detective,
  EmojiIconWhite,
  GalleryBroken,
  GirlIcon,
  Items,
  PointOnMapPerspectiveLinear,
  SendIcon,
  SparklesOutline,
  SwordSwing,
} from "@/icons";
import React, { use } from "react";
import { toast } from "react-hot-toast";
import { SpaceContext } from "./spaceContext";

interface ChatToolbarProps {
  // 侧边栏状态
  sideDrawerState: "none" | "user" | "role" | "search" | "initiative" | "map" | "clue";
  setSideDrawerState: (state: "none" | "user" | "role" | "search" | "initiative" | "map" | "clue") => void;

  // 文件和表情处理
  updateEmojiUrls: (updater: (draft: string[]) => void) => void;
  updateImgFiles: (updater: (draft: File[]) => void) => void;

  // 物品窗口控制
  setIsItemsWindowOpen: (open: boolean) => void;

  // 消息发送
  disableSendMessage: boolean;
  handleMessageSubmit: () => void;
}

export function ChatToolbar({
  sideDrawerState,
  setSideDrawerState,
  updateEmojiUrls,
  updateImgFiles,
  setIsItemsWindowOpen,
  disableSendMessage,
  handleMessageSubmit,
}: ChatToolbarProps) {
  const spaceContext = use(SpaceContext);

  return (
    <div className="flex pr-1 pl-2 justify-between ">
      <div className="flex gap-2">
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
            onClick={() => toast("功能开发中...")}
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

        <div className="tooltip" data-tip="上传物品">
          <Items
            className="size-7 cursor-pointer jump_icon"
            onClick={() => setIsItemsWindowOpen(true)}
          >
          </Items>
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
