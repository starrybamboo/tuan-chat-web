import { hasMeaningfulMediaContent, normalizeMediaContent } from "@/components/common/content/mediaContent";
import { MarkDownViewer } from "@/components/common/markdown/markDownViewer";

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

  return <MarkDownViewer content={normalizedContent} className={className} />;
}
