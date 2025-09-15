import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { useEffect, useRef } from "react";
import ItemEdit from "./components/ItemEdit";
import LocationEdit from "./components/LocationEdit";
import MapEdit from "./components/MapEdit";
import ModuleEdit from "./components/ModuleEdit";
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
  registerSave,
}: {
  roleModuleItem: RoleModuleItem;
  role: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
  registerSave: (fn: () => void) => void;
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
          onClick={onTabClick.bind(null, id.toString(), "role")}
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
        <NPCEdit role={role} onRegisterSave={registerSave} />
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
  registerSave,
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
  registerSave: (fn: () => void) => void;
}) {
  const { id, label } = itemModuleItem;
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
          onClick={onTabClick.bind(null, id.toString(), "item")}
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
        <ItemEdit item={item} onRegisterSave={registerSave} />
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
  registerSave,
}: {
  sceneModuleItem: ModuleTabItem;
  location: StageEntityResponse; // 这里用 any，实际可替换为具体类型
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
  registerSave: (fn: () => void) => void;
}) {
  const { id, label } = sceneModuleItem;
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
          onClick={onTabClick.bind(null, id.toString(), "location")}
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
        {/* 这里可替换为具体的 SceneEdit 组件 */}
        <LocationEdit location={location} onRegisterSave={registerSave} />
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
  registerSave,
}: {
  sceneModuleItem: SceneModuleItem;
  scene: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
  registerSave: (fn: () => void) => void;
}) {
  const { id, label } = sceneModuleItem;
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
          onClick={onTabClick.bind(null, id.toString(), "scene")}
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
        <SceneEdit
          scene={scene}
          id={id}
          onRegisterSave={registerSave}
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
  registerSave,
}: {
  mapModuleItem: MapModuleItem;
  map: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item") => void;
  onCloseClick: (id: string) => void;
  registerSave: (fn: () => void) => void;
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
          onClick={onTabClick.bind(null, id.toString(), "map")}
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
        <MapEdit map={map} onRegisterSave={registerSave} />
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
  registerSave,
}: {
  moduleItem: ModuleModuleItem;
  moduleInfo: any; // 基本信息对象
  isSelected: boolean;
  onTabClick: (id: string, entiryType: "role" | "scene" | "map" | "location" | "item" | "module") => void;
  onCloseClick: (id: string) => void;
  registerSave: (fn: () => void) => void;
}) {
  const { id, label } = moduleItem;
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
          onClick={onTabClick.bind(null, id.toString(), "module")}
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
        <ModuleEdit data={moduleInfo} onRegisterSave={registerSave} />
      </div>
    </>
  );
}

