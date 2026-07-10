export type ChatSidebarActiveTone = "default" | "collapsed";

export function getChatSidebarActiveButtonClass(tone: ChatSidebarActiveTone): string {
  return tone === "collapsed"
    ? "text-warning"
    : "border-info/40 text-info";
}
