/** message editor 头部、正文和浮层共享的布局类名。 */
export const MESSAGE_EDITOR_CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-4xl";
// 角色头部向 shell 左侧伸出 48px；shell 右移伸出量的一半，使整个可见组合居中。
export const MESSAGE_EDITOR_BLOCK_WIDTH_CLASS = "left-6 mx-auto w-[calc(100%_-_8rem)] max-w-4xl";
export const MESSAGE_EDITOR_BLOCK_GUTTER_CLASS = "pl-6";
export const MESSAGE_EDITOR_BLOCK_GAP_CLASS = "pb-3";
export const MESSAGE_EDITOR_SPEAKER_HANDLE_CLASS = [
  "absolute z-30 inline-flex cursor-grab transition-opacity duration-150 active:cursor-grabbing",
  "opacity-100",
].join(" ");
export const MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS = "px-8 md:px-10";
export const MESSAGE_EDITOR_DEFAULT_FRAME_CLASS = "h-[80vh] min-h-0 rounded-md";
export const MESSAGE_EDITOR_SCROLL_VIEWPORT_CLASS = "relative min-h-0 flex-1 overflow-auto";
export const MESSAGE_EDITOR_COMMAND_MENU_LAYER_CLASS = "absolute left-3 right-0 top-full z-50 mt-2";
export const MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS = "w-1/2 max-w-full";

export function getMessageEditorMediaFrameClassName(options: {
  hasCustomWidth: boolean;
  isImage: boolean;
}) {
  return [
    "group/media relative max-w-full overflow-hidden rounded-xl bg-base-100",
    options.isImage ? "border border-base-300/60" : "",
    options.isImage && !options.hasCustomWidth ? MESSAGE_EDITOR_DEFAULT_IMAGE_WIDTH_CLASS : "",
  ].join(" ");
}

export const MESSAGE_EDITOR_POINTER_SCROLL_EDGE_PX = 72;
export const MESSAGE_EDITOR_POINTER_SCROLL_MAX_DELTA_PX = 28;
