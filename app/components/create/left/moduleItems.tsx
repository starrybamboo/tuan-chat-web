import type { ItemAddRequest, ModuleItemResponse, ModuleScene } from "api";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAddItemMutation, useAddSceneMutation, useCreateModuleRoleMutation, useDeleteItemMutation, useDeleteModuleRoleMutation, useDeleteSceneMutation, useModuleItemsQuery, useModuleRolesQuery, useModuleScenesQuery } from "api/hooks/moduleQueryHooks";
import { tuanchat } from "api/instance";
import { useCreateRoleMutation, useGetUserRolesQuery } from "api/queryHooks";
import { use, useState } from "react";
import WorkspaceContext from "../context/module";

function Section({ label, children, onClick }: { label: string; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className="collapse collapse-arrow bg-base-100 border-base-300 border rounded-none border-x-0">
      <input type="checkbox" />
      <div className="collapse-title font-semibold relative pr-10 flex items-center">
        {label}
        {/* 按钮放置在 .collapse-title 内部 */}
        <div className="absolute right-15 top-1/2 transform -translate-y-1/2 z-10">
          <button
            type="button"
            className="btn btn-primary btn-md btn-square"
            onClick={onClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="collapse-content p-0 text-sm flex flex-col">
        {children}
      </div>
    </div>
  );
}

// 角色表单项
function RoleListItem(
  { avatarId, name, isSelected, onClick, onDelete }: {
    avatarId: number;
    name: string;
    isSelected: boolean;
    onClick: () => void;
    onDelete?: () => void;
  },
) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        <RoleAvatarComponent
          avatarId={avatarId}
          width={10}
          withTitle={false}
          isRounded={true}
          stopPopWindow={true}
        />
        <p className="self-baseline">{name}</p>
      </div>

      {/* 右侧按钮 */}
      <button
        type="button"
        className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
        onClick={(e) => {
          if (onDelete)
            onDelete();
          e.stopPropagation();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function RoleList() {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();
  const queryClient = useQueryClient();
  const userId = useGlobalContext().userId ?? -1;
  const handleClick = (roleId: number, roleName: string) => {
    pushModuleTabItem({
      id: roleId.toString(),
      label: roleName,
      type: ModuleItemEnum.ROLE,
    });
    setCurrentSelectedTabId(roleId.toString());
    queryClient.invalidateQueries({
      queryKey: ["role", roleId],
    });
  };

  // 删除模组角色
  const { mutate: deleteModuleRole } = useDeleteModuleRoleMutation();

  // 模组相关
  const ctx = use(WorkspaceContext);
  const { data, isSuccess: _isSuccess } = useModuleRolesQuery({
    pageNo: 1,
    pageSize: 100,
    moduleId: ctx.moduleId,
  });
  const list = data?.data!.list!.map(i => i.roleResponse);

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [addRoleType, setAddRoleType] = useState<"add" | "creat">("add");
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleAddRoleOpen = (type: "add" | "creat") => {
    setIsAddRoleOpen(true);
    setAddRoleType(type);
  };
  const handleAddRoleClose = () => {
    setIsAddRoleOpen(false);
  };

  // 添加角色弹窗
  const [selectedRoleList, setSelectedRoleList] = useState<number[]>([]);

  const handleAddRole = (roleId: number) => {
    if (selectedRoleList.includes(roleId)) {
      setSelectedRoleList(selectedRoleList.filter(id => id !== roleId));
    }
    else {
      setSelectedRoleList([...selectedRoleList, roleId]);
    }
  };

  // 添加自己的角色
  const { data: myRoleData } = useGetUserRolesQuery(userId);
  const myRoleList = myRoleData?.data || [];

  // 添加模组角色
  const { mutate: addRole } = useCreateModuleRoleMutation();
  const handleAddRoleSubmit = (type: number) => {
    selectedRoleList.map((id) => {
      addRole({
        moduleId: ctx.moduleId,
        roleId: id,
        type,
      });
      return id;
    });
    handleAddRoleClose();
  };

  // 创建全新的模组角色
  const { mutate: createRole } = useCreateRoleMutation();
  const handleCreateRoleSubmit = (type: number) => {
    createRole({
      roleName: "新角色",
      description: "",
    }, {
      onSuccess: (data) => {
        addRole({
          moduleId: ctx.moduleId,
          roleId: data as number,
          type,
        });
        handleClick(data as number, "新角色");
      },
    });

    handleAddRoleClose();
  };

  return (
    <Section label="角色" onClick={handleOpen}>
      {list?.map(i => (
        <RoleListItem
          key={i!.roleId}
          avatarId={i!.avatarId}
          name={i!.roleName}
          isSelected={currentSelectedTabId === i!.roleId.toString()}
          onClick={() => handleClick(i!.roleId, i!.roleName)}
          onDelete={() => deleteModuleRole({ moduleId: ctx.moduleId, roleId: i!.roleId })}
        />
      ))}
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">选择你的角色进行添加</p>
          <div className="space-y-2">
            {myRoleList?.map(i => (
              <RoleListItem
                key={i!.roleId}
                avatarId={i!.avatarId}
                name={i!.roleName}
                isSelected={selectedRoleList.includes(i!.roleId)}
                onClick={() => handleAddRole(i!.roleId)}
              />
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleAddRoleOpen("creat");
              }}
              title="创建一个全新的模组角色"
            >
              创建一个全新的模组角色
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleAddRoleOpen("add");
                // 添加角色的逻辑
              }}
              title="添加角色"
            >
              添加角色
            </button>
          </div>
        </div>
        <PopWindow isOpen={isAddRoleOpen} onClose={handleAddRoleClose}>
          <div className="card w-96">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl font-bold">确认添加角色</h2>
              <div className="divider"></div>
              <p className="text-lg opacity-75 mb-8">确定要添加角色的类型</p>
            </div>
          </div>
          <div className="card-actions justify-center gap-6 mt-8">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                addRoleType === "add" ? handleAddRoleSubmit(1) : handleCreateRoleSubmit(1);
                handleClose();
              }}
            >
              NPC
            </button>
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => {
                addRoleType === "add" ? handleAddRoleSubmit(0) : handleCreateRoleSubmit(0);
                handleAddRoleClose();
                handleClose();
              }}
            >
              预设卡
            </button>
          </div>
        </PopWindow>
      </PopWindow>
    </Section>
  );
}

