import React from "react";
import { DisplayChatBubble } from "../displayChatBubble";

/**
 * 头像预览组件的属性接口
 */
interface AvatarPreviewProps {
  // 预览Canvas引用
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  // 当前头像URL
  currentAvatarUrl: string;
  // 角色名称
  characterName?: string;
}

/**
 * 头像预览组件
 * 显示气泡样式和传统样式的聊天预览
 */
export function AvatarPreview({
  previewCanvasRef,
  currentAvatarUrl,
  characterName = "角色名",
}: AvatarPreviewProps) {
  return (
    <>
      <h2 className="text-xl font-bold">头像预览</h2>
      {/* 隐藏的 canvas 用于图像处理 */}
      <canvas
        ref={previewCanvasRef}
        style={{ display: "none" }}
        className="w-64 h-64"
      />

      {/* 气泡样式预览 */}
      <div className="relative w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
        <DisplayChatBubble
          roleName={characterName}
          avatarUrl={currentAvatarUrl}
          content="这是使用新头像的聊天消息！"
          useChatBubbleStyle={true}
        />
        <DisplayChatBubble
          roleName={characterName}
          avatarUrl={currentAvatarUrl}
          content="头像看起来怎么样？"
          useChatBubbleStyle={true}
        />
        <DisplayChatBubble
          roleName={characterName}
          avatarUrl={currentAvatarUrl}
          content="完成后就可以开始聊天了~"
          useChatBubbleStyle={true}
        />
      </div>

      {/* 传统样式预览 */}
      <div className="relative w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
        <DisplayChatBubble
          roleName={characterName}
          avatarUrl={currentAvatarUrl}
          content="这是使用新头像的聊天消息！"
          useChatBubbleStyle={false}
        />
        <DisplayChatBubble
          roleName={characterName}
          avatarUrl={currentAvatarUrl}
          content="头像看起来怎么样？"
          useChatBubbleStyle={false}
        />
        <DisplayChatBubble
          roleName={characterName}
          avatarUrl={currentAvatarUrl}
          content="完成后就可以开始聊天了~"
          useChatBubbleStyle={false}
        />
      </div>
    </>
  );
}
