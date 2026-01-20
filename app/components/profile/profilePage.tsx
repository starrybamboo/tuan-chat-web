import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router";

function ProfilePage() {
  const { userId } = useParams();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });

  const TABS = [
    {
      id: "home",
      name: "主页",
      to: `/profile/${userId}`,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      id: "activities",
      name: "动态",
      to: `/profile/${userId}/activities`,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: "works",
      name: "作品",
      to: `/profile/${userId}/works`,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  const updateUnderline = () => {
    const container = navRef.current;
    if (!container)
      return;

    const activeEl = container.querySelector<HTMLElement>("[aria-current=\"page\"]");
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();

      const left = elRect.left - containerRect.left + elRect.width * 0.2;
      const width = elRect.width * 0.6;

      setUnderline({ left: Math.round(left), width: Math.round(width) });
    }
    else {
      setUnderline({ left: 0, width: 0 });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    updateUnderline();
    window.addEventListener("resize", updateUnderline);
    return () => window.removeEventListener("resize", updateUnderline);
  }, [location.pathname, userId]);

  return (
    <div className="card bg-base-100 mb-50 mx-auto max-w-4xl">
      {/* 导航栏 */}
      <div
        role="tablist"
        ref={navRef}
        className="relative flex border-b md:pl-10"
      >
        {/* 高亮条 */}
        <div
          className="absolute bottom-0 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-t-full transition-all duration-300 ease-out"
          style={{
            left: `${underline.left}px`,
            width: `${underline.width}px`,
          }}
        />

        {TABS.map(tab => (
          <NavLink
            key={tab.id}
            to={tab.to}
            onClick={scrollToTop}
            end={tab.id === "home"}
            className={({ isActive }) =>
              `px-6 py-4 text-lg font-medium transition-all duration-300 ease-out cursor-pointer flex items-center gap-2 no-underline ${
                isActive
                  ? "text-indigo-700"
                  : "text-indigo-300 hover:text-indigo-500"
              }`}
          >
            {tab.icon}
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* 内容区域 */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}

export default ProfilePage;
