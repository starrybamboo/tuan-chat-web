import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useRef, useState } from "react";
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

function ConfirmSave({ onOpen, onClose, next }: { onOpen: boolean; onClose: () => void; next: () => void }) {
  return (
    <PopWindow isOpen={onOpen} onClose={onClose}>
      <div className="card flex flex-col w-full max-w-md">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold">确认保存</h2>
          <div className="divider"></div>
          <p className="text-lg opacity-75 mb-8">
            您还没有保存，确认退出吗
          </p>
        </div>
      </div>
      <div className="card-actions justify-center gap-6 mt-8">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          取消
        </button>
        <button type="button" className="btn btn-error" onClick={next}>
          确认
        </button>
      </div>
    </PopWindow>
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
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = itemModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content h-fit! bg-base-100 border-base-300 p-6">
        <ItemEdit item={item} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
    </>
  );import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useRef, useState } from "react";
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

function ConfirmSave({ onOpen, onClose, next }: { onOpen: boolean; onClose: () => void; next: () => void }) {
  return (
    <PopWindow isOpen={onOpen} onClose={onClose}>
      <div className="card flex flex-col w-full max-w-md">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold">确认保存</h2>
          <div className="divider"></div>
          <p className="text-lg opacity-75 mb-8">
            您还没有保存，确认退出吗
          </p>
        </div>
      </div>
      <div className="card-actions justify-center gap-6 mt-8">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          取消
        </button>
        <button type="button" className="btn btn-error" onClick={next}>
          确认
        </button>
      </div>
    </PopWindow>
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
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = itemModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content h-fit! bg-base-100 border-base-300 p-6">
        <ItemEdit item={item} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {/* 这里可替换为具体的 SceneEdit 组件 */}
        <LocationEdit location={location} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
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
          onSave={setChanged}
        />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {/* 这里可替换为具体的 SceneEdit 组件 */}
        <LocationEdit location={location} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
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
          onSave={setChanged}
        />

      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
    </>import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useRef, useState } from "react";
import ItemEdit from "./components/ItemEdit";
import LocationEdit from "./components/LocationEdit";
import MapEdit from "./components/MapEdit";
import NPCEdit from "./components/NPCEdit";
import SceneEdit from "./components/SceneEdit";
import { useModuleContext } from "./context/_moduleContext";
import { ModuleItemEnum } from "./context/types";

export function BaselineClose(props: SVGProps<SVGSVGElement>) {
  return (import type { StageEntityResponse } from "api";
import type { SVGProps } from "react";
import type { ItemModuleItem, MapModuleItem, ModuleTabItem, RoleModuleItem, SceneModuleItem } from "./context/types";
import { PopWindow } from "@/components/common/popWindow";
import { useEffect, useRef, useState } from "react";
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

function ConfirmSave({ onOpen, onClose, next }: { onOpen: boolean; onClose: () => void; next: () => void }) {
  return (
    <PopWindow isOpen={onOpen} onClose={onClose}>
      <div className="card flex flex-col w-full max-w-md">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold">确认保存</h2>
          <div className="divider"></div>
          <p className="text-lg opacity-75 mb-8">
            您还没有保存，确认退出吗
          </p>
        </div>
      </div>
      <div className="card-actions justify-center gap-6 mt-8">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          取消
        </button>
        <button type="button" className="btn btn-error" onClick={next}>
          确认
        </button>
      </div>
    </PopWindow>
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
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = itemModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content h-fit! bg-base-100 border-base-300 p-6">
        <ItemEdit item={item} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {/* 这里可替换为具体的 SceneEdit 组件 */}
        <LocationEdit location={location} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
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
          onSave={setChanged}
        />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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

function ConfirmSave({ onOpen, onClose, next }: { onOpen: boolean; onClose: () => void; next: () => void }) {
  return (
    <PopWindow isOpen={onOpen} onClose={onClose}>
      <div className="card flex flex-col w-full max-w-md">
        <div className="card-body items-center text-center">
          <h2 className="card-title text-2xl font-bold">确认保存</h2>
          <div className="divider"></div>
          <p className="text-lg opacity-75 mb-8">
            您还没有保存，确认退出吗
          </p>
        </div>
      </div>
      <div className="card-actions justify-center gap-6 mt-8">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          取消
        </button>
        <button type="button" className="btn btn-error" onClick={next}>
          确认
        </button>
      </div>
    </PopWindow>
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
}: {
  itemModuleItem: ItemModuleItem;
  item: StageEntityResponse;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = itemModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content h-fit! bg-base-100 border-base-300 p-6">
        <ItemEdit item={item} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {/* 这里可替换为具体的 SceneEdit 组件 */}
        <LocationEdit location={location} onSave={setChanged} />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);
  const [changed, setChanged] = useState(false);
  const [openPopWindow, setOpenPopWindow] = useState(false);

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
            if (changed) {
              setOpenPopWindow(true);
            }
            else {
              onCloseClick(id.toString());
            }
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
          onSave={setChanged}
        />
      </div>
      <ConfirmSave
        onOpen={openPopWindow}
        onClose={() => { setOpenPopWindow(false); }}
        next={() => { onCloseClick(id.toString()); }}
      />
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
