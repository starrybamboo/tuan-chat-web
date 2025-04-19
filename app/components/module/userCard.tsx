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
    // {
    //   label: "已点赞",
    //   value: "0",
    // },
    // {
    //   label: "已关注",
    //   value: "0",
    // },
  ];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="basis-2/5 flex justify-center items-center">
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
      <div className="stats shadow basis-3/5 flex-wrap">
        {
          cardSections.map(section => (
            <div className="stat h-24 hover:bg-neutral-content hover:cursor-pointer" key={section.key}>
              <div className="stat-title mx-auto text-[1rem] text-primary">{section.label}</div>
              <div className="stat-value mx-auto text-primary">{section.value}</div>
              {/* <div className="stat-desc">21% more than last month</div> */}
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default UserCard;
