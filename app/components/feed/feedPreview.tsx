// import type { FeedStats } from "@/types/feedTypes";
// import type { PostListResponse } from "api";
// import CommentPanel from "@/components/common/comment/commentPanel";
// import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
// import LikeIconButton from "@/components/common/likeIconButton";
// import ShareIconButton from "@/components/common/shareIconButton";
// import UserAvatarComponent from "@/components/common/userAvatar";
// import { EllipsisVertical } from "@/icons";
// import { useState } from "react";
// import { useNavigate } from "react-router";
// import CollectionIconButton from "../common/collection/collectionIconButton";
// import CommentIconButton from "../common/comment/commentIconButton";
// import DislikeIconButton from "../common/dislikeIconButton";
// import SlidableChatPreview from "../community/slidableChatPreview";
//
// interface FeedPreviewProps {
//   feed?: PostListResponse;
//   stats: FeedStats;
//   onDislike?: () => void;
// }
//
// export default function FeedPreview({ feed, stats, onDislike }: FeedPreviewProps) {
//   const [showComments, setShowComments] = useSearchParamsState<boolean>(
//     `feedShowCommentsPop${feed?.communityPostId}`,
//     false,
//   );
//
//   const navigate = useNavigate();
//
//   const [showMoreOptions, setShowMoreOptions] = useState(false);
//   // 简化：此组件上下文中可以保证 message 一定是转发消息，不再需要额外预览弹窗
//
//   // 滑动消失
//   const [isRemoving, setIsRemoving] = useState(false);
//
//   const handlejumpToPostDetail = () => {
//     navigate(`/community/${feed?.communityId}/${feed?.communityPostId}`);
//   };
//
//   const handleDislikeClick = () => {
//     setIsRemoving(true); // 触发滑动动画
//     setTimeout(() => {
//       onDislike?.(); // 动画结束后移除 feed
//     }, 500); // 与 transition 时间一致
//   };
//
//   // 暂时用社区详情代替
//   // const [showDetail, setShowDetail] = useState(false);
//   // if (showDetail) {
//   //   return <CommunityPostDetail postId={feed?.communityPostId ?? -1}  />;
//   // }
//   return (
//     <article
//       className={`bg-base-100 border border-base-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden ${isRemoving ? "opacity-0 -translate-x-4" : "opacity-100 translate-x-0"}`}
//     >
//       <div className="p-4 flex flex-col gap-2 relative">
//         {/* 头部 */}
//         <div className="flex items-center gap-2 justify-between">
//           <UserAvatarComponent userId={feed?.userId ?? -1} width={10} isRounded withName={true} />
//           {/* 更多操作 */}
//           <div className="relative" onMouseEnter={() => setShowMoreOptions(true)} onMouseLeave={() => setShowMoreOptions(false)}>
//             <button className="btn btn-xs btn-ghost btn-circle hover:bg-base-200" type="button">
//               <EllipsisVertical className="w-4 h-4 text-base-content/60" />
//             </button>
//             {showMoreOptions && (
//               <div className="absolute right-0 top-full mt-2 w-32 bg-base-100 border border-base-300 shadow-lg rounded-lg z-50 text-sm overflow-hidden">
//                 <DislikeIconButton
//                   className="w-full justify-start px-3 py-2 hover:bg-base-200 transition-colors"
//                   onDislike={handleDislikeClick}
//                 />
//               </div>
//             )}
//           </div>
//         </div>
//
//         {/* 消息内容容器(固定尺寸) */}
//         {feed?.message && (
//           <SlidableChatPreview
//             messageResponse={feed.message}
//             maxHeight="160px"
//             showAvatars={true}
//             beFull={true}
//           />
//         )}
//
//         {/* 可点击区域：消息内容、标题、描述 */}
//         <div
//           className="cursor-pointer group space-y-2"
//           onClick={handlejumpToPostDetail}
//           tabIndex={0}
//           role="button"
//         >
//           {/* 标题单独一行 */}
//           {feed?.title && (
//             <h2 className="font-extrabold leading-snug text-base-content/90 text-base line-clamp-2 group-hover:underline">
//               {feed.title}
//             </h2>
//           )}
//
//           {/* 文本描述 */}
//           {feed?.description && (
//             <p className="text-sm text-base-content/85 whitespace-pre-line leading-relaxed">
//               {feed.description}
//             </p>
//           )}
//         </div>
//
//         {/* 右下角操作按钮 */}
//         <div className="flex items-center justify-end mt-1">
//           <div className="flex items-center gap-2">
//             <LikeIconButton
//               targetInfo={{ targetId: feed?.communityPostId ?? -1, targetType: "2" }}
//               className="btn btn-xs btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200"
//               direction="row"
//               likeCount={stats.likeCount}
//             />
//             <CollectionIconButton
//               targetInfo={{ resourceId: feed?.communityPostId ?? -1, resourceType: "2" }}
//               className="btn btn-xs btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-200"
//             />
//             <CommentIconButton
//               feedId={feed?.communityPostId ?? -1}
//               commentCount={stats.commentCount}
//               showComments={showComments}
//               onToggle={() => setShowComments(!showComments)}
//             />
//             <ShareIconButton searchKey={`feedShowSharePop${feed?.communityPostId}`} />
//           </div>
//         </div>
//
//       </div>
//       {showComments && (
//         <div className="px-4 pb-4 border-t border-base-300/50 bg-base-50">
//           <div className="pt-3">
//             <CommentPanel targetInfo={{ targetId: feed?.communityPostId ?? -1, targetType: "2" }} className="h-full" />
//           </div>
//         </div>
//       )}
//     </article>
//   );
// }