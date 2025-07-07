import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useState } from "react";
import ActivitiesTab from "./profileTab/activitiesTab";
import HomeTab from "./profileTab/homeTab";
import WorksTab from "./profileTab/worksTab";

function ProfilePage() {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const [activeTab, setActiveTab] = useState(0);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  // 导航栏的对应
  const TABS = [
    { id: 0, name: "个人主页", component: <HomeTab userId={userId} /> },
    { id: 1, name: "跑团动态", component: <ActivitiesTab userId={userId} /> },
    { id: 2, name: "作品", component: <WorksTab userId={userId} /> },
    // { id: 3, name: "游玩记录", component: <RecordsTab userId={userId} /> },
    // { id: 4, name: "隐私设置", component: <PrivacyTab userId={userId} /> },
  ];

  return (
    <div className="card bg-base-100 mb-50 mx-auto ">
      {/* 用户基本信息 */}
      <UserDetail userId={userId}></UserDetail>
      {/* 导航栏 */}
      <div role="tablist" className="tabs tabs-lift h-15 pl-6">
        {TABS.map(tab => (
          <a
            key={tab.id}
            role="tab"
            className={`tab h-full md:w-30 ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              scrollToTop();
            }}
          >
            {tab.name}
          </a>
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
