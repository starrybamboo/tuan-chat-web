// import type { ChatMessagePageRequest, ChatMessageResponse } from "../../../api";
// import { ChatBubble } from "@/components/chat/chatBubble";
// import { GroupContext } from "@/components/chat/groupContext";
// import { useGlobalContext } from "@/components/globalContextProvider";
// import { useInfiniteQuery } from "@tanstack/react-query";
// import { useIntersectionObserver } from "@uidotdev/usehooks";
// import React, { use, useEffect, useMemo, useRef } from "react";
// import { tuanchat } from "../../../api/instance";
//
// export default function ChatFrame() {
//   const chatFrameRef = useRef<HTMLDivElement>(null);
//   // 滚动加载逻辑, 设置为倒数第n条消息的ref, 当这条消息进入用户窗口时, messageEntry.isIntersecting变为true, 之后启动滚动加载
//   const [messageRef, messageEntry] = useIntersectionObserver();
//   // 目前仅用于让首次渲染时对话框滚动到底部
//   const hasInitialized = useRef(false);
//   const userId = useGlobalContext().userId;
//   const PAGE_SIZE = 30; // 每页消息数量
//   const groupId = use(GroupContext).groupId ?? -1;
//
//   /**
//    * 获取历史消息
//    */
//   // 分页获取消息
//   // cursor用于获取当前的消息列表, 在往后端的请求中, 第一次发送null, 然后接受后端返回的cursor作为新的值
//   const messagesInfiniteQuery = useInfiniteQuery({
//     queryKey: ["getMsgPage", groupId],
//     queryFn: async ({ pageParam }) => {
//       return tuanchat.chatController.getMsgPage(pageParam);
//     },
//     getNextPageParam: (lastPage) => {
//       if (lastPage.data === undefined || lastPage.data?.isLast) {
//         return undefined;
//       }
//       else {
//         const params: ChatMessagePageRequest = { roomId: groupId, pageSize: PAGE_SIZE, cursor: lastPage.data?.cursor };
//         return params;
//       }
//     },
//     initialPageParam: { roomId: groupId, pageSize: PAGE_SIZE, cursor: null } as unknown as ChatMessagePageRequest,
//     refetchOnWindowFocus: false,
//   });
//
//   // 合并所有分页消息 同时更新重复的消息
//   const historyMessages: ChatMessageResponse[] = useMemo(() => {
//     const historyMessages = (messagesInfiniteQuery.data?.pages.reverse().flatMap(p => p.data?.list ?? []) ?? []);
//     const messageMap = new Map<number, ChatMessageResponse>();
//
//     const receivedMessages = getNewMessagesByRoomId(groupId);
//     // 这是为了更新历史消息(ws发过来的消息有可能是带有相同的messageId的, 代表消息的更新)
//     historyMessages.forEach(msg => messageMap.set(msg.message.messageID, msg));
//     receivedMessages.forEach(msg => messageMap.set(msg.message.messageID, msg));
//
//     return Array.from(messageMap.values())
//       .sort((a, b) => a.message.position - b.message.position)
//     // 过滤掉删除的消息和不符合规则的消息
//       .filter(msg => msg.message.messageType !== 0 || msg.message.status === 1);
//   }, [getNewMessagesByRoomId, groupId, messagesInfiniteQuery.data?.pages]);
//
//   /**
//    * 获取到新消息的时候，如果距底部较近,滚动到底部
//    */
//   useEffect(() => {
//     if (!hasInitialized.current) {
//       return;
//     }
//     if (chatFrameRef.current) {
//       const { scrollTop, clientHeight, scrollHeight } = chatFrameRef.current;
//       const isNearBottom = scrollTop + clientHeight > scrollHeight - 100;
//       if (isNearBottom) {
//         chatFrameRef.current.scrollTo({ top: scrollHeight, behavior: "instant" });
//       }
//     }
//   }, [historyMessages]);
//
//   /**
//    * messageEntry触发时候的effect, 同时让首次渲染时对话框滚动到底部
//    */
//   useEffect(() => {
//     if (!hasInitialized.current) {
//       return;
//     }
//     if (messageEntry?.isIntersecting && messagesInfiniteQuery.hasNextPage && !messagesInfiniteQuery.isFetchingNextPage && chatFrameRef.current) {
//       // 记录之前的滚动位置并在fetch完后移动到该位置, 防止连续多次获取
//       const scrollBottom = chatFrameRef.current.scrollHeight - chatFrameRef.current.scrollTop;
//       messagesInfiniteQuery.fetchNextPage().then(() => {
//         if (chatFrameRef.current) {
//           chatFrameRef.current.scrollTo({ top: chatFrameRef.current.scrollHeight - scrollBottom, behavior: "instant" });
//         }
//       });
//     }
//   }, [messageEntry?.isIntersecting, messagesInfiniteQuery.hasNextPage, messagesInfiniteQuery.isFetchingNextPage, messagesInfiniteQuery.fetchNextPage, messagesInfiniteQuery]);
//   /**
//    * 第一次获取消息的时候, 滚动到底部
//    */
//   useEffect(() => {
//     let timeoutId: NodeJS.Timeout;
//     if (!hasInitialized.current && messagesInfiniteQuery.isFetchedAfterMount) {
//       timeoutId = setTimeout(() => {
//         if (chatFrameRef.current) {
//           chatFrameRef.current.scrollTo({ top: chatFrameRef.current.scrollHeight, behavior: "instant" });
//         }
//         hasInitialized.current = true;
//       }, 200);
//     }
//     return () => { // 清理函数
//       if (timeoutId) {
//         clearTimeout(timeoutId); // 清除定时器
//       }
//     };
//   }, [messagesInfiniteQuery.isFetchedAfterMount]);
//   const renderMessages = useMemo(() => (historyMessages
//   // .filter(chatMessageResponse => chatMessageResponse.message.content !== "")
//     .map((chatMessageResponse, index) => {
//       const isSelected = selectedMessageIds.has(chatMessageResponse.message.messageID);
//       return ((
//         <div
//           key={chatMessageResponse.message.messageID}
//           ref={index === 1 ? messageRef : null}
//           className={`relative group transition-opacity ${isSelected ? "bg-info-content/40" : ""}`}
//           onClick={(e) => {
//             if (isSelecting || e.ctrlKey) {
//               toggleMessageSelection(chatMessageResponse.message.messageID);
//             }
//           }}
//           onDragOver={handleDragOver}
//           onDragLeave={handleDragLeave}
//           onDrop={e => handleDrop(e, index)}
//           onDragEnd={() => handleDragEnd()}
//         >
//           <div
//             className={`absolute left-0 ${useChatBubbleStyle ? "bottom-[30px]" : "top-[30px]"}
//                       -translate-x-full -translate-y-1/ opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-2 cursor-move`}
//             draggable
//             onDragStart={e => handleDragStart(e, index)}
//           >
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M4 6h16M4 12h16M4 18h16"
//               />
//             </svg>
//           </div>
//           <ChatBubble
//             chatMessageResponse={chatMessageResponse}
//             useChatBubbleStyle={useChatBubbleStyle}
//           />
//         </div>
//       )
//       );
//     })), [historyMessages, isSelecting, messageRef, selectedMessageIds]);
//   return (
//     <div className="card-body overflow-y-auto h-[60vh]" ref={chatFrameRef}>
//       {selectedMessageIds.size > 0 && (
//         <div className="sticky top-0 bg-base-300 p-2 shadow-sm z-10 flex justify-between items-center rounded">
//           <span>{`已选择${selectedMessageIds.size} 条消息`}</span>
//           <div className="gap-x-4 flex">
//             <button
//               className="btn btn-sm btn"
//               onClick={() => updateSelectedMessageIds(new Set())}
//               type="button"
//             >
//               取消
//             </button>
//             <button
//               className="btn btn-sm btn-info"
//               onClick={() => setIsForwardWindowOpen(true)}
//               type="button"
//             >
//               转发
//             </button>
//           </div>
//         </div>
//       )}
//       {renderMessages}
//     </div>
//   );
// }
