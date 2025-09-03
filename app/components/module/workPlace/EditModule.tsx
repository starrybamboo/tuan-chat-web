import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { useEffect, useRef } from "react";
import ItemEdit from "./components/ItemEdit";
import LocationEdit from "./components/LocationEdit";
import MapEdit from "./components/MapEdit";
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = roleModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  console.warn(role);

  // 当组件是最新的时候，自动选中
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id.toString())}
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
      <div className="tab-content h-fit! bg-base-100 border-base-300 p-6">
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
  onUpdateChangedState,
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
  onUpdateChangedState?: (id: string, changed: boolean) => void;
}) {
  const { id, label } = itemModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  // 当changed状态改变时，通知父组件
  useEffect(() => {
    if (onUpdateChangedState) {
      onUpdateChangedState(id.toString(), changed);
    }
  }, [changed, id, onUpdateChangedState]);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id.toString())}
        />
        <div
          className={`
            absolute right-[10px]
            w-4 h-4 flex items-center justify-center
            ${changed
      ? "visible bg-white rounded-full"
      : `invisible
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm`}
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          {changed ? <div className="w-2 h-2 bg-gray-800 rounded-full"></div> : <BaselineClose />}
        </div>
        {label}
      </label>
      <div className="tab-content h-fit! bg-base-100 border-base-300 p-6">
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
  onUpdateChangedState,
}: {
  sceneModuleItem: ModuleTabItem;
  location: StageEntityResponse; // 这里用 any，实际可替换为具体类型
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
  onUpdateChangedState?: (id: string, changed: boolean) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  // 当changed状态改变时，通知父组件
  useEffect(() => {
    if (onUpdateChangedState) {
      onUpdateChangedState(id.toString(), changed);
    }
  }, [changed, id, onUpdateChangedState]);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id.toString())}
        />
        <div
          className={`
            absolute right-[10px]
            w-4 h-4 flex items-center justify-center
            ${changed
      ? "visible bg-white rounded-full"
      : `invisible
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm`}
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          {changed ? <div className="w-2 h-2 bg-gray-800 rounded-full"></div> : <BaselineClose />}
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
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
  onUpdateChangedState,
}: {
  sceneModuleItem: SceneModuleItem;
  scene: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
  onUpdateChangedState?: (id: string, changed: boolean) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  // 当changed状态改变时，通知父组件
  useEffect(() => {
    if (onUpdateChangedState) {
      onUpdateChangedState(id.toString(), changed);
    }
  }, [changed, id, onUpdateChangedState]);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id.toString())}
        />
        <div
          className={`
            absolute right-[10px]
            w-4 h-4 flex items-center justify-center
            ${changed
      ? "visible bg-white rounded-full"
      : `invisible
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm`}
          `}
          onClick={() => {
            onCloseClick(id.toString());
          }}
        >
          {changed ? <div className="w-2 h-2 bg-gray-800 rounded-full"></div> : <BaselineClose />}
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = mapModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id.toString())}
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
      <div className="tab-content bg-base-100 border-base-300 p-6">
        <MapEdit map={map} />
      </div>
    </>
  );
}

