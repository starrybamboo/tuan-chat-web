// import type { Message } from "@/view/chat/components/message";
import type { Message } from "../../../../api";
import RoleAvatarComponent from "@/view/common/roleAvatar";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "../../../../api/instance";
/**
 * 聊天风格的对话框组件
 */

export function ChatBubble({ message, useChatBoxStyle }: { message: Message; useChatBoxStyle: boolean }) {
  const useRoleRequest = useQuery({
    queryKey: ["roleController.getRole", message.roleId],
    queryFn: () => tuanchat.roleController.getRole(message.roleId),
  });

  if (useChatBoxStyle) {
    return (
    // <div className={message.type !== "user" ? "chat chat-start" : "chat chat-end"} key={message.id}>
      <div className="chat chat-start" key={message.messageID}>
        <div className="avatar chat-image">
          <RoleAvatarComponent avatarId={message.avatarId} width={10} isRounded={true}></RoleAvatarComponent>
        </div>

        <div
          className={message.messageType !== 0 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>
            {message.content}
          </div>
        </div>
        <div className="chat-footer">
          {(useRoleRequest.isPending || useRoleRequest.error || useRoleRequest.data === undefined) ? "" : useRoleRequest.data.data?.roleName}
          <time className="text-xs opacity-50">
            {message.createTime?.toLocaleString() ?? ""}
          </time>
        </div>
        {/* <div className="chat-footer opacity-50">Seen</div> */}
      </div>
    );
  }
  else {
    return (
      <div className="flex w-full mb-4" key={message.messageID}>
        {/* 圆角矩形头像（始终显示） */}

        <div className="flex-shrink-0 mr-3">
          <div className="w-20 h-20 rounded-md overflow-hidden">
            <RoleAvatarComponent avatarId={message.avatarId} width={20} isRounded={false}></RoleAvatarComponent>
          </div>
        </div>

        {/* 消息内容 */}
        <div className="flex-1">
          {/* 角色名（始终显示） */}
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {useRoleRequest.isPending || useRoleRequest.error || useRoleRequest.data === undefined ? "" : useRoleRequest.data.data?.roleName}
          </div>

          {/* 消息文本（纯文字，无边框） */}
          <div
            className="text-base text-gray-700 dark:text-gray-300 mt-1"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {message.content}
          </div>

          {/* 时间（小字，低调） */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {message.createTime?.toLocaleString() ?? ""}
          </div>
        </div>
      </div>
    );
  }
}

// export function ChatBubble({ message }: { message: Message }) {
//   return (
//   // <div className={message.type !== "user" ? "chat chat-start" : "chat chat-end"} key={message.id}>
//     <div className="chat chat-start" key={message.messageId}>
//       <div className="chat-image avatar">
//         <div className="w-10 rounded-full">
//           <img
//             alt="Tailwind CSS chat bubble component"
//             src={message.avatar.avatarUrl}
//           />
//         </div>
//
//       </div>
//       <div
//         className={message.type !== 1 ? "chat-bubble" : "chat-bubble chat-bubble-neutral"}
//       >
//         <div style={{ whiteSpace: "pre-wrap" }}>
//           {message.content}
//         </div>
//       </div>
//       <div className="chat-footer">
//         {message.userRole.roleName}
//         <time className="text-xs opacity-50">
//           {message.createTime.toLocaleString()}
//         </time>
//       </div>
//       {/* <div className="chat-footer opacity-50">Seen</div> */}
//     </div>
//   );
// }
