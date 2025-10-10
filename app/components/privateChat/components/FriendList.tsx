import { useNavigate } from "react-router";

export default function FriendItem({ friendUserInfos, updateReadlinePosition, setIsOpenLeftDrawer }: { friendUserInfos: any[]; updateReadlinePosition: (id: number) => void; setIsOpenLeftDrawer: (isOpen: boolean) => void }) {
  const navigate = useNavigate();

  return (
    <div className="p-2 pt-4 flex flex-col gap-2">
      {
        friendUserInfos.map((friend, index) => (
          <button
            key={friend?.userId || index}
            className="btn btn-ghost flex justify-start w-full gap-2"
            type="button"
            onClick={() => {
              navigate(`/chat/private/${friend?.userId}`);
              updateReadlinePosition(friend?.userId || -1);
              setTimeout(() => {
                setIsOpenLeftDrawer(false);
              }, 0);
            }}
          >
            <div className="indicator">
              <div className="avatar mask mask-squircle w-8">
                <img
                  src={friend?.avatar}
                  alt={friend?.username}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1 justify-center min-w-0 relative">
              <div className="flex items-center ">
                <span className="truncate">
                  {friend?.username || `用户${friend?.userId}`}
                </span>
              </div>
            </div>
          </button>
        ))
      }
    </div>
  );
}