export default function EditModule() {
  const { moduleTabItems, currentSelectedTabId, setCurrentSelectedTabId, removeModuleTabItem }
    = useModuleContext();
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

  // 用于跟踪各个tab的更改状态
  const [changedStates, setChangedStates] = useState<Record<string, boolean>>({});
  // 存储目标路由路径
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  // 在组件卸载时清理事件监听器
  // 监听路由变化和浏览器关闭事件
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 检查是否有任何tab有未保存的更改
      const hasUnsavedChanges = Object.values(changedStates).some(changed => changed);

      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [changedStates]);

  // 监听路由变化
  useEffect(() => {
    let isUnloading = false;
    let preventRouteChange = false;

    // 监听浏览器关闭/刷新事件
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      isUnloading = true;
      // 检查是否有任何tab有未保存的更改
      const hasUnsavedChanges = Object.values(changedStates).some(changed => changed);

      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };

    // 拦截路由变化
    const handlePopState = () => {
      if (isUnloading)
        return;

      // 检查是否有任何tab有未保存的更改
      const hasUnsavedChanges = Object.values(changedStates).some(changed => changed);

      if (hasUnsavedChanges && !preventRouteChange) {
        // 阻止默认行为
        window.history.go(1); // 回到原来的页面
        // 存储当前目标路径并显示确认弹窗
        setPendingRoute(window.location.href);
        return;
      }

      preventRouteChange = false;
    };

    // 重写 history.pushState 和 history.replaceState 来捕获程序化路由变化
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (state, title, url) {
      const hasUnsavedChanges = Object.values(changedStates).some(changed => changed);

      if (hasUnsavedChanges && !preventRouteChange) {
        // 存储目标路径并显示确认弹窗而不是直接跳转
        if (url) {
          setPendingRoute(url.toString());
        }
        return; // 阻止跳转
      }

      return originalPushState.apply(this, [state, title, url] as any);
    };

    window.history.replaceState = function (state, title, url) {
      const hasUnsavedChanges = Object.values(changedStates).some(changed => changed);

      if (hasUnsavedChanges && !preventRouteChange) {
        // 存储目标路径并显示确认弹窗而不是直接跳转
        if (url) {
          setPendingRoute(url.toString());
        }
        return; // 阻止跳转
      }

      return originalReplaceState.apply(this, [state, title, url] as any);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // 清理函数
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [changedStates]);

  useEffect(() => {
    if (pendingRoute) {
      window.location.replace(pendingRoute);
    }
  }, [pendingRoute]);

  // 更新某个tab的更改状态的函数
  const updateChangedState = (id: string, changed: boolean) => {
    setChangedStates(prev => ({
      ...prev,
      [id]: changed,
    }));
  };

  return (
    <div className="h-screen p-4 overflow-y-scroll">
      <div className="w-full h-full tabs tabs-lift">
        {roleModuleItems.map(item => (
          <RoleModuleTabItem
            key={item.id}
            role={item.content}
            roleModuleItem={item}
            isSelected={item.id === currentSelectedTabId}
            onTabClick={setCurrentSelectedTabId}
            onCloseClick={removeModuleTabItem}
          />
        ))}
        {
          itemModuleItems.map(item => (
            <ItemModuleTabItem
              key={item.id}
              itemModuleItem={item}
              item={item.content}
              isSelected={item.id === currentSelectedTabId}
              onTabClick={setCurrentSelectedTabId}
              onCloseClick={removeModuleTabItem}
              onUpdateChangedState={updateChangedState}
            />
          ))
        }
        {
          locationModuleItems.map(item => (
            <LocationModuleTabItem
              key={item.id}
              sceneModuleItem={item}
              location={item.content}
              isSelected={item.id === currentSelectedTabId}
              onTabClick={setCurrentSelectedTabId}
              onCloseClick={removeModuleTabItem}
              onUpdateChangedState={updateChangedState}
            />
          ))
        }
        {
          sceneModuleItems.map(item => (
            <SceneModuleTabItem
              key={item.id}
              sceneModuleItem={item}
              scene={item.content}
              isSelected={item.id === currentSelectedTabId}
              onTabClick={setCurrentSelectedTabId}
              onCloseClick={removeModuleTabItem}
              onUpdateChangedState={updateChangedState}
            />
          ))
        }
        {
          mapModuleItems.map(item => (
            <MapModuleTabItem
              key={item.id}
              mapModuleItem={item}
              map={item.content}
              isSelected={item.id === currentSelectedTabId}
              onTabClick={setCurrentSelectedTabId}
              onCloseClick={removeModuleTabItem}
            />
          ))
        }
      </div>
    </div>
  );
}
