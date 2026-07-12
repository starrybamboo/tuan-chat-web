export type ChatSidebarActiveTone = "default" | "collapsed";

/** 返回空间侧栏当前按钮与选中条一致的语义色。 */
export function getChatSidebarActiveTextClassName(tone: ChatSidebarActiveTone) {
  return tone === "collapsed" ? "text-warning" : "text-info";
}

export const chatSidebarFocusClassName
  = "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/60 focus-visible:ring-offset-2 focus-visible:ring-offset-base-200";
