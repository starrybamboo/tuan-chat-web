import { NavLink, Outlet, useParams } from "react-router";

/**
 * 个人主页的入口，使用路由来管理不同标签页
 */
function ProfilePage() {
  const { userId } = useParams();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 导航栏的对应
  const TABS = [
    {
      id: "home",
      name: "主页",
      to: `/profile/${userId}`, // 默认路由
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      id: "activities",
      name: "动态",
      to: `/profile/${userId}/activities`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: "works",
      name: "作品",
      to: `/profile/${userId}/works`,
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
          <NavLink
            key={tab.id}
            to={tab.to}
            onClick={scrollToTop}
            end={tab.id === "home"} // 只有主页使用 end 匹配
            className={({ isActive }) => `
              px-6 py-4 text-lg font-medium relative
              transition-all duration-300 ease-out cursor-pointer
              flex items-center gap-2 no-underline
              ${isActive
            ? "text-indigo-700"
            : "text-indigo-300 hover:text-indigo-500"
          }
            `}
          >
            {({ isActive }) => (
              <>
                {tab.icon}
                {tab.name}
                {isActive && (
                  <div className="absolute bottom-0 left-1/5 right-1/5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-t-full transform " />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* 当前激活的标签内容 */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export default ProfilePage;
