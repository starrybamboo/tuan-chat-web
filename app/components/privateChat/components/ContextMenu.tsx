import type { MessageDirectRecallRequest } from "api";

export default function ContextMenu({ allMessages, userId, contextMenu, setContextMenu, handleRevokeMessage }: { allMessages: any[]; userId: number; contextMenu: { x: number; y: number; messageId: number } | null; setContextMenu: (context: { x: number; y: number; messageId: number } | null) => void; handleRevokeMessage: (messageId: MessageDirectRecallRequest) => void }) {
  return (
    <>
      { contextMenu && (() => {
        const message = allMessages.find(msg => msg.messageId === contextMenu.messageId);
        return (
          <div
            className="fixed bg-base-100 shadow-lg rounded-md z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <ul className="menu p-2 w-40">
              {message?.senderId === userId && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      handleRevokeMessage({ messageId: contextMenu.messageId });
                      setContextMenu(null);
                    }}
                  >
                    撤回
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setContextMenu(null);
                  }}
                >
                  回复
                </button>
              </li>
            </ul>
          </div>
        );
      })()}
    </>
  );
}
