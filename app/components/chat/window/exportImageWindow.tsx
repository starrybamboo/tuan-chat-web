import type { ChatMessageResponse } from "../../../../api";
import * as htmltoimage from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChatBubble } from "@/components/chat/message/chatBubble";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";

async function loadQRCode() {
  const mod = await import("qrcode");
  return (mod as any).default ?? mod;
}

interface ExportImageWindowProps {
  /** 选中的消息列表 */
  selectedMessages: ChatMessageResponse[];
  /** 空间标题 */
  spaceName?: string | null;
  /** 群聊标题 */
  roomName?: string | null;
  /** 关闭窗口回调 */
  onClose: () => void;
}

// 加载图片函数
function loadImage(imgUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = _err => reject(new Error(`加载失败：${imgUrl}`));
    img.src = imgUrl;
  });
}

function isTransparentColor(color: string | null | undefined): boolean {
  if (!color) {
    return true;
  }
  const normalized = color.replace(/\s+/g, "").toLowerCase();
  return normalized === "transparent" || normalized === "rgba(0,0,0,0)";
}

function isDarkThemeActive(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  const root = document.documentElement;
  const theme = root.dataset.theme?.toLowerCase() ?? "";
  return theme.includes("dark") || root.classList.contains("dark");
}

const TRANSPARENT_IMAGE_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

/**
 * 导出聊天消息为图片的窗口组件
 */
