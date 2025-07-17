import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useState } from "react";
import ActivitiesTab from "./profileTab/activitiesTab";
import HomeTab from "./profileTab/homeTab";
import WorksTab from "./profileTab/worksTab";

interface Props {
  userId?: number; // 可选
}

function ProfilePage({ userId }: Props) {
  // 当前登录用户的userId
  const currentUserId = useGlobalContext().userId ?? -1;
  const finalUserId = userId ?? currentUserId;
  const [activeTab, setActiveTab] = useState(0);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  // 导航栏的对应
  const TABS = [
    { id: 0, name: "个人主页", component: <HomeTab userId={finalUserId} /> },
    { id: 1, name: "跑团动态", component: <ActivitiesTab userId={finalUserId} /> },
    { id: 2, name: "作品", component: <WorksTab userId={finalUserId} /> },
  ];

  return (
    <div className="card bg-base-100 mb-50 mx-auto ">
      {/* 用户基本信息 */}
      <UserDetail userId={finalUserId}></UserDetail>
      {/* 导航栏 */}
      <div
        role="tablist"
        className="flex border-b pl-10"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`
              px-6 py-4 text-lg font-medium relative
              transition-all duration-300 ease-out cursor-pointer
              ${activeTab === tab.id
            ? "text-indigo-700"
            : "text-indigo-300 hover:text-indigo-500"
          }
            `}
            onClick={() => {
              setActiveTab(tab.id);
              scrollToTop();
            }}
          >
            {tab.name}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/5 right-1/5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-t-full transform " />
            )}
          </button>
        ))}
      </div>

      {/* 当前激活的标签内容 */}
      <div>
        {TABS.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>

  );
}

export default ProfilePage;
