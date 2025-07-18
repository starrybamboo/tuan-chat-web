import type { StageEntityResponse } from "api";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { useModuleContext } from "@/components/module/workPlace/context/_moduleContext";
import { ModuleItemEnum } from "@/components/module/workPlace/context/types";
import { useAddMutation, useImportRoleMutation, useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useCreateRoleMutation, useGetUserRolesQuery } from "api/queryHooks";
import { useState } from "react";

// interface ModuleSceneRequest {
//   tip: string;
//   sceneDescription?: string; // 场景描述（可选）
//   image?: string;
// }

// interface ModuleItemRequest {
//   tip: string;
//   description?: string; // 描述（可选）
//   image?: string;
// }

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
  { role, name, isSelected, onClick, onDelete }: {
    role: StageEntityResponse;
    name: string;
    isSelected: boolean;
    onClick?: () => void;
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
        <img
          src={role.entityInfo!.avatar}
          alt="avatar"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline">{name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{role.entityInfo!.description}</p>
        </div>
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

// 新增：用于我的角色选择弹窗的组件
function MyRoleListItem({ avatarId, name, description, isSelected, onClick }: {
  avatarId: number | string;
  name: string;
  description?: string;
  isSelected: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`group w-full h-12 p-2 flex items-center justify-between hover:bg-base-200 cursor-pointer ${isSelected ? "bg-base-200" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <RoleAvatarComponent
          avatarId={Number(avatarId)}
          width={10}
          withTitle={false}
          isRounded={true}
          stopPopWindow={true}
        />
        <div className="flex flex-col">
          <p className="self-baseline">{name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

function RoleList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const userId = useGlobalContext().userId ?? -1;
  const handleClick = (role: StageEntityResponse) => {
    pushModuleTabItem({
      id: role.createTime! + role.name!,
      label: role.name!,
      type: ModuleItemEnum.ROLE,
    });
    setCurrentSelectedTabId(role.createTime! + role.name!);
  };

  // 模组相关
  const { data, isSuccess: _isSuccess } = useQueryEntitiesQuery(stageId);
  const list = data?.data!.filter(i => i.entityType === "role");
  const isEmpty = !list || list!.length === 0;

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
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
  const { mutate: addRole } = useImportRoleMutation();
  // 删除模组角色
  const { mutate: deleteRole } = useAddMutation();
  const handleAddRoleSubmit = () => {
    selectedRoleList.map((id) => {
      addRole({
        stageId,
        roleId: id,
      });
      return id;
    });
    setSelectedRoleList([]);
  };

  // 创建全新的模组角色
  const { mutate: createRole } = useCreateRoleMutation();
  const handleCreateRoleSubmit = () => {
    createRole({
      roleName: "新角色",
      description: "无",
    }, {
      onSuccess: (data) => {
        addRole({
          stageId,
          roleId: data as number,
        }, {
          onSuccess: (data) => {
            handleClick(data.data!);
          },
        });
      },
    });
  };

  return (
    <Section label="角色" onClick={handleOpen}>
      <>
        {isEmpty
          ? (
              <div className="text-sm text-gray-500 px-2 py-4">
                暂时没有人物哦
              </div>
            )
          : (list?.map(i => (
              <RoleListItem
                key={i!.entityInfo!.roleId ?? i!.name ?? 0}
                role={i!}
                name={i!.name || "未命名"}
                onDelete={() => {
                  removeModuleTabItem(i.createTime! + i.name);
                  deleteRole({
                    operationType: 1,
                    entityType: "role",
                    entityInfo: i.entityInfo,
                    stageId,
                    name: i.name as string,
                  });
                }}
                isSelected={currentSelectedTabId === (i!.createTime! + i!.name)}
                onClick={() => handleClick(i!)}
              />
            )))}
      </>
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <div className="p-4 space-y-4">
          <p className="text-xl font-bold">选择你的角色进行添加</p>
          <div className="space-y-2">
            {myRoleList?.map(i => (
              <MyRoleListItem
                key={i!.roleId}
                avatarId={i!.avatarId || ""}
                name={i!.roleName || "角色名称未设置"}
                description={i!.description || ""}
                isSelected={selectedRoleList.includes(i!.roleId || 0)}
                onClick={() => handleAddRole(i!.roleId || -1)}
              />
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleCreateRoleSubmit();
                handleClose();
              }}
              title="创建一个全新的模组角色"
            >
              创建一个全新的模组角色
            </button>
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleAddRoleSubmit();
                handleClose();
                // 添加角色的逻辑
              }}
              title="添加角色"
            >
              添加角色
            </button>
          </div>
        </div>
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
  item: StageEntityResponse;
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
        <img
          src={item.entityInfo!.image || "./favicon.ico"}
          alt="item"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline font-medium">{item.name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{item.entityInfo!.description}</p>
        </div>
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

// 物品列表
function ItemList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  // const queryClient = useQueryClient();

  const handleClick = (item: StageEntityResponse) => {
    pushModuleTabItem({
      id: item.createTime! + item.name!,
      label: item.name!,
      type: ModuleItemEnum.ITEM,
    });
    setCurrentSelectedTabId(item.createTime! + item.name!);
  };

  const { data } = useQueryEntitiesQuery(stageId);

  // 控制弹窗
  const [isOpen, setIsOpen] = useState(false);
  // // 选择场景
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // 创建物品并添加物品
  const { mutate: addAndDeleteItem } = useAddMutation();
  const handleCreateItemSubmit = () => {
    addAndDeleteItem({
      stageId,
      name: "新物品",
      entityType: "item",
      operationType: 0,
      entityInfo: {
        tip: "悄悄地告诉kp",
        description: "新物品です", // 描述
        image: "./favicon.ico",
      },
    });
  };

  const list = data?.data?.filter(i => i.entityType === "item");
  const sceneList = data?.data?.filter(i => i.entityType === "scene");
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
                  key={item.entityInfo!.itemId}
                  item={item}
                  isSelected={currentSelectedTabId === item.createTime! + item.name}
                  onClick={() => handleClick(item)}
                  onDelete={() => {
                    removeModuleTabItem(item.createTime! + item.name);
                    addAndDeleteItem({ operationType: 1, entityType: "item", entityInfo: item.entityInfo!, stageId, name: item.name! });
                  }}
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
                key={scene.entityInfo!.sceneId}
                scene={scene}
                isSelected={selectedSceneId === scene.createTime! + scene.name}
                onClick={() => setSelectedSceneId(scene.createTime! + scene.name)}
              />
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="btn btn-primary btn-md"
              onClick={() => {
                handleCreateItemSubmit();
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
  scene: StageEntityResponse;
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
        <img
          src={scene.entityInfo!.image || "./favicon.ico"}
          alt="scene"
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
        <div className="flex flex-col">
          <p className="self-baseline font-medium">{scene.name}</p>
          <p className="text-xs text-gray-500 self-baseline mt-0.5">{scene.entityInfo!.sceneDescription}</p>
        </div>
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

function SceneList({ stageId }: { stageId: number }) {
  const { pushModuleTabItem, setCurrentSelectedTabId, currentSelectedTabId, removeModuleTabItem } = useModuleContext();
  const handleClick = (scene: StageEntityResponse) => {
    const sceneId = scene.createTime! + scene.name;
    const sceneName = scene.name!;

    pushModuleTabItem({
      id: sceneId,
      label: sceneName,
      type: ModuleItemEnum.SCENE,
    });
    setCurrentSelectedTabId(sceneId);
  };

  // 创建场景和删除
  const { mutate: createAndDeleteScene } = useAddMutation();

  const handleAddScene = () => {
    createAndDeleteScene({
      stageId,
      name: "新场景",
      entityType: "scene",
      operationType: 0,
      entityInfo: {
        tip: "给予的提示",
        sceneDescription: "新场景です", // 场景描述（可选）
        image: "./favicon.ico",
      },
    });
  };

  const { data } = useQueryEntitiesQuery(stageId);

  const list = data?.data?.filter(i => i!.entityType === "scene");

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
                    key={scene.entityInfo!.moduleSceneId}
                    scene={scene}
                    isSelected={currentSelectedTabId === scene.createTime! + scene.name}
                    onClick={() => handleClick(scene)}
                    onDelete={() => {
                      removeModuleTabItem(scene.createTime! + scene.name);
                      createAndDeleteScene({ entityType: "scene", operationType: 1, stageId, name: scene.name! });
                    }}
                  />
                ))}
              </>
            )}
      </Section>
    </div>
  );
}

// const sections = ["角色", "物品", "场景"];
function ModuleItems({ stageId }: { stageId: number }) {
  return (
    <div className="w-full h-full flex flex-col">
      <RoleList stageId={stageId} />
      <ItemList stageId={stageId} />
      <SceneList stageId={stageId} />
      <div className="flex w-full">
        <details className="dropdown flex-1">
          <summary className="btn m-1 bg-primary text-primary-content">切换分支</summary>
          <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
            <li><a>Item 1</a></li>
            <li><a>Item 2</a></li>
          </ul>
        </details>
        <button className="btn btn-primary btn-md m-1 flex-1" type="button">提交</button>
      </div>
    </div>
  );
}

export default ModuleItems;
