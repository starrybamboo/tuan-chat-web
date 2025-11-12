import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { ChevronSmallTripleUp } from "@/icons";
import { useEffect, useRef } from "react";
import ItemEdit from "./components/ItemEdit";
import LocationEdit from "./components/LocationEdit";
import MapEdit from "./components/MapEdit";
import ModuleEdit from "./components/ModuleEditContent";
import NPCEdit from "./components/NPCEdit";
import SceneEdit from "./components/SceneEdit";
import { useModuleContext } from "./context/_moduleContext";
import { ModuleItemEnum } from "./context/types";

export function BaselineClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="1.2em"
      height="1.2em"
      {...props}
    >
      <path
        fill="currentColor"
        d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
      >
      </path>
    </svg>
  );
}

function RoleModuleTabItem({
  roleModuleItem,
  role,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  roleModuleItem: RoleModuleItem;
  role: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = roleModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          checked={isSelected}
          onChange={() => onTabClick(id.toString(), "role")}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content min-h-[85vh] bg-base-100 border-base-300 p-8 w-full">
        <NPCEdit role={role} />
      </div>
    </>
  );
}

function ItemModuleTabItem({
  itemModuleItem,
  item,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = itemModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          checked={isSelected}
          onChange={() => onTabClick(id.toString(), "item")}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content min-h-[85vh]  bg-base-100 border-base-300 p-8 w-full">
        <ItemEdit item={item} />
      </div>
    </>
  );
}

function LocationModuleTabItem({
  sceneModuleItem,
  location,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  sceneModuleItem: ModuleTabItem;
  location: StageEntityResponse; // 这里用 any，实际可替换为具体类型
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          checked={isSelected}
          onChange={() => onTabClick(id.toString(), "location")}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content min-h-[85vh] bg-base-100 border-base-300 p-8 w-full">
        {/* 这里可替换为具体的 SceneEdit 组件 */}
        <LocationEdit location={location} />
      </div>
    </>
  );
}

function SceneModuleTabItem({
  sceneModuleItem,
  scene,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  sceneModuleItem: SceneModuleItem;
  scene: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          checked={isSelected}
          onChange={() => onTabClick(id.toString(), "scene")}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content min-h-[85vh] bg-base-100 border-base-300 p-8 w-full">
        <SceneEdit
          scene={scene}
          id={id}
        />
      </div>
    </>
  );
}

function MapModuleTabItem({
  mapModuleItem,
  map,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  mapModuleItem: MapModuleItem;
  map: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = mapModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          checked={isSelected}
          onChange={() => onTabClick(id.toString(), "map")}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content min-h-[85vh] bg-base-100 border-base-300 p-8 w-full">
        <MapEdit map={map} />
      </div>
    </>
  );
}

function ModuleModuleTabItem({
  moduleItem,
  moduleInfo,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  moduleItem: ModuleModuleItem;
  moduleInfo: any; // 基本信息对象
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item" | "module") => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = moduleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          checked={isSelected}
          onChange={() => onTabClick(id.toString(), "module")}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content min-h-[85vh] bg-base-100 border-base-300 p-8 w-full">
        <ModuleEdit data={moduleInfo} />
      </div>
    </>
  );
}

