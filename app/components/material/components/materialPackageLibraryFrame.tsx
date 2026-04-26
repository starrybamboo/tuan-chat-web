import type { ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";

interface MaterialPackageLibraryFrameProps {
  embedded?: boolean;
  sidebarNode: ReactNode;
  mainContentNode: ReactNode;
  drawerTitle: string;
  drawerDescription: string;
  openSidebarLabel: string;
}

export default function MaterialPackageLibraryFrame({
  embedded = false,
  sidebarNode,
  mainContentNode,
  drawerTitle,
  drawerDescription,
  openSidebarLabel,
}: MaterialPackageLibraryFrameProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsDrawerOpen(false);
      }
    };

    queueMicrotask(() => setIsDesktop(mediaQuery.matches));
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (embedded) {
    return <>{mainContentNode}</>;
  }

  return (
    <div className="relative flex h-full w-full min-w-0 overflow-hidden bg-base-200 text-base-content">
      {isDesktop && (
        <div className={`border-r border-base-300 bg-base-300/60 transition-all duration-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "w-[280px]"}`}>
          {sidebarNode}
        </div>
      )}

      {isDesktop && (
        <div className={`fixed top-1/2 z-50 -translate-y-1/2 transition-all duration-300 ${isSidebarCollapsed ? "left-0" : "left-[280px]"}`}>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="flex h-12 w-6 items-center justify-center rounded-r-full border border-base-300 border-l-0 bg-base-100 text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
            aria-label={isSidebarCollapsed ? `展开${drawerTitle}` : `收起${drawerTitle}`}
          >
            {isSidebarCollapsed
              ? <CaretRightIcon className="size-3" weight="bold" />
              : <CaretLeftIcon className="size-3" weight="bold" />}
          </button>
        </div>
      )}

      {!isDesktop && (
        <div className="fixed left-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-50">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={openSidebarLabel}
            className="flex h-12 w-8 items-center justify-center rounded-r-full border border-base-300 border-l-0 bg-base-100/95 text-base-content/72 shadow-md backdrop-blur transition hover:bg-base-200 hover:text-base-content"
          >
            <CaretRightIcon size={16} weight="bold" />
          </button>
        </div>
      )}

      {!isDesktop && (
        <Drawer.Root
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          direction="left"
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-base-content/40 data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto" />
            <Drawer.Content className="fixed left-0 top-0 z-[100] flex h-full w-[min(85vw,320px)] flex-col bg-base-300/95 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur data-[state=closed]:pointer-events-none data-[state=open]:pointer-events-auto">
              <Drawer.Title className="sr-only">{drawerTitle}</Drawer.Title>
              <Drawer.Description className="sr-only">{drawerDescription}</Drawer.Description>
              <div className="h-full overflow-y-auto">
                {sidebarNode}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{mainContentNode}</div>
    </div>
  );
}
