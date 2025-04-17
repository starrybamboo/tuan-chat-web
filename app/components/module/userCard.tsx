import { useGlobalContext } from "../globalContextProvider";

function UserCard({ className }: { className?: string }) {
  const defaultAvatar = "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp";
  const _userId = useGlobalContext().userId;
  const cardSections = [
    {
      label: "已创建",
      key: "created",
      value: "0",
    },
    {
      label: "已收藏",
      key: "saved",
      value: "0",
    },
    {
      label: "已点赞",
      value: "0",
    },
    {
      label: "已关注",
      value: "0",
    },
  ];

  return (
    <div className={`grid grid-cols-2 grid-rows-12 ${className}`}>
      <div className="col-span-2 row-span-6 flex justify-center items-center">
        {/* {userId
          ? <UserAvatarComponent userId={userId} width={12} isRounded />
          : (
              <div className="avatar w-12 h-12 rounded-full">
                <img src={defaultAvatar} />
              </div>
            )} */}
        <div className="avatar w-20 h-20">
          <img className="rounded-full" src={defaultAvatar} />
        </div>
      </div>
      {cardSections.map(section => (
        <div className="col-span-1 row-span-3 flex flex-col items-center" key={section.label}>
          <div className="font-bold h-6 flex justify-center items-center">
            {section.label}
          </div>
          <div className=" h-6 flex justify-center items-center">
            {section.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default UserCard;
