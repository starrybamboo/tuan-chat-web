// export function ShareToQQButton() {
// const handleShareToQQ = () => {
//   const title = encodeURIComponent("title");
//   const summary = encodeURIComponent("summary");
//   const url = encodeURIComponent(window.location.href); 
//   const pic = encodeURIComponent("../../public/favicon.ico"); 

//   const shareUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=${summary}&pics=${pic}`;

//   window.open(shareUrl, "_blank");
// };
//     return (
//         <button
//         onClick={handleShareToQQ}
//         className="btn btn-primary"
//         >
//         分享到 QQ
//         </button>
//     );
//     }
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

  if (isLoading) return <div>加载中...</div>;
  if (error || !data) return <div>加载失败</div>;

  const title = encodeURIComponent(data.title ?? "");
  const summary = encodeURIComponent(data.description ?? "");
  const url = encodeURIComponent(window.location.href);

  const shareLink = `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=${summary}`;

  return (
    <button
    onClick={() => window.open(shareLink, "_blank", "noopener,noreferrer")}
    className="btn btn-primary"
    >
    分享到 QQ
    </button>

  );
}