import MediaContentView from "@/components/common/content/mediaContentView";

export default function FeedbackIssueContent({
  content,
}: {
  content?: string | null;
}) {
  return (
    <MediaContentView
      content={content}
      emptyText="暂无正文内容。"
      className="[&_p]:my-0 [&_p+_p]:mt-4 [&_img]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_pre]:my-3 [&_blockquote]:my-3"
    />
  );
}
