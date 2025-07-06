import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useState } from "react";
import { useGetUerSCBalanceQuery } from "../../../api/hooks/scQueryHooks";
import ActivitiesTab from "./profileTab/activitiesTab";
import HomeTab from "./profileTab/homeTab";

function ProfilePage() {
  // 当前登录用户的userId
  const userId = useGlobalContext().userId ?? -1;

  const getUserSCBalanceQuery = useGetUerSCBalanceQuery(userId);
  const [activeTab, setActiveTab] = useState(0);

  // 导航栏的对应
  const TABS = [
    { id: 0, name: "个人主页", component: <HomeTab userId={userId} /> },
    { id: 1, name: "跑团动态", component: <ActivitiesTab userId={userId} /> },
    // { id: 2, name: "作品", component: <WorksTab userId={userId} /> },
    // { id: 3, name: "游玩记录", component: <RecordsTab userId={userId} /> },
    // { id: 4, name: "收藏", component: <FavoritesTab userId={userId} /> },
    // { id: 5, name: "隐私设置", component: <PrivacyTab userId={userId} /> },
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
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.name}
          </a>
        ))}
      </div>

      <div className="card-body">
        <div className="card-title">
          <span>SC余额</span>
        </div>
        <div className="card-actions justify-end">
          <div className="badge badge-outline">{getUserSCBalanceQuery.data?.data?.balance}</div>
        </div>
      </div>
      {/* 当前激活的标签内容 */}
      <div className="mt-4 p-8">
        {TABS.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>

  );
}

export default ProfilePage;