export default function EditModule() {
  const { moduleTabItems, currentSelectedTabId, setCurrentSelectedTabId, removeModuleTabItem }
    = useModuleContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<number>(0);

  // 包装 tab 切换：先保存当前，再切换
  const handleTabClick = (nextId: string, _entiryType: "role" | "scene" | "map" | "location" | "item" | "module") => {
    setCurrentSelectedTabId(nextId);
  };
  // 关闭标签时，同时清理保存映射，避免脏引用
  const handleCloseTab = (id: string) => {
    removeModuleTabItem(id);
  };
  const roleModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.ROLE,
  );
  const locationModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.LOCATION,
  );
  const itemModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.ITEM,
  );
  const sceneModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.SCENE,
  );
  const mapModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.MAP,
  );
  const moduleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.MODULE,
  );

  // 获取最近的可滚动容器（优先检测自身，其次向上冒泡）
  const getScrollParent = (node: Element | null): HTMLElement => {
    let current: HTMLElement | null = node as HTMLElement | null;
    while (current) {
      const style = getComputedStyle(current);
      const overflowY = style.overflowY;
      const canScrollY = (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
        && current.scrollHeight > current.clientHeight;
      if (canScrollY) {
        return current;
      }
      current = current.parentElement;
    }
    return (document.scrollingElement as HTMLElement) || document.documentElement;
  };

  // 回到顶部（带缓动动画）
  const handleBackToTop = () => {
    const root = containerRef.current;
    const scrollElem = getScrollParent(root);
    const start = scrollElem.scrollTop || 0;
    const duration = 600; // ms
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const next = Math.floor(start * (1 - easeOutCubic(progress)));
      scrollElem.scrollTop = next;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  // 监听滚动：当处于顶部（startRef 为 0）时隐藏按钮（display: none）
  useEffect(() => {
    const root = containerRef.current;
    if (!root)
      return;
    const scrollElem = getScrollParent(root);
    const onScroll = () => {
      const currentTop = scrollElem.scrollTop || 0;
      startRef.current = currentTop;
      if (buttonRef.current) {
        buttonRef.current.style.display = currentTop < 50 ? "none" : "";
      }
    };
    scrollElem.addEventListener("scroll", onScroll, { passive: true });
    // 初始化执行一次，确保初始状态正确
    onScroll();
    return () => {
      scrollElem.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="h-full p-4 relative">
      <div className="w-full tabs tabs-lift">
        {roleModuleItems.map(item => (
          <RoleModuleTabItem
            key={item.id}
            role={item.content}
            roleModuleItem={item}
            isSelected={String(item.id) === String(currentSelectedTabId)}
            onTabClick={handleTabClick}
            onCloseClick={handleCloseTab}
          />
        ))}
        {
          itemModuleItems.map(item => (
            <ItemModuleTabItem
              key={item.id}
              itemModuleItem={item}
              item={item.content}
              isSelected={String(item.id) === String(currentSelectedTabId)}
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
            />
          ))
        }
        {
          locationModuleItems.map(item => (
            <LocationModuleTabItem
              key={item.id}
              sceneModuleItem={item}
              location={item.content}
              isSelected={String(item.id) === String(currentSelectedTabId)}
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
            />
          ))
        }
        {
          sceneModuleItems.map(item => (
            <SceneModuleTabItem
              key={item.id}
              sceneModuleItem={item}
              scene={item.content}
              isSelected={String(item.id) === String(currentSelectedTabId)}
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
            />
          ))
        }
        {
          mapModuleItems.map(item => (
            <MapModuleTabItem
              key={item.id}
              mapModuleItem={item}
              map={item.content}
              isSelected={String(item.id) === String(currentSelectedTabId)}
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
            />
          ))
        }
        {
          moduleItems.map(item => (
            <ModuleModuleTabItem
              key={item.id}
              moduleItem={item as ModuleModuleItem}
              moduleInfo={item.content}
              isSelected={String(item.id) === String(currentSelectedTabId)}
              onTabClick={handleTabClick as any}
              onCloseClick={handleCloseTab}
            />
          ))
        }
        {
          moduleTabItems.length === 0 && (
            <div className="w-full min-h-[80vh] flex items-center justify-center">
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-foreground">模组编辑器</h1>
                <p className="text-muted-foreground max-w-md">
                  使用左侧的侧边栏来管理你的游戏模组。你可以创建和编辑角色、物品、地点和剧情，
                  并通过可视化地图查看剧情节点之间的连接关系。
                </p>
              </div>
            </div>
          )
        }
      </div>
      <button
        type="button"
        onClick={handleBackToTop}
        title="回到顶部"
        ref={buttonRef}
        className="fixed bottom-[3vw] right-[3vw] z-50 btn btn-circle btn-primary shadow-lg"
      >
        <ChevronSmallTripleUp className="w-10 h-10" />
      </button>
    </div>
  );
}
