import React from "react";
import { DisplayChatBubble } from "./displayChatBubble";

/**
 * 头像预览组件的属性接口
 */
interface AvatarPreviewProps {
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
  chatMessages = ["这是使用新头像的聊天消息！", "头像看起来怎么样？", "完成后就可以开始聊天了~"],
  showBubbleStyle = true,
  showTraditionalStyle = true,
  hideTitle = false,
}: AvatarPreviewProps) {
  // 获取当前使用的头像URL
  const getDisplayAvatarUrl = () => {
    if (previewCanvasRef?.current) {
      try {
        return previewCanvasRef.current.toDataURL();
      }
      catch (error) {
        console.warn("Failed to get canvas data URL:", error);
        return currentAvatarUrl || "/favicon.ico";
      }
    }
    return currentAvatarUrl || "/favicon.ico";
  };

  const displayAvatarUrl = getDisplayAvatarUrl();

  // 渲染图片预览
  const renderImagePreview = () => (
    <div className={`bg-gray-50 rounded border flex items-center justify-center overflow-hidden ${className}`}>
      <img
        src={displayAvatarUrl}
        alt="预览"
        className={`object-contain ${imageClassName}`}
      />
    </div>
  );

  // 渲染聊天预览
  const renderChatPreview = () => (
    <div className={`${className}`}>
      {/* 多条chat bubble预览 */}
      {chatMessages.map(message => (
        <div key={`chat-${message}`} className="max-w-xs">
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 rounded-full">
                <img
                  alt="头像"
                  src={currentAvatarUrl || "/favicon.ico"}
                />
              </div>
            </div>
            <div className="chat-bubble">
              {characterName}
              :
              {" "}
              {message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染完整预览
  const renderFullPreview = () => (
    <>
      {!hideTitle && <h2 className="text-xl font-bold">头像预览</h2>}
      {/* 隐藏的 canvas 用于图像处理 */}
      {previewCanvasRef && (
        <canvas
          ref={previewCanvasRef}
          style={{ display: "none" }}
          className="w-64 h-64"
        />
      )}

      {/* 气泡样式预览 */}
      {showBubbleStyle && (
        <div className="relative w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          {chatMessages.map(message => (
            <DisplayChatBubble
              key={`bubble-${message}`}
              roleName={characterName}
              avatarUrl={displayAvatarUrl}
              content={message}
              useChatBubbleStyle={true}
            />
          ))}
        </div>
      )}

      {/* 传统样式预览 */}
      {showTraditionalStyle && (
        <div className="relative w-full max-w-md bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          {chatMessages.map(message => (
            <DisplayChatBubble
              key={`traditional-${message}`}
              roleName={characterName}
              avatarUrl={displayAvatarUrl}
              content={message}
              useChatBubbleStyle={false}
            />
          ))}
        </div>
      )}
    </>
  );

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
