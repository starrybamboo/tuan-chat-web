export const CHAT_MESSAGE_ROW_CLASS = "flex w-full items-start gap-1.5 sm:gap-3 py-1 sm:py-2 group relative";

const CHAT_MESSAGE_META_ROW_BASE_CLASS = "flex min-w-0 max-w-full items-center gap-2 sm:gap-3 relative";

/**
 * 消息头部只跟随角色名和时间自身宽度，避免右侧工具条预留空间过早截断角色名。
 */
export function getChatMessageMetaRowClass(): string {
  return CHAT_MESSAGE_META_ROW_BASE_CLASS;
}

export const CHAT_MESSAGE_BUBBLE_BASE_CLASS = "relative max-w-[calc(100vw-5rem)] sm:max-w-md break-words rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm sm:shadow text-base sm:text-sm lg:text-base transition-[background-color,border-color,box-shadow,color] duration-200";

export const CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS = `${CHAT_MESSAGE_BUBBLE_BASE_CLASS} bg-base-200 hover:shadow-lg hover:bg-base-300`;

export const CHAT_MESSAGE_ANNOTATIONS_CLASS = "max-w-[calc(100vw-5rem)] sm:max-w-md mt-1.5";

const CHAT_MESSAGE_HOVER_TOOLBAR_BASE_CLASS = "absolute top-2 right-2 z-30 flex items-center gap-1 rounded-full border border-base-300/80 bg-base-200/95 px-1.5 py-1 shadow-lg backdrop-blur-sm transition-[opacity,transform,background-color,border-color,box-shadow] duration-150";

/**
 * 消息工具条在移动端默认展开，避免 hover-only 入口在触屏设备上不可用。
 */
export function getChatMessageHoverToolbarClass(isMobile: boolean): string {
  return isMobile
    ? `${CHAT_MESSAGE_HOVER_TOOLBAR_BASE_CLASS} opacity-100 pointer-events-auto translate-y-0`
    : `${CHAT_MESSAGE_HOVER_TOOLBAR_BASE_CLASS} opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0`;
}
