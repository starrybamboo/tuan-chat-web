import { lazy, Suspense } from "react";
import { hasMeaningfulMediaContent, normalizeMediaContent } from "@/components/common/content/mediaContent";

const LazyMarkDownViewer = lazy(async () => {
  const module = await import("@/components/common/markdown/markDownViewer");
  return { default: module.MarkDownViewer };
});

export default function MediaContentView({
  content,
  emptyText = "暂无内容。",
  className,
}: {
  content?: string | null;
  emptyText?: string;
  className?: string;
}) {
  const normalizedContent = normalizeMediaContent(content);

  if (!hasMeaningfulMediaContent(normalizedContent)) {
    return (
      <div className="text-sm text-base-content/50">
        {emptyText}
      </div>
    );
  }

  return (
    <Suspense fallback={<div className={`text-sm text-base-content/50 ${className ?? ""}`}>正在加载内容...</div>}>
      <LazyMarkDownViewer content={normalizedContent} className={className} />
    </Suspense>
  );
}
