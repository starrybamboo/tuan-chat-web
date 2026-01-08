import { useNavigate } from "react-router";
import UserAvatarComponent from "@/components/common/userAvatar";
import { useGlobalContext } from "../globalContextProvider";

function UserCard({ className }: { className?: string }) {
  const { userId } = useGlobalContext();
  const navigate = useNavigate();

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

  const classNameMap = {
    created: "text-success",
    saved: "text-warning",
  };

  return (
    <div className={`flex flex-col p-3 gap-3 ${className}`}>
      <div className="basis-2/5 flex justify-center items-center">
        <div className="avatar w-20 h-20">
          <UserAvatarComponent
            userId={userId!}
            width={20}
            isRounded={true}
            withName={false}
          />
        </div>
      </div>
      <div className="stats shadow basis-2/5 flex-wrap">
        {
          cardSections.map(section => (
            <div className="stat h-full hover:bg-neutral-content hover:cursor-pointer" key={section.key}>
              <div className={`stat-title mx-auto text-[1rem] ${classNameMap[section.key as keyof typeof classNameMap]}`}>
                {section.label}
              </div>
              <div className={`stat-value mx-auto ${classNameMap[section.key as keyof typeof classNameMap]}`}>
                {section.value}
              </div>
            </div>
          ))
        }
      </div>
      <div className="basis-1/5 join join-vertical w-4/5 mx-auto gap-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            navigate("/module/create");
          }}
          type="button"
        >
          创建模组
        </button>
        <button
          className="btn btn-warning"
          type="button"
        >
          查看模组
        </button>
      </div>
    </div>
  );
}

export default UserCard;
