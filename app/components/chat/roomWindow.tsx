import type { RoomContextType } from "@/components/chat/roomContext";

import type {
  ChatMessageRequest,
  RoomMember,
} from "../../../api";

import ChatFrame from "@/components/chat/chatFrame";
import CommandPanel from "@/components/chat/commandPanel";
import { ExpressionChooser } from "@/components/chat/expressionChooser";
import RoleChooser from "@/components/chat/roleChooser";
import { RoomContext } from "@/components/chat/roomContext";
import RoomRightSidePanel from "@/components/chat/roomRightSidePanel";
import RoomSettingWindow from "@/components/chat/window/roomSettingWindow";
import BetterImg from "@/components/common/betterImg";
import useCommandExecutor, { isCommand } from "@/components/common/commandExecutor";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useGlobalContext } from "@/components/globalContextProvider";
import { UploadUtils } from "@/utils/UploadUtils";
import { ChatRenderer } from "@/webGAL/chatRenderer";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { tuanchat } from "../../../api/instance";
import {
  useGetMemberListQuery,
  useGetRoleAvatarsQuery,
  useGetRoomRoleQuery,
  useGetUserRolesQuery,
} from "../../../api/queryHooks";

export function RoomWindow({ roomId }: { roomId: number }) {
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;
  const webSocketUtils = globalContext.websocketUtils;
  const send = webSocketUtils.send;

  const [inputText, setInputText] = useState("");
  const [curAvatarIndex, setCurAvatarIndex] = useState(0);
  const [useChatBubbleStyle, setUseChatBubbleStyle] = useState(true);
  const uploadUtils = new UploadUtils(2);

  // 承载聊天记录窗口的ref
  const chatFrameRef = useRef<HTMLDivElement>(document.createElement("div"));

  // 聊天框中包含的图片
  const [imgFiles, updateImgFiles] = useImmer<File[]>([]);

  // 获取用户的所有角色
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);
  // 获取当前群聊中的所有角色
  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  const roomRolesThatUserOwn = useMemo(() => {
    return roomRoles.filter(role => userRoles.some(userRole => userRole.roleId === role.roleId));
  }, [roomRoles, userRoles]);
  const [curRoleId, setCurRoleId] = useState(roomRolesThatUserOwn[0]?.roleId ?? -1);
  const commandExecutor = useCommandExecutor(curRoleId);
  // 获取当前用户选择角色的所有头像(表情差分)
  const roleAvatarQuery = useGetRoleAvatarsQuery(curRoleId ?? -1);
  const roleAvatars = useMemo(() => roleAvatarQuery.data?.data ?? [], [roleAvatarQuery.data?.data]);
  // 获取当前群聊的成员列表
  const membersQuery = useGetMemberListQuery(roomId);
  const members: RoomMember[] = useMemo(() => {
    return membersQuery.data?.data ?? [];
  }, [membersQuery.data?.data]);
  // 全局登录用户对应的member
  const curMember = useMemo(() => {
    return members.find(member => member.userId === userId);
  }, [members, userId]);

  // Context
  const roomContext: RoomContextType = useMemo((): RoomContextType => {
    return {
      roomId,
      roomMembers: members,
      curMember,
      roomRolesThatUserOwn,
      curRoleId,
      curAvatarId: roleAvatars[curAvatarIndex]?.avatarId ?? -1,
      useChatBubbleStyle,
    };
  }, [curAvatarIndex, curMember, curRoleId, roomId, roomRolesThatUserOwn, members, roleAvatars, useChatBubbleStyle]);

  /**
   * 当群聊角色列表更新时, 自动设置为第一个角色
   */
  useEffect(() => {
    setCurRoleId(roomRolesThatUserOwn[0]?.roleId ?? -1);
  }, [roomRolesThatUserOwn]);

  /**
   *处理与组件的各种交互
   */
  const handleSelectCommand = (cmdName: string) => {
    // 保持命令前缀格式（保留原输入的 . 或 。）
    const prefixChar = inputText[0];
    setInputText(`${prefixChar}${cmdName} `);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMessageSubmit = async () => {
    setIsSubmitting(true);
    if (!inputText.trim() && !imgFiles.length) {
      return;
    }
    if (imgFiles.length > 0) {
      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtils.uploadImg(imgFiles[i]);
        // 获取到图片的宽高
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve({ width: img.naturalWidth || 114, height: img.naturalHeight || 114 });
          };
          img.onerror = () => resolve({ width: 114, height: 114 }); // 失败时使用默认值
          img.src = URL.createObjectURL(imgFiles[i]);
        });

        if (imgDownLoadUrl && imgDownLoadUrl !== "") {
          const messageRequest: ChatMessageRequest = {
            content: "",
            roomId,
            roleId: curRoleId,
            avatarId: roleAvatars[curAvatarIndex].avatarId || -1,
            messageType: 2,
            body: {
              size: 0,
              url: imgDownLoadUrl,
              fileName: imgDownLoadUrl.split("/").pop() || `${roomId}-${Date.now()}`,
              width,
              height,
            },
          };
          send(messageRequest);
        }
      }
    }
    updateImgFiles([]);
    if (inputText.trim() !== "") {
      const messageRequest: ChatMessageRequest = {
        roomId,
        roleId: curRoleId,
        content: inputText.trim(),
        avatarId: roleAvatars[curAvatarIndex].avatarId || -1,
        messageType: 1,
        body: {},
      };
      if (isCommand(inputText)) {
        const commandResult = commandExecutor(inputText);
        messageRequest.body = {
          result: commandResult,
        };
        tuanchat.chatController.sendMessageAiResponse(messageRequest);
      }
      else {
        send(messageRequest);
      }
      setInputText("");
    }
    // 滚动到底部, 设置异步是为了等待新消息接受并渲染好
    setTimeout(() => {
      if (chatFrameRef.current) {
        chatFrameRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 300);

    setIsSubmitting(false);
  };

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // 获取剪贴板中的图片
    const items = e.clipboardData?.items;
    if (!items)
      return;
    // 如果是图片则放到imgFile中;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob)
          continue;
        const file = new File([blob], `pasted-image-${Date.now()}`, {
          type: blob.type,
        });
        updateImgFiles((draft) => {
          draft.push(file);
        });
      }
    }
  }

  const handleAvatarChange = (avatarIndex: number) => {
    setCurAvatarIndex(avatarIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSubmit();
    }
  };

  const handleRoleChange = (roleId: number) => {
    setCurRoleId(roleId);
    setCurAvatarIndex(0);
  };

  const [isRendering, setIsRendering] = useState(false);
  async function handleRender() {
    setIsRendering(true);
    try {
      const renderer = new ChatRenderer(roomId);
      await renderer.initializeRenderer();
    }
    catch (error) {
      console.error("Rendering failed:", error);
    }
  }

  /**
   *  群组设置(鳩)
   */
  const [isSettingWindowOpen, setIsSettingWindowOpen] = useState(false);

  return (
    <RoomContext value={roomContext}>
      <div className="flex flex-row p-6 gap-4 w-full min-w-0">
        {/* 聊天区域主体 */}
        <div className="flex-1 min-w-[480px] flex flex-col">
          {/* 聊天框 */}
          <div className="card bg-base-100 shadow-sm flex-1 relative">
            <button type="button" className="btn btn-ghost absolute top-0 right-0 z-50" onClick={() => { setIsSettingWindowOpen(true); }}>
              设置
            </button>
            <ChatFrame useChatBubbleStyle={useChatBubbleStyle} chatFrameRef={chatFrameRef}></ChatFrame>
          </div>
          {/* 输入区域 */}
          <form className="mt-4 bg-base-100 p-4 rounded-lg shadow-sm  ">
            <div className="flex gap-2 relative max-h-[30vh]">
              {/* 表情差分展示与选择 */}
              <div className="dropdown dropdown-top">
                <div role="button" tabIndex={0} className="flex justify-center flex-col items-center space-y-2">
                  <RoleAvatarComponent
                    avatarId={roleAvatars[curAvatarIndex]?.avatarId || -1}
                    width={32}
                    isRounded={true}
                    withTitle={false}
                    stopPopWindow={true}
                  />
                  <div>{userRoles.find(r => r.roleId === curRoleId)?.roleName || ""}</div>
                </div>
                {/* 表情差分选择器 */}
                <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 shadow-sm">
                  <ExpressionChooser
                    roleId={curRoleId}
                    handleExpressionChange={avatarId => handleAvatarChange(roleAvatars.findIndex(a => a.avatarId === avatarId))}
                  >
                  </ExpressionChooser>
                </ul>
              </div>

              <div className="w-full textarea flex-wrap overflow-auto">
                <CommandPanel prefix={inputText} handleSelectCommand={handleSelectCommand}></CommandPanel>
                {/* 图片显示 */}
                <div className="flex flex-row gap-x-3">
                  {
                    imgFiles.map((file, index) => (
                      <BetterImg
                        src={file}
                        className="h-14 w-max rounded"
                        onClose={() => updateImgFiles(draft => void draft.splice(index, 1))}
                        key={file.name}
                      />
                    ))
                  }
                </div>
                {/* text input */}
                <textarea
                  className="textarea w-full h-20 md:h-32 lg:h-40 resize-none border-none focus:outline-none focus:ring-0 "
                  rows={3}
                  placeholder="Enter your message here...(shift+enter to change line)"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={async e => handlePaste(e)}
                />
                <div className="flex items-center float-left">
                  {/* 角色选择器 */}
                  <div className="dropdown dropdown-top">
                    <div tabIndex={0} role="button" className="btn m-1">选择角色 ⬆️</div>
                    <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow-sm overflow-y-auto ">
                      <RoleChooser handleRoleChange={handleRoleChange}></RoleChooser>
                    </ul>
                  </div>
                  <ImgUploader setImg={newImg => updateImgFiles((draft) => { draft.push(newImg); })}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-600 hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {/* 图片框 */}
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2-2h4l2 2h4a2 2 0 012 2v10a2 2 0 01-2 2H5z" />
                      {/* 山峰图形 */}
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l-3-3m0 0l3-3m-3 3h6" />
                    </svg>
                  </ImgUploader>
                </div>

                <div className="float-right gap-2 flex">
                  <button className="btn" type="button" onClick={handleRender} disabled={isRendering}>
                    渲染对话
                  </button>
                  <label className="swap w-30 btn">
                    <input type="checkbox" />
                    <div className="swap-on" onClick={() => setUseChatBubbleStyle(false)}>Use Chat Bubble Style</div>
                    <div className="swap-off" onClick={() => setUseChatBubbleStyle(true)}>Use Chat Box Style</div>
                  </label>
                  {/* send button */}
                  <button
                    type="button"
                    className="btn btn-primary "
                    disabled={!(inputText.trim() || imgFiles.length) || isRendering || isSubmitting}
                    onClick={handleMessageSubmit}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
        {/* 成员与角色展示框 */}
        <RoomRightSidePanel></RoomRightSidePanel>
      </div>
      {/* 设置窗口 */}
      <PopWindow isOpen={isSettingWindowOpen} onClose={() => setIsSettingWindowOpen(false)}>
        <RoomSettingWindow onClose={() => setIsSettingWindowOpen(false)}></RoomSettingWindow>
      </PopWindow>
    </RoomContext>
  );
}

export default RoomWindow;