export default function ExportImageWindow({
  selectedMessages,
  spaceName,
  roomName,
  onClose,
}: ExportImageWindowProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showQRCode, setShowQRCode] = useState(true);
  const [useBubbleStyle, setUseBubbleStyle] = useState(() => useRoomPreferenceStore.getState().useChatBubbleStyle);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const displaySpaceName = (spaceName ?? "").trim();
  const displayRoomName = (roomName ?? "").trim();
  const headerText = useMemo(() => {
    const parts: string[] = [];
    if (displaySpaceName)
      parts.push(`「 ${displaySpaceName} 」`);
    if (displayRoomName)
      parts.push(`「 ${displayRoomName} 」`);
    return parts.join(" —");
  }, [displayRoomName, displaySpaceName]);
  const hasHeader = headerText.length > 0;

  // 按消息位置排序
  const sortedMessages = useMemo(
    () => [...selectedMessages].sort((a, b) => a.message.position - b.message.position),
    [selectedMessages],
  );

  // 生成带有第一条消息 ID 的 URL
  const getShareUrl = useCallback(() => {
    const firstMessageId = sortedMessages[0]?.message.messageId;
    if (!firstMessageId)
      return window.location.href;

    // 获取当前 URL 的基础路径（不包含 messageId 部分）
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/").filter(Boolean);

    // 路由格式: /chat/:spaceId/:roomId/:messageId?
    // 确保路径包含 chat/spaceId/roomId
    if (pathParts[0] === "chat" && pathParts.length >= 3) {
      // 替换或添加 messageId
      if (pathParts.length >= 4) {
        pathParts[3] = String(firstMessageId);
      }
      else {
        pathParts.push(String(firstMessageId));
      }
      url.pathname = `/${pathParts.join("/")}`;
    }

    return url.toString();
  }, [sortedMessages]);

  // 生成预览用的二维码
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        if (typeof window === "undefined")
          return;

        const QRCode = await loadQRCode();
        const shareUrl = getShareUrl();
        const dataUrl = await QRCode.toDataURL(shareUrl, {
          width: 120,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrCodeDataUrl(dataUrl);
      }
      catch (error) {
        console.error("生成二维码失败:", error);
      }
    };
    generateQRCode();
  }, [getShareUrl]);

  const handleExport = useCallback(async () => {
    if (!contentRef.current) {
      toast.error("未找到内容区域");
      return;
    }

    try {
      setIsExporting(true);
      const contentStyle = window.getComputedStyle(contentRef.current);
      const bodyStyle = window.getComputedStyle(document.body);
      const isDarkTheme = isDarkThemeActive();
      const exportBackgroundColor = !isTransparentColor(contentStyle.backgroundColor)
        ? contentStyle.backgroundColor
        : (!isTransparentColor(bodyStyle.backgroundColor) ? bodyStyle.backgroundColor : "#ffffff");
      const footerTextColor = isDarkTheme ? "rgba(229, 231, 235, 0.85)" : "#666666";
      const watermarkColor = isDarkTheme ? "rgba(229, 231, 235, 0.5)" : "rgba(128, 128, 128, 0.5)";

      // 暂时移除 Google Fonts 链接以避免跨域问题
      const googleFonts = Array.from(document.querySelectorAll("link[href*=\"fonts.googleapis.com\"]"));
      googleFonts.forEach(link => link.remove());

      const contentWidth = Math.max(600, Math.ceil(contentRef.current.getBoundingClientRect().width));

      // 克隆节点用于截图
      const cloneNode = contentRef.current.cloneNode(true) as HTMLElement;
      cloneNode.style.width = `${contentWidth}px`;
      cloneNode.style.boxSizing = "border-box";

      // 创建临时容器
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.zIndex = "-1";
      tempContainer.style.width = `${contentWidth}px`;
      tempContainer.style.background = exportBackgroundColor;
      tempContainer.style.padding = "20px";
      tempContainer.appendChild(cloneNode);
      document.body.appendChild(tempContainer);

      let contentImageUrl = "";
      try {
        // 生成消息内容图片
        contentImageUrl = await htmltoimage.toPng(cloneNode, {
          backgroundColor: exportBackgroundColor,
          pixelRatio: 2,
          imagePlaceholder: TRANSPARENT_IMAGE_PLACEHOLDER,
          // 某些资源 URL 会返回 HTML 而不是图片，导致解码失败。这里降级为透明占位，避免整次导出失败。
          onImageErrorHandler: (event) => {
            const target = (event as Event | undefined)?.target as HTMLImageElement | null;
            if (target && target.tagName === "IMG") {
              target.src = TRANSPARENT_IMAGE_PLACEHOLDER;
            }
          },
        });
      }
      finally {
        // 恢复 Google Fonts
        googleFonts.forEach(link => document.head.appendChild(link));
      }

      // 加载消息内容图片
      const contentImage = await loadImage(contentImageUrl);

      // 创建最终画布
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("无法创建画布上下文");
      }

      const PADDING = 40;
      const QR_SIZE = 120;
      const FOOTER_HEIGHT = showQRCode ? QR_SIZE + 60 : 40;
      const canvasWidth = contentImage.width + PADDING * 2;
      const canvasHeight = contentImage.height + PADDING + FOOTER_HEIGHT;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 绘制主题背景
      ctx.fillStyle = exportBackgroundColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 绘制消息内容
      ctx.drawImage(contentImage, PADDING, PADDING / 2);

      // 如果启用二维码，生成并绘制
      if (showQRCode) {
        const QRCode = await loadQRCode();
        const shareUrl = getShareUrl();
        const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
          width: QR_SIZE,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        const qrImage = await loadImage(qrCodeDataUrl);

        // 绘制二维码（居中）
        const qrX = (canvasWidth - QR_SIZE) / 2;
        const qrY = canvasHeight - FOOTER_HEIGHT + 10;
        ctx.drawImage(qrImage, qrX, qrY, QR_SIZE, QR_SIZE);

        // 绘制提示文字
        ctx.font = "14px Arial, sans-serif";
        ctx.fillStyle = footerTextColor;
        ctx.textAlign = "center";
        ctx.fillText("扫码查看更多", canvasWidth / 2, canvasHeight - 15);
      }

      // 绘制底部水印
      ctx.save();
      ctx.font = "12px Arial, sans-serif";
      ctx.fillStyle = watermarkColor;
      ctx.textAlign = "right";
      ctx.fillText("tuan-chat", canvasWidth - 20, canvasHeight - 10);
      ctx.restore();

      // 清理临时容器
      document.body.removeChild(tempContainer);

      // 下载图片
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `chat-export-${Date.now()}.png`;
      link.click();

      toast.success("图片导出成功！");
      onClose();
    }
    catch (error) {
      console.error("导出图片失败:", error);
      toast.error("导出图片失败，请重试");
    }
    finally {
      setIsExporting(false);
    }
  }, [showQRCode, onClose, getShareUrl]);

  return (
    <div className="flex flex-col gap-4 p-4 w-[90vw] max-w-[900px] max-h-[80vh]">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">导出聊天图片</h2>
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-circle"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      {/* 选项区域 */}
      <div className="flex gap-4 items-center flex-wrap bg-base-200 p-3 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showQRCode}
            onChange={e => setShowQRCode(e.target.checked)}
            className="checkbox checkbox-sm checkbox-primary"
          />
          <span className="text-sm">显示二维码</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useBubbleStyle}
            onChange={e => setUseBubbleStyle(e.target.checked)}
            className="checkbox checkbox-sm checkbox-primary"
          />
          <span className="text-sm">气泡样式</span>
        </label>
        <span className="text-sm text-base-content/60">
          已选择
          {" "}
          {sortedMessages.length}
          {" "}
          条消息
        </span>
      </div>

      {/* 预览区域 */}
      <div className="overflow-auto max-h-[50vh] border border-base-300 rounded-lg bg-base-100">
        <div ref={contentRef} className="p-4 bg-base-100 text-base-content">
          {hasHeader && (
            <div className="mb-3 pb-3 border-b border-base-300">
              <div className="text-base font-bold text-base-content">{headerText}</div>
            </div>
          )}
          {sortedMessages.map(msg => (
            <div key={msg.message.messageId} className="export-message-item">
              <ChatBubble
                chatMessageResponse={msg}
                useChatBubbleStyle={useBubbleStyle}
              />
            </div>
          ))}
        </div>

        {/* 预览二维码区域 */}
        {showQRCode && (
          <div className="flex flex-col items-center py-4 bg-base-100 border-t border-base-300">
            {qrCodeDataUrl
              ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="二维码"
                    className="w-[120px] h-[120px]"
                  />
                )
              : (
                  <div className="w-[120px] h-[120px] bg-base-200 flex items-center justify-center rounded">
                    <span className="loading loading-spinner loading-sm"></span>
                  </div>
                )}
            <span className="text-sm text-base-content/60 mt-2">扫码查看更多</span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
        >
          取消
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleExport}
          disabled={isExporting || sortedMessages.length === 0}
        >
          {isExporting
            ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  导出中...
                </>
              )
            : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出图片
                </>
              )}
        </button>
      </div>
    </div>
  );
}
