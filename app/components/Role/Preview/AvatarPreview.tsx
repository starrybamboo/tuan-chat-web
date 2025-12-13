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
  // 可选的渲染版本号，用于在上层 canvas 内容变化时触发子组件重绘
  previewRenderKey?: number;
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
  previewRenderKey,
}: AvatarPreviewProps) {
  // 不在渲染路径中导出 canvas 的 dataURL，改为直接在聊天气泡中使用源 canvas（通过 ref 复制）
  // displayAvatarUrl 仍可用作 image 模式的后备
  const displayAvatarUrl = currentAvatarUrl || "/favicon.ico";

  // 本地状态：在气泡样式和传统样式之间切换（当两者都可用时）
  const [selectedStyle, setSelectedStyle] = React.useState<"bubble" | "traditional">(() =>
    showBubbleStyle ? "bubble" : "traditional",
  );

  // 渲染图片预览
  const renderImagePreview = () => (
    <div className={`bg-gray-50 rounded border flex items-center justify-center overflow-hidden ${className}`}>
      {previewCanvasRef?.current
        ? (
            <canvas ref={previewCanvasRef} className={`object-contain ${imageClassName} w-full h-full`} />
          )
        : (
            <img
              src={displayAvatarUrl}
              alt="预览"
              className={`object-contain ${imageClassName}`}
            />
          )}
    </div>
  );

  // 渲染聊天预览
  const renderChatPreview = () => (
    <div className={`${className}`}>
      {/* 多条chat bubble预览：使用 DisplayChatBubble（从 preview canvas 复制） */}
      {chatMessages.map(message => (
        <DisplayChatBubble
          key={`chat-${message}`}
          roleName={characterName}
          avatarCanvasRef={previewCanvasRef}
          avatarUrl={displayAvatarUrl}
          renderKey={previewRenderKey}
          content={message}
          useChatBubbleStyle={true}
        />
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

      {/* 当两种样式都可用时，显示切换按钮（仅一次显示一个样式） */}
      {/* 预览容器（相对定位），按钮绝对定位在右上角，不占单独空间 */}
      <div className="relative w-full">
        {showBubbleStyle && showTraditionalStyle && (
          <button
            type="button"
            className="btn btn-sm btn-ghost absolute right-2 top-2 z-10"
            onClick={() => setSelectedStyle(selectedStyle === "bubble" ? "traditional" : "bubble")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            切换
            {selectedStyle === "bubble" ? "传统" : "气泡"}
            样式
          </button>
        )}

        {/* 根据可用性与选择渲染对应的样式（保证一次只显示一个） */}
        {((showBubbleStyle && !showTraditionalStyle) || (showBubbleStyle && showTraditionalStyle && selectedStyle === "bubble")) && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            {chatMessages.map(message => (
              <DisplayChatBubble
                key={`bubble-${message}`}
                roleName={characterName}
                avatarCanvasRef={previewCanvasRef}
                avatarUrl={displayAvatarUrl}
                content={message}
                useChatBubbleStyle={true}
                renderKey={previewRenderKey}
              />
            ))}
          </div>
        )}

        {((showTraditionalStyle && !showBubbleStyle) || (showBubbleStyle && showTraditionalStyle && selectedStyle === "traditional")) && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            {chatMessages.map(message => (
              <DisplayChatBubble
                key={`traditional-${message}`}
                roleName={characterName}
                avatarCanvasRef={previewCanvasRef}
                avatarUrl={displayAvatarUrl}
                content={message}
                useChatBubbleStyle={false}
                renderKey={previewRenderKey}
              />
            ))}
          </div>
        )}
      </div>
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
