export const documentModalShellClassName = "overflow-hidden bg-base-100 flex flex-col";

export function getDocumentModalFrameClassName(isMobile: boolean) {
  if (isMobile)
    return "w-full h-full";

  return "w-[min(1280px,98vw)] h-[min(90vh,920px)] rounded-2xl border border-base-300/80 shadow-2xl";
}
