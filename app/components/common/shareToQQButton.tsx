import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "../../../api/instance";

export default function ShareToQQButton({ feedId }: { feedId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["feed", feedId],
    queryFn: async () => {
      const res = await tuanchat.feedController.getFeedById(feedId);

      return res.data;
    },
    enabled: feedId > 0,
  });

  if (isLoading)
    return <div>加载中...</div>;
  if (error || !data)
    return <div>加载失败</div>;

  const title = encodeURIComponent(data.feed?.title ?? "");
  const summary = encodeURIComponent(data.feed?.description ?? "");
  const url = encodeURIComponent(window.location.href);

  const shareLink = `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=${summary}`;

  return (
    <button
      type="button"
      onClick={() => window.open(shareLink, "_blank", "noopener,noreferrer")}
      className="btn btn-primary"
    >
      QQ
    </button>

  );
}
