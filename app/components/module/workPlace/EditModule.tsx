import type { ModuleScene } from "api";
import type { SVGProps } from "react";
import type { ModuleTabItem, RoleModuleItem } from "./context/types";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useRef } from "react";
import { useModuleContext } from "./context/_moduleContext";
import SceneEdit from "./context/SceneEdit";
import { ModuleItemEnum } from "./context/types";
import NPCEdit from "./NPCEdit";

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
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  roleModuleItem: RoleModuleItem;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = roleModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  // 当组件是最新的时候，自动选中
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  // 选中角色, 请求 avatarId
  const { data } = useQuery({
    queryKey: ["role", id],
    queryFn: () => tuanchat.roleController.getRole(Number(id)),
  });
  const avatarId = data?.data?.avatarId;
  // 根据 avatarId 请求 avatar数据
  const { data: avatarData, isPending } = useQuery({
    queryKey: ["RoleAvatar", avatarId],
    queryFn: () => tuanchat.avatarController.getRoleAvatar(avatarId || 0),
    enabled: !!avatarId,
  });
  // 完成所有请求,设置角色
  const role = {
    id: data?.data?.roleId || 0,
    avatar: avatarData?.data?.avatarUrl || "",
    name: data?.data?.roleName || "",
    description: data?.data?.description || "",
    avatarId: data?.data?.avatarId || 0,
    modelName: data?.data?.modelName || "",
    speakerName: data?.data?.speakerName || "",
  };

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id)}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id);
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {isPending
          ? <div>Loading</div>
          : <NPCEdit selectRole={role} />}
      </div>
    </>
  );
}

function SceneModuleTabItem({
  sceneModuleItem,
  isSelected,
  onTabClick,
  onCloseClick,
}: {
  sceneModuleItem: ModuleTabItem;
  isSelected: boolean;
  onTabClick: (id: string) => void;
  onCloseClick: (id: string) => void;
}) {
  const { id, label } = sceneModuleItem;
  const inputRef = useRef<HTMLInputElement>(null);

  // 当组件是最新的时候，自动选中
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  // 请求场景数据
  const { data, isPending } = useQuery({
    queryKey: ["scene", id],
    queryFn: () => tuanchat.moduleScene.getSceneById(Number(id)),
  });

  const scene = data?.data || ({} as ModuleScene); // 根据实际类型调整

  return (
    <>
      <label className="tab flex-row-reverse pr-8! relative group before:hidden!">
        <input
          ref={inputRef}
          type="radio"
          name="WorkSpaceTab"
          className="tab"
          aria-label={label}
          onClick={onTabClick.bind(null, id)}
        />
        <div
          className={`
            absolute right-[10px] invisible
            w-4 h-4 flex items-center justify-center
            group-hover:visible ${isSelected ? "visible" : ""}
            hover:bg-base-content/80 rounded-sm
          `}
          onClick={() => {
            onCloseClick(id);
          }}
        >
          <BaselineClose />
        </div>
        {label}
      </label>
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {isPending
          ? (
              <div>Loading</div>
            )
          : (
              <SceneEdit selectedScene={scene} />
            )}
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
  const sceneModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.SCENE,
  );

  return (
    <div className="h-screen p-4 overflow-y-scroll">
      <div className="w-full h-full tabs tabs-lift">
        {roleModuleItems.map(item => (
          <RoleModuleTabItem
            key={item.id}
            roleModuleItem={item}
            isSelected={item.id === currentSelectedTabId}
            onTabClick={setCurrentSelectedTabId}
            onCloseClick={removeModuleTabItem}
          />
        ))}
        {
          sceneModuleItems.map(item => (
            <SceneModuleTabItem
              key={item.id}
              sceneModuleItem={item}
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
