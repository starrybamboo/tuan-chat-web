import { HouseIcon, ImageIcon } from "@phosphor-icons/react";
import { Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

function ProfilePage() {
  const { userId } = useParams({ strict: false });
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
    <div className="flex min-h-full flex-col bg-base-100">
      {/* 导航栏 */}
      <div
        role="tablist"
        ref={navRef}
        className="relative flex border-gray-300 border-y bg-base-200 md:pl-10 dark:border-gray-700"
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
          <Link
            key={tab.id}
            to={tab.to}
            onClick={scrollToTop}
            activeOptions={{ exact: tab.id === "home" }}
            className="px-4 py-3 font-semibold transition-all duration-300 ease-out cursor-pointer flex items-center gap-2 no-underline"
            activeProps={{ className: "text-primary" }}
            inactiveProps={{ className: "text-base-content" }}
          >
            {tab.icon}
            {tab.name}
          </Link>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ProfilePage;
