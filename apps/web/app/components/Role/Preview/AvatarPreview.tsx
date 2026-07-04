import React from "react";

import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { MediaImage } from "@/components/common/mediaImage";
import { ROLE_DEFAULT_AVATAR_URL } from "@/constants/defaultAvatar";

import { DisplayChatBubble } from "./displayChatBubble";

/**
 * 头像预览组件的属性接口
 */
type AvatarPreviewProps = {
  // 预览Canvas引用
  previewCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  // 当前头像URL（备用）
  currentAvatarUrl?: string;
  // 角色名称
  characterName?: string;
  // 预览模式: 'full' - 完整预览(默认), 'image' - 仅图片预览, 'chat' - 仅聊天预览
  mode?: "full" | "image" | "chat";
  // 自定义类名
  className?: string;
  // 图片样式类名
  imageClassName?: string;
  // 自定义聊天消息
  chatMessages?: string[];
  // 是否显示气泡样式
  showBubbleStyle?: boolean;
  // 是否显示传统样式
  showTraditionalStyle?: boolean;
  // 是否隐藏标题
  hideTitle?: boolean;
  // 可选的渲染版本号，用于在上层 canvas 内容变化时触发子组件重绘
  previewRenderKey?: number;
  // 布局模式: 'toggle' - 切换按钮(默认), 'horizontal' - 横向排列, 'vertical' - 纵向排列
  layout?: "toggle" | "horizontal" | "vertical";
}

/**
 * 头像预览组件
 * 支持完整预览、图片预览、聊天预览等多种模式
 */
function AvatarPreviewComponent({
  previewCanvasRef,
  currentAvatarUrl,
  characterName = "角色名",
  mode = "full",
  className = "",
  imageClassName = "",
  chatMessages = ["这是使用新头像的聊天消息！", "完成后就可以开始聊天了~"],
  showBubbleStyle = true,
  showTraditionalStyle = true,
  hideTitle = false,
  previewRenderKey,
  layout = "toggle",
}: AvatarPreviewProps) {
  // 不在渲染路径中导出 canvas 的 dataURL，改为直接在聊天气泡中使用源 canvas（通过 ref 复制）
  // displayAvatarUrl 仍可用作 image 模式的后备
  const displayAvatarUrl = currentAvatarUrl || ROLE_DEFAULT_AVATAR_URL;
  const roomUseChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const activeUseChatBubbleStyle = roomUseChatBubbleStyle ? showBubbleStyle : !showTraditionalStyle;

  // 渲染图片预览
  const renderImagePreview = () => (
    <div className={`
      bg-base-100 rounded border border-base-300 flex items-center justify-center overflow-hidden
      ${className}
    `}>
      {previewCanvasRef
        ? (
            <canvas ref={previewCanvasRef} className={`
              object-contain
              ${imageClassName}
              size-full
            `} />
          )
        : (
            <MediaImage
              src={displayAvatarUrl}
              alt="预览"
              className={`
                object-contain
                ${imageClassName}
              `}
            />
          )}
    </div>
  );

  // 渲染聊天预览
  const renderChatPreview = () => (
    <div className={`
      ${className}
    `}>
      {chatMessages.map(message => (
        <DisplayChatBubble
          key={`chat-${message}`}
          roleName={characterName}
          avatarCanvasRef={previewCanvasRef}
          avatarUrl={displayAvatarUrl}
          renderKey={previewRenderKey}
          content={message}
          useChatBubbleStyle={activeUseChatBubbleStyle}
        />
      ))}
    </div>
  );

  // 渲染完整预览
  const renderFullPreview = () => {
    const previewContent = (
      <div className="
        ml-auto w-14/15 rounded-lg border border-base-300 bg-base-100/50 p-4
        space-y-2
      ">
        {chatMessages.map(message => (
          <DisplayChatBubble
            key={`preview-${message}`}
            roleName={characterName}
            avatarCanvasRef={previewCanvasRef}
            avatarUrl={displayAvatarUrl}
            content={message}
            useChatBubbleStyle={activeUseChatBubbleStyle}
            renderKey={previewRenderKey}
          />
        ))}
      </div>
    );

    return (
      <>
        {!hideTitle && <h2 className="text-xl font-bold">头像预览</h2>}
        {/* 隐藏的 canvas 用于图像处理 */}
        {previewCanvasRef && (
          <canvas
            ref={previewCanvasRef}
            style={{ display: "none" }}
            className="size-64"
          />
        )}

        {/* 根据 layout 模式渲染不同布局 */}
        {layout === "toggle" && (
          <div className="relative w-full">
            {previewContent}
          </div>
        )}

        {layout === "horizontal" && (
          <div className="flex gap-4 w-full">
            <div className="flex-1">
              {previewContent}
            </div>
          </div>
        )}

        {layout === "vertical" && (
          <div className="flex flex-col gap-4 w-full">
            <div>
              {previewContent}
            </div>
          </div>
        )}
      </>
    );
  };

  // 根据模式渲染不同内容
  switch (mode) {
    case "image":
      return renderImagePreview();
    case "chat":
      return renderChatPreview();
    case "full":
    default:
      return renderFullPreview();
  }
}

export const AvatarPreview = React.memo(AvatarPreviewComponent);
