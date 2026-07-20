/** message editor 头部、正文和浮层共享的布局类名。 */
export const MESSAGE_EDITOR_CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-4xl";
// 64px 角色头部向块左侧伸出 40px，窄容器需显式为它保留外侧空间。
export const MESSAGE_EDITOR_BLOCK_WIDTH_CLASS = "mx-auto w-[calc(100%_-_5rem)] max-w-4xl";
export const MESSAGE_EDITOR_BLOCK_GUTTER_CLASS = "pl-6";
export const MESSAGE_EDITOR_SPEAKER_HANDLE_CLASS = [
  "absolute z-30 inline-flex cursor-grab transition-opacity duration-150 active:cursor-grabbing",
  "opacity-100",
].join(" ");
export const MESSAGE_EDITOR_TEXT_BLOCK_PADDING_CLASS = "px-8 md:px-10";
export const MESSAGE_EDITOR_DEFAULT_FRAME_CLASS = "h-[80vh] min-h-0 rounded-md";
export const MESSAGE_EDITOR_SCROLL_VIEWPORT_CLASS = "relative min-h-0 flex-1 overflow-auto";
export const MESSAGE_EDITOR_TEXT_BLOCK_GAP_CLASS = "pb-2";
export const MESSAGE_EDITOR_COMMAND_MENU_LAYER_CLASS = "absolute left-3 right-0 top-full z-50 mt-2";
export const MESSAGE_EDITOR_POINTER_SCROLL_EDGE_PX = 72;
export const MESSAGE_EDITOR_POINTER_SCROLL_MAX_DELTA_PX = 28;
