import { useState } from "react";
import ActivitiesTab from "./profileTab/activitiesTab";
import HomeTab from "./profileTab/homeTab";
import WorksTab from "./profileTab/worksTab";

interface Props {
  userId?: number;
}
/**
 * 个人主页的入口，这里是根据 导航栏的活跃按钮 来判断渲染什么组件，如主页，动态等等...
 */
function ProfilePage({ userId }: Props) {
  // 整个用户主页，都依赖这个用户Id
  const finalUserId = userId ?? -1;

  const [activeTab, setActiveTab] = useState(0);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 导航栏的对应
  const TABS = [
    {
      id: 0,
      name: "主页",
      component: <HomeTab userId={finalUserId} />,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      id: 1,
      name: "动态",
      component: <ActivitiesTab userId={finalUserId} />,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 2,
      name: "作品",
      component: <WorksTab userId={finalUserId} />,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div className="card bg-base-100 mb-50 mx-auto ">
      {/* 导航栏 */}
      <div
        role="tablist"
        className="flex border-b md:pl-10"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            className={`
              px-6 py-4 text-lg font-medium relative
              transition-all duration-300 ease-out cursor-pointer
              flex items-center gap-2
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
            {tab.icon}
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