export default function EditModule() {
  const { moduleTabItems, currentSelectedTabId, setCurrentSelectedTabId, removeModuleTabItem }
    = useModuleContext();
  // 保存函数注册表
  const saveHandlersRef = useRef<Record<string, () => void>>({});
  // 当前选中标签对应的保存函数（避免每次都查表，且可在注册/切换时及时同步）
  const currentSaveHandlerRef = useRef<null | (() => void)>(null);
  const registerSaveForTab = (tabId: string, fn: () => void) => {
    saveHandlersRef.current[tabId] = fn;
    // 若正好是当前选中的标签，则同时更新当前保存引用
    if (tabId === currentSelectedTabId) {
      currentSaveHandlerRef.current = fn;
    }
  };

  // 统一获取当前有效的保存函数：优先使用 current 引用，其次从映射表兜底
  const getEffectiveSaveHandler = () => {
    return (
      currentSaveHandlerRef.current
      ?? (currentSelectedTabId ? saveHandlersRef.current[currentSelectedTabId] : undefined)
    );
  };

  // 在名字变更等短暂重渲染期间，尝试延迟一两个节拍再保存，避免错过注册时机
  const invokeSaveWithTinyRetry = () => {
    const tryOnce = () => {
      const h = getEffectiveSaveHandler();
      if (h) {
        try {
          h();
        }
        catch (e) {
          console.error("保存失败:", e);
        }
        return true;
      }
      return false;
    };

    if (tryOnce()) {
      return;
    }
    // 多次重试：下一帧 + 渐进延迟以覆盖重建/注册空窗
    const delays = [0, 50, 100, 200, 350, 500];
    let cancelled = false;
    // 下一帧启动序列
    requestAnimationFrame(() => {
      if (cancelled || tryOnce()) {
        return;
      }
      delays.forEach((d) => {
        setTimeout(() => {
          if (!cancelled) {
            tryOnce();
          }
        }, d);
      });
    });
    // 返回一个可选的取消函数以备未来扩展
    return () => {
      cancelled = true;
    };
  };

  // 当选中的标签变化时，同步当前保存函数引用
  useEffect(() => {
    if (currentSelectedTabId) {
      currentSaveHandlerRef.current = saveHandlersRef.current[currentSelectedTabId] ?? null;
    }
    else {
      currentSaveHandlerRef.current = null;
    }
  }, [currentSelectedTabId]);

  // 包装 tab 切换：先保存当前，再切换
  const handleTabClick = (nextId: string, _entiryType: "role" | "scene" | "map" | "location" | "item" | "module") => {
    // 再尝试保存当前标签
    const save = getEffectiveSaveHandler();
    if (save) {
      try {
        save();
      }
      catch (e) {
        // 忽略保存异常，继续切换
        console.error("保存当前标签时出错:", e);
      }
    }
    setCurrentSelectedTabId(nextId);
  };
  // 关闭标签时，同时清理保存映射，避免脏引用
  const handleCloseTab = (id: string) => {
    delete saveHandlersRef.current[id];
    if (currentSelectedTabId === id) {
      currentSaveHandlerRef.current = null;
    }
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

  // 运行期推导当前实体类型（用于控制全局保存按钮显隐）
  let currentType: "role" | "scene" | "map" | "location" | "item" | "module" | null = null;
  const current = moduleTabItems.find(i => i.id === currentSelectedTabId);
  if (current) {
    switch (current.type) {
      case ModuleItemEnum.ROLE:
        currentType = "role";
        break;
      case ModuleItemEnum.SCENE:
        currentType = "scene";
        break;
      case ModuleItemEnum.MAP:
        currentType = "map";
        break;
      case ModuleItemEnum.LOCATION:
        currentType = "location";
        break;
      case ModuleItemEnum.ITEM:
        currentType = "item";
        break;
      case ModuleItemEnum.MODULE:
        currentType = "module";
        break;
      default:
        currentType = null;
    }
  }

  return (
    <div className="h-screen p-4 overflow-y-scroll">
      <div className="w-full h-full tabs tabs-lift">
        {roleModuleItems.map(item => (
          <RoleModuleTabItem
            key={item.id}
            role={item.content}
            roleModuleItem={item}
            isSelected={item.id === currentSelectedTabId}
            onTabClick={handleTabClick}
            onCloseClick={handleCloseTab}
            registerSave={fn => registerSaveForTab(item.id.toString(), fn)}
          />
        ))}
        {
          itemModuleItems.map(item => (
            <ItemModuleTabItem
              key={item.id}
              itemModuleItem={item}
              item={item.content}
              isSelected={item.id === currentSelectedTabId}
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
              registerSave={fn => registerSaveForTab(item.id.toString(), fn)}
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
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
              registerSave={fn => registerSaveForTab(item.id.toString(), fn)}
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
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
              registerSave={fn => registerSaveForTab(item.id.toString(), fn)}
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
              onTabClick={handleTabClick}
              onCloseClick={handleCloseTab}
              registerSave={fn => registerSaveForTab(item.id.toString(), fn)}
            />
          ))
        }
        {
          moduleItems.map(item => (
            <ModuleModuleTabItem
              key={item.id}
              moduleItem={item as ModuleModuleItem}
              moduleInfo={item.content}
              isSelected={item.id === currentSelectedTabId}
              onTabClick={handleTabClick as any}
              onCloseClick={handleCloseTab}
              registerSave={fn => registerSaveForTab(item.id.toString(), fn)}
            />
          ))
        }
        {
          moduleTabItems.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
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
      {/* 全局固定保存按钮：当当前实体为 map 或没有选中标签时隐藏 */}
      <div className={`fixed top-20 left-20 md:top-14 md:left-123 ${currentType === null || currentType === "map" ? "hidden" : "block"}`}>
        <button
          type="button"
          onClick={() => {
            // 使用微小重试机制，处理名字变更导致的短暂未注册窗口
            invokeSaveWithTinyRetry();
          }}
          className="btn btn-primary"
          disabled={!currentSelectedTabId || currentType === "map"}
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            保存
          </span>
        </button>
      </div>
    </div>
  );
}
