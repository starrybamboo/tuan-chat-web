// import type { ChatMessageRequest, ChatMessageResponse, Message } from "../../../../api";
// // src/stores/chatStore.ts
// import { tuanchat } from "../../../../api/instance";
// // import { wsService } from "../../../../api/services/websocket";
//
//
// export const messageManager = ({
//   // 初始状态
//   messages: new Map(),
//   currentRoomId: 0,
//   roomCursors: new Map(),
//
//   // 操作方法
//   initializeChat: (groupId) => {
//     set({ currentRoomId: groupId });
//   },
//
//   getMessageAvatarUrl: (avatarId) => {
//     return useAvatarStore.getState().getAvatarUrl(avatarId);
//   },
//
//   loadMessages: async (roomId, cursor) => {
//     try {
//       const currentCursor = cursor || get().roomCursors.get(roomId);
//
//       const response = await tuanchat.chatController.getMsgPage({
//         roomId,
//         cursor: currentCursor,
//         pageSize: 20,
//       });
//
//       if (response.data?.list) {
//         set((state) => {
//           const roomMessages = state.messages.get(roomId) || [];
//           const newMessages = new Map(state.messages);
//           newMessages.set(roomId, [...response.data!.list, ...roomMessages]);
//
//           const newCursors = new Map(state.roomCursors);
//           if (response.data!.cursor) {
//             newCursors.set(roomId, response.data!.cursor);
//           }
//
//           return {
//             messages: newMessages,
//             roomCursors: newCursors,
//           };
//         });
//       }
//     }
//     catch (error) {
//       console.error("Failed to load messages:", error);
//     }
//   },
//
//   sendMessage: async (message) => {
//     try {
//       const wsMessage = {
//         type: 3,
//         data: message,
//       };
//       wsService.sendMessage(wsMessage);
//     }
//     catch (error) {
//       console.error("Failed to send message:", error);
//     }
//   },
//
//   handleNewMessage: (message) => {
//     const roomId = get().currentRoomId;
//     if (roomId) {
//       set((state) => {
//         const roomMessages = state.messages.get(roomId) || [];
//         const newMessages = new Map(state.messages);
//         newMessages.set(roomId, [...roomMessages, message]);
//         return { messages: newMessages };
//       });
//     }
//   },
//
//   handleMessageRecall: (messageId) => {
//     const roomId = get().currentRoomId;
//     if (roomId) {
//       set((state) => {
//         const roomMessages = state.messages.get(roomId) || [];
//         const filtered = roomMessages.filter(
//           msg => msg.message.messageID !== messageId,
//         );
//
//         const newMessages = new Map(state.messages);
//         newMessages.set(roomId, filtered);
//         return { messages: newMessages };
//       });
//     }
//   },
//
//   updateMessage: async (message) => {
//     try {
//       const response = await tuanchat.chatController.updateMessage(message);
//       if (response.success && response.data) {
//         get().handleMessageUpdate(response.data);
//       }
//     }
//     catch (error) {
//       console.error("Failed to update message:", error);
//     }
//   },
//
//   handleMessageUpdate: (message) => {
//     const roomId = get().currentRoomId;
//     if (roomId) {
//       set((state) => {
//         const roomMessages = state.messages.get(roomId) || [];
//         const updated = roomMessages.map(msg =>
//           msg.message.messageID === message.messageID
//             ? { ...msg, message }
//             : msg,
//         );
//
//         const newMessages = new Map(state.messages);
//         newMessages.set(roomId, updated);
//         return { messages: newMessages };
//       });
//     }
//   },
// }));
//
// // 初始化WebSocket监听（在应用启动时调用）
// export function initializeChatWebSocket() {
//   const { handleNewMessage, handleMessageRecall, handleMessageUpdate } = messageManager.getState();
//
//   wsService.on("newMessage", handleNewMessage);
//   wsService.on("messageRecall", handleMessageRecall);
//   wsService.on("messageUpdate", handleMessageUpdate);
// }