function ItemListItem({
  item,
  isSelected,
  onClick,
  onDelete,
}: {
  item: ModuleItemResponse;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        <p className="self-baseline font-medium">{item.name}</p>
        {item.moduleSceneId && (
          <p className="text-xs text-gray-500 truncate">
            场景ID:
            {item.moduleSceneId}
          </p>
        )}
      </div>

      {/* 右侧按钮 */}
      {onDelete && (
        <button
          type="button"
          className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
          onClick={(e) => {
            if (onDelete)
              onDelete();
            e.stopPropagation();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// 可能用得上
function ItemList() {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();
  const queryClient = useQueryClient();

  const handleClick = (itemId: number, itemName: string) => {
    pushModuleTabItem({
      id: itemId.toString(),
      label: itemName,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(itemId.toString());
  };

  const ctx = use(WorkspaceContext);
  const { data } = useModuleItemsQuery({
    moduleId: ctx.moduleId,
  });
  const { data: sceneData } = useModuleScenesQuery({
    pageNo: 1,
    pageSize: 100,
    moduleId: ctx.moduleId,
  });

  // 删除物品
  const { mutate: deleteItem } = useDeleteItemMutation();

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  // 选择场景
  const [selectedSceneId, setSelectedSceneId] = useState<number>(0);
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 创建物品并添加物品
  const { mutate: createItem } = useMutation({
    mutationKey: ["createItem"],
    mutationFn: async (req: ItemAddRequest) => await tuanchat.itemController.addItem1(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moduleItems"] });
    },
  });
  const { mutate: addItem } = useAddItemMutation();
  const handleCreateItemSubmit = (moduleSceneId: number) => {
    const itemName = "新物品";
    createItem({
      ruleId: ctx.ruleId,
      name: itemName,
      description: "新物品",
      extra: { default: "default" },
      type: "暂时未知",
      image: "null",
    }, {
      onSuccess: ({ data: itemId }) => {
        addItem({
          moduleId: ctx.moduleId,
          itemId: itemId || 0,
          moduleSceneId,
          name: itemName,
        });
        handleClick(itemId as number, itemName);
      },
    });
  };

  const list = data?.data;
  const sceneList = sceneData?.data!.list;
  const isEmpty = !list || list.length === 0;

  return (
    <Section label="物品" onClick={handleOpen}>
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有物品哦
              </div>
            )
          : (
              list.map(item => (
                <ItemListItem
                  key={item.itemId}
                  item={item}
                  isSelected={currentSelectedTabId === item.itemId?.toString()}
                  onClick={() => handleClick(item.itemId!, item.name!)}
                  onDelete={() => deleteItem({ itemIds: [item.itemId!] })}
                />
              ))
            )}
      </>
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">选择添加的物品所在的场景</p>
          <div className="space-y-2">
            {sceneList?.map(scene => (
              <SceneListItem
                key={scene.moduleSceneId}
                scene={scene}
                isSelected={selectedSceneId === scene.moduleSceneId}
                onClick={() => setSelectedSceneId(scene.moduleSceneId as number)}
              />
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleCreateItemSubmit(selectedSceneId);
                setIsOpen(false);
              }}
              title="创建物品"
            >
              创建物品
            </button>
          </div>
        </div>
      </PopWindow>
    </Section>
  );
}

function SceneListItem({
  scene,
  isSelected,
  onClick,
  onDelete,
}: {
  scene: ModuleScene;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      {/* 左侧内容 */}
      <div className="flex items-center gap-2">
        <p className="self-baseline font-medium">{scene.moduleSceneName}</p>
        {scene.sceneDescription && (
          <p className="text-xs text-gray-500 truncate">{scene.sceneDescription}</p>
        )}
      </div>

      {/* 右侧按钮 */}
      {onDelete && (
        <button
          type="button"
          className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
          onClick={(e) => {
            if (onDelete)
              onDelete();
            e.stopPropagation();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SceneList() {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId } = useModuleContext();
  const ctx = use(WorkspaceContext);
  const handleClick = (scene: ModuleScene) => {
    const sceneId = scene.moduleSceneId!;
    const sceneName = scene.moduleSceneName!;

    pushModuleTabItem({
      id: sceneId.toString(),
      label: sceneName,
      type: ModuleItemEnum.SCENE,
    });
    setCurrentSelectedTabId(sceneId.toString());
  };

  // 创建场景
  const { mutate: createScene } = useAddSceneMutation();
  // 删除场景
  const { mutate: deleteScene } = useDeleteSceneMutation();

  const handleAddScene = () => {
    createScene({
      moduleId: ctx.moduleId,
      moduleSceneName: "新场景",
      sceneDescription: "",
    }, {
      onSuccess: (data) => {
        if (data.success) {
          pushModuleTabItem({
            id: data?.data?.toString() as string,
            label: "新场景",
            type: ModuleItemEnum.SCENE,
          });
          setCurrentSelectedTabId(data?.data?.toString() as string);
        }
      },
    });
  };

  const { data } = useModuleScenesQuery({
    pageNo: 1,
    pageSize: 100,
    moduleId: ctx.moduleId,
  });

  const list = data?.data!.list;

  // 判断列表是否存在且非空
  const isEmpty = !list || list.length === 0;

  return (
    <div>
      <Section label="场景" onClick={handleAddScene}>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">暂时没有场景哦</div>
            )
          : (
              <>
                {list?.map(scene => (
                  <SceneListItem
                    key={scene.moduleSceneId}
                    scene={scene}
                    isSelected={currentSelectedTabId === scene.moduleSceneId?.toString()}
                    onClick={() => handleClick(scene)}
                    onDelete={() => deleteScene({ sceneIds: [scene.moduleSceneId!] })}
                  />
                ))}
              </>
            )}
      </Section>
    </div>
  );
}

// const sections = ["角色", "物品", "场景"];
function ModuleItems() {
  return (
    <div className="w-full h-full">
      <RoleList />
      <ItemList />
      <SceneList />
      {/* {sections.map((i) => {
        return <Section key={i} label={i}></Section>;
      })} */}
    </div>
  );
}

export default ModuleItems;
