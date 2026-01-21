import { ClockIcon, HouseIcon, ImageIcon } from "@phosphor-icons/react";
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
        <HouseIcon className="h-5 w-5" />
      ),
    },
    {
      id: "activities",
      name: "动态",
      to: `/profile/${userId}/activities`,
      icon: (
        <ClockIcon className="h-5 w-5" />
      ),
    },
    {
      id: "works",
      name: "作品",
      to: `/profile/${userId}/works`,
      icon: (
        <ImageIcon className="h-5 w-5" />
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
    <div className="bg-base-300">
      {/* 导航栏 */}
      <div
        role="tablist"
        ref={navRef}
        className="relative flex border-gray-300 dark:border-gray-700 border-b border-t md:pl-10 bg-base-200"
      >
        {/* 高亮条 */}
        <div
          className="absolute bottom-0 h-1.5 bg-primary rounded-t-full transition-all duration-300 ease-out"
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
              `px-4 py-3 font-semibold transition-all duration-300 ease-out cursor-pointer flex items-center gap-2 no-underline ${
                isActive
                  ? "text-primary"
                  : "text-base-content"
              }`}
          >
            {tab.icon}
            {tab.name}
          </NavLink>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default ProfilePage;
