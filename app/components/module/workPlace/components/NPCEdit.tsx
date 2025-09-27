import type { RoleAvatar as roleAvatar } from "api";
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatar from "@/components/common/roleAvatar";

import { CharacterCopper } from "@/components/newCharacter/sprite/CharacterCopper";
import { useQuery } from "@tanstack/react-query";
import { useQueryEntitiesQuery, useUpdateEntityMutation, useUploadModuleRoleAvatarMutation } from "api/hooks/moduleQueryHooks";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { tuanchat } from "api/instance";
import { useDeleteRoleAvatarMutation } from "api/queryHooks";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useModuleContext } from "../context/_moduleContext";

interface NPCEditProps {
  role: StageEntityResponse;
  // allow parent to register this edit's save handler
  onRegisterSave?: (fn: () => void) => void;
}

export default function NPCEdit({ role, onRegisterSave }: NPCEditProps) {
  // 接入接口
  const { mutate: updateRoleAvatar } = useUploadModuleRoleAvatarMutation();
  const { mutate: deleteAvatar } = useDeleteRoleAvatarMutation();
  // entityInfo 结构见后端定义
  const entityInfo = role.entityInfo || {};
  const { stageId, removeModuleTabItem, updateModuleTabLabel } = useModuleContext();

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(entity => entity.entityType === 3);
  // 本地状态
  const [localRole, setLocalRole] = useState({ ...entityInfo });
  const [ability, setAbility] = useState(entityInfo.ability || {});
  // 角色名改为仅在列表中重命名，编辑器内不再直接编辑
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [charCount, setCharCount] = useState(entityInfo.description?.length || 0);

  // 头像相关事宜
  const [copperedUrl, setCopperedUrl] = useState<string>("");
  const [roleAvatars, setRoleAvatars] = useState<roleAvatar[]>([]);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  const MAX_DESCRIPTION_LENGTH = 140;

  // 获取规则详细
  const { data: ruleAbility } = useGetRuleDetailQuery(1);
  const [showAbilityPopup, setShowAbilityPopup] = useState(false);
  const [selectedAbilities, setSelectedAbilities] = useState<Record<string, number>>({});
  const [newAbilityName, setNewAbilityName] = useState("");
  const [newAbilityValue, setNewAbilityValue] = useState(0);

  // 规则能力搜索框
  const [abilitySearchQuery, setAbilitySearchQuery] = useState("");

  // 不再使用编辑模式/同步 props 到 state 的副作用，初始值已从 props 派生

  // 接入接口
  const { mutate: updateRole } = useUpdateEntityMutation(stageId as number);

  // 引用最新状态，供防抖保存时使用
  const localRoleRef = useRef(localRole);
  const abilityRef = useRef(ability);
  // 名称不在此处编辑，保持与外部同步
  const nameRef = useRef(role.name);
  useEffect(() => {
    localRoleRef.current = localRole;
  }, [localRole]);
  useEffect(() => {
    abilityRef.current = ability;
  }, [ability]);
  useEffect(() => {
    nameRef.current = role.name;
  }, [role.name]);

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const updatedRole = { ...localRoleRef.current, ability: abilityRef.current };
      setIsTransitioning(false);
      const oldName = role.name;
      const changed = false; // 名称不在编辑器内修改
      // 先更新角色自身，成功后再同步引用与关闭标签，避免因移除标签导致保存函数不可用
      updateRole(
        { id: role.id!, entityType: 2, entityInfo: updatedRole, name: role.name },
        {
          onSuccess: () => {
            if (changed) {
              // 同步更新 scene 中的角色名
              const newScenes = sceneEntities?.map((scene) => {
                const newRoles = scene.entityInfo?.roles.map((r: string | undefined) => (r === oldName ? role.name : r));
                return { ...scene, entityInfo: { ...scene.entityInfo, roles: newRoles } };
              });
              newScenes?.forEach(scene => updateRole({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
              // 同步更新当前 Tab 的 label
              updateModuleTabLabel(role.id!.toString(), role.name || "");
              // 最后移除标签
              removeModuleTabItem(role.id!.toString());
            }
            toast.success("保存成功");
          },
        },
      );
    }, 300);
  };

  // 对外注册保存函数（保持稳定引用，避免依赖 handleSave）
  const saveRef = useRef<() => void>(() => { });
  useLayoutEffect(() => {
    saveRef.current = handleSave;
  });
  useLayoutEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(() => saveRef.current());
    }
  }, [onRegisterSave]);

  // 自动保存防抖（在 handleSave 定义之后，避免使用前定义）
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const scheduleSave = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      handleSave();
    }, 8000);
  };

  // 组件卸载时清理未触发的自动保存定时器
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  // 处理添加能力
  const handleAddAbilities = () => {
    const updatedAbility = { ...ability };
    Object.entries(selectedAbilities).forEach(([key, value]) => {
      if (key && value !== undefined) {
        updatedAbility[key] = value;
      }
    });
    if (newAbilityName) {
      updatedAbility[newAbilityName] = newAbilityValue;
    }
    setAbility(updatedAbility);
    updateRole({ id: role.id!, entityType: 2, entityInfo: { ...localRole, ability: updatedAbility }, name: role.name });
    setSelectedAbilities({});
    setNewAbilityName("");
    setNewAbilityValue(0);
    setShowAbilityPopup(false);
  };

  // 在状态定义后添加一个辅助函数
  const isBaseAttribute = (key: string) => {
    const baseAttributes = ["str", "dex", "pow", "con", "app", "edu", "siz", "int", "luck"];
    return baseAttributes.includes(key);
  };

  // 获取角色所有头像
  useQuery({
    queryKey: ["roleAvatar", role.id, localRole.avatarIds],
    queryFn: async () => {
      const res = localRole.avatarIds.map(async (avatarId: number) => {
        const res = await tuanchat.avatarController.getRoleAvatar(avatarId);
        return res.data;
      });
      setRoleAvatars(await Promise.all(res));
      return null;
    },
  });

  // 处理弹窗相关事宜
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [changeAvatarConfirmOpen, setChangeAvatarConfirmOpen] = useState(false);

  const handleCancelChangeAvatar = () => {
    setChangeAvatarConfirmOpen(false);
  };

  const cancelDeleteAvatar = () => {
    setIsDeleteModalOpen(false);
  };

  // 点击头像处理 (新增预览文字更新)
  const handleAvatarClick = (avatarUrl: string, index: number) => {
    setCopperedUrl(avatarUrl || "");
    // 选中的头像移到最前面
    const newRoleAvatars = [...roleAvatars];
    const [selectedAvatar] = newRoleAvatars.splice(index, 1);
    newRoleAvatars.unshift(selectedAvatar);
    setRoleAvatars(newRoleAvatars);
  };

  // 删除操作处理
  const handleDeleteAvatar = (index: number) => {
    setAvatarToDeleteIndex(index);
    setIsDeleteModalOpen(true);
  };
  // 删除头像
  const confirmDeleteAvatar = () => {
    if (avatarToDeleteIndex !== null && avatarToDeleteIndex >= 0 && avatarToDeleteIndex < roleAvatars.length) {
      setRoleAvatars(prevRoleAvatars =>
        prevRoleAvatars.filter((_, i) => i !== avatarToDeleteIndex),
      );
      deleteAvatar(roleAvatars[avatarToDeleteIndex]?.avatarId || 0, {
        onSuccess: () => {
          const updatedRole = { ...role, avatarIds: localRole.avatarIds.filter((id: number) => id !== roleAvatars[avatarToDeleteIndex]?.avatarId) };
          updateRole({
            id: role.id!,
            entityType: 2,
            entityInfo: updatedRole,
            name: role.name!,
          });
        },
      });
      setAvatarToDeleteIndex(null);
      setIsDeleteModalOpen(false);
    }
    else {
      console.error("无效的头像索引");
      setIsDeleteModalOpen(false);
    }
  };

  // 辅助函数生成唯一文件名
  const generateUniqueFileName = (roleId: number): string => {
    const timestamp = Date.now();
    return `avatar-${roleId}-${timestamp}`;
  };

  // 生成唯一文件名
  const uniqueFileName = generateUniqueFileName(role.id as number);
  // const handleAvatarChange = (avatar: string) => {
  //   const updatedRole = { ...localRole, avatar };
  //   setLocalRole(updatedRole);
  //   updateRole({
  //     id: role.id!,
  //     entityType: 2,
  //     entityInfo: updatedRole,
  //     name: role.name!,
  //   });
  // };

  // 计算六大属性
  const hp = ability.con && ability.siz ? Math.floor((ability.con + ability.siz) / 10) : "-";
  const san = ability.pow ?? "-";
  // MOV 计算
  let mov: string = "-";
  if (typeof ability.dex === "number" && typeof ability.str === "number" && typeof ability.siz === "number") {
    if (ability.dex < ability.siz && ability.str < ability.siz)
      mov = "7";
    else if (ability.dex > ability.siz && ability.str > ability.siz)
      mov = "9";
    else mov = "8";
  }
  // MP 计算
  const mp = ability.pow ? Math.floor(ability.pow / 5).toString() : "-";

  // 伤害加值和体格计算
  let db = "-";
  let build = "-";
  if (typeof ability.str === "number" && typeof ability.siz === "number") {
    const sum = ability.str + ability.siz;
    if (sum >= 2 && sum <= 64) {
      db = "-2";
      build = "-2";
    }
    else if (sum >= 65 && sum <= 84) {
      db = "-1";
      build = "-1";
    }
    else if (sum >= 85 && sum <= 124) {
      db = "0";
      build = "0";
    }
    else if (sum >= 125 && sum <= 164) {
      db = "+1d4";
      build = "1";
    }
    else if (sum >= 165 && sum <= 204) {
      db = "+1d6";
      build = "2";
    }
    else if (sum >= 205 && sum <= 284) {
      db = "+2d6";
      build = "3";
    }
    else if (sum >= 285 && sum <= 364) {
      db = "+3d6";
      build = "4";
    }
    // 超过364，按每80点递增1d6和+1体格
    else if (sum > 364) {
      const extra = Math.floor((sum - 285) / 80) + 1;
      db = `+${extra + 2}d6`;
      build = `${extra + 2}`;
    }
  }

  // register handled above using saveRef to keep a stable reference

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""} relative`}>
      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-full w-full flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 min-h-0 justify-center">
            {/* 大图预览 */}
            <div className="w-full md:w-1/2 bg-base-200 p-3 rounded-lg order-1 md:order-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  角色头像
                </h2>
              </div>
              <div className=" bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                <img
                  src={roleAvatars[0]?.avatarUrl ?? "./favicon.ico"}
                  alt="预览"
                  className="md:max-h-[65vh] md:min-h-[35vh] object-contain"
                />
              </div>
            </div>

            <div className="w-full md:w-1/2 p-3 order-2 md:order-2">
              {/* 头像列表区域 */}
              <h2 className="text-xl font-bold mb-4">选择头像：</h2>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                {roleAvatars.map((item, index) => (
                  <li
                    key={`${item.avatarId ?? index}`}
                    className="relative w-full max-w-[128px] flex flex-col items-center rounded-lg transition-colors"
                    onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                  >
                    {/* 头像卡片容器 */}
                    <div className="relative w-full aspect-square group cursor-pointer">
                      <img
                        src={item.avatarUrl || "/favicon.ico"}
                        alt="头像"
                        className={`w-full h-full object-contain rounded-lg transition-all duration-300 group-hover:scale-105 ${item.avatarUrl === copperedUrl ? "border-2 border-primary" : "border"}`}
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 btn btn-error btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAvatar(index);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
                {/* 添加新头像 */}
                <li className="relative w-full max-w-[128px] aspect-square flex flex-col items-center rounded-lg transition-colors">
                  <CharacterCopper
                    setDownloadUrl={() => { }}
                    setCopperedDownloadUrl={setCopperedUrl}
                    fileName={uniqueFileName}
                    scene={4} // 模组角色差分
                    mutate={(data) => {
                      updateRoleAvatar({ ...data, id: role.id }, {
                        onSuccess: (_data) => {
                          const updatedRole = { ...localRole, avatarIds: [...(localRole.avatarIds || []), _data] };
                          setLocalRole(updatedRole);
                          updateRole({
                            id: role.id!,
                            entityType: 2,
                            entityInfo: updatedRole,
                            name: role.name!,
                          });
                        },
                      });
                    }}
                  >
                    <button type="button" className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full text-gray-400 transition-transform duration-300 group-hover:scale-105"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </button>
                  </CharacterCopper>
                </li>
              </div>
            </div>

            {/* 删除确认弹窗 */}
            <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
              <div className="card">
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl font-bold">确认删除头像</h2>
                  <div className="divider"></div>
                  <p className="text-lg opacity-75 mb-8">确定要删除这个头像吗？</p>
                </div>
              </div>
              <div className="card-actions justify-center gap-6 mt-8">
                <button type="button" className="btn btn-outline" onClick={cancelDeleteAvatar}>
                  取消
                </button>
                <button type="button" className="btn btn-error" onClick={confirmDeleteAvatar}>
                  删除
                </button>
              </div>
            </PopWindow>
          </div>
          <div className="absolute bottom-5 right-5 md:bottom-10 md:right-10 card-actions justify-end">
            <button
              type="submit"
              onClick={() => {
                setChangeAvatarConfirmOpen(false);
                const newAvatarId = roleAvatars[0]?.avatarId;
                // const newAvatarIds = roleAvatars.map(avatar => avatar.avatarId);
                const updatedRole = { ...localRole, avatarId: newAvatarId };
                setLocalRole(updatedRole);
                updateRole({
                  id: role.id!,
                  name: role.name!,
                  entityType: 2,
                  entityInfo: updatedRole,
                });
              }}
              className="btn btn-primary btn-md md:btn-lg"
            >
              确认更改头像
            </button>
          </div>
        </div>

      </PopWindow>
      {/* 基础信息卡片 */}
      <div className="bg-base-100">
        {/* 头像与表单横向布局 */}
        <div className="flex flex-row items-start gap-6 mb-6">
          {/* 头像 */}
          <div className="flex flex-col justify-start items-start shrink-0">
            <span className="text-lg font-bold break-words mb-2">{role.name}</span>
            <div className="avatar cursor-pointer group flex items-start justify-start mb-2" onClick={() => setChangeAvatarConfirmOpen(true)}>
              <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                <RoleAvatar
                  avatarId={localRole.avatarId || (localRole.avatarIds && localRole.avatarIds.length > 0 ? localRole.avatarIds[0] : 0)}
                  width={36}
                  isRounded={false}
                  stopPopWindow={true}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <label className="font-medium text-base" htmlFor="roleType">类型：</label>
              <select
                id="roleType"
                value={localRole.type ?? ""}
                onChange={(e) => {
                  setLocalRole(prev => ({ ...prev, type: Number(e.target.value) }));
                  scheduleSave();
                }}
                className="select rounded-md"
              >
                <option value={0}>NPC</option>
                <option value={1}>预设卡</option>
              </select>
            </div>
          </div>
          <div className="divider divider-horizontal" />

          {/* 简介和类型表单整体在头像右侧，垂直居中 */}
          <div className="flex flex-col gap-4 w-2/3 justify-center h-full self-center">
            <div className="flex items-center justify-between">
              <label className="text-base" htmlFor="roleDescription">简介：</label>
              <span
                className={`text-base font-bold ${charCount > MAX_DESCRIPTION_LENGTH
                  ? "text-error"
                  : "text-base-content/70"
                }`}
              >
                {charCount}
                /
                {MAX_DESCRIPTION_LENGTH}
                {charCount > MAX_DESCRIPTION_LENGTH && (
                  <span className="ml-2">(已超出描述字数上限)</span>
                )}
              </span>
            </div>
            <textarea
              id="roleDescription"
              value={localRole.description || ""}
              onChange={(e) => {
                setLocalRole(prev => ({ ...prev, description: e.target.value }));
                setCharCount(e.target.value.length);
                scheduleSave();
              }}
              placeholder="角色描述"
              className="textarea textarea-bordered rounded-md w-full min-h-32 resize-none flex-1"
            />
          </div>
        </div>
        {/* 六大属性展示区 */}
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-6">
            <div className="card bg-base-200 shadow-sm p-2 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">生命值</span>
              <span className="font-bold text-lg">{hp}</span>
            </div>
            <div className="card bg-base-200 shadow-sm p-2 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">理智值</span>
              <span className="font-bold text-lg">{san}</span>
            </div>
            <div className="card bg-base-200 shadow-sm p-2 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">移动速度</span>
              <span className="font-bold text-lg">{mov}</span>
            </div>
            <div className="card bg-base-200 shadow-sm p-2 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">魔法值</span>
              <span className="font-bold text-lg">{mp}</span>
            </div>
            <div className="card bg-base-200 shadow-sm p-2 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">伤害加值</span>
              <span className="font-bold text-lg">{db}</span>
            </div>
            <div className="card bg-base-200 shadow-sm p-2 flex flex-col items-center">
              <span className="text-xs text-gray-500 mb-1">体格</span>
              <span className="font-bold text-lg">{build}</span>
            </div>
          </div>
        </div>
        {/* 属性表格区域，UI参考NumericalEditor */}
        <div className="mt-6">
          <h3 className="font-bold mb-2 w-full border-b-2">角色属性</h3>
          <div className="overflow-x-auto">
            <table className="table bg-base-200 rounded-lg">
              <thead>
                <tr className="bg-base-100">
                  <th className="text-center">属性</th>
                  <th className="text-center">数值</th>
                  <th className="text-center">英文</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center font-bold">力量</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.str ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, str: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">STR</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">敏捷</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.dex ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, dex: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">DEX</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">意志</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.pow ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, pow: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">POW</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">体质</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.con ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, con: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">CON</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">外貌</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.app ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, app: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">APP</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">教育</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.edu ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, edu: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">EDU</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">体型</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.siz ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, siz: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">SIZ</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">智力</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.int ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, int: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">INT</td>
                </tr>
                <tr>
                  <td className="text-center font-bold">幸运</td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="input input-bordered input-sm w-20 text-center"
                      value={ability.luck ?? ""}
                      onChange={(e) => {
                        setAbility((prev: any) => ({ ...prev, luck: Number(e.target.value) }));
                        scheduleSave();
                      }}
                    />
                  </td>
                  <td className="text-center text-xs text-gray-500">LUCK</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2 w-full border-b-2">
              <h3 className="font-bold">自定义能力</h3>
              <button
                type="button"
                onClick={() => setShowAbilityPopup(true)}
                className="btn btn-sm btn-accent"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  创建能力
                </span>
              </button>
            </div>
            {/* 自定义能力展示区 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
              {Object.entries(ability)
                .filter(([key]) => !isBaseAttribute(key))
                .map(([key, value]) => (
                  <div key={key} className="card bg-base-100 shadow-sm p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-medium text-sm">{key}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={value as number}
                          onChange={(e) => {
                            setAbility((prev: any) => ({
                              ...prev,
                              [key]: Number(e.target.value),
                            }));
                            scheduleSave();
                          }}
                          className="input input-bordered input-sm w-20"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newAbility = { ...ability } as any;
                            delete newAbility[key];
                            setAbility(newAbility);
                            scheduleSave();
                          }}
                          className="btn btn-error btn-circle btn-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
        <PopWindow
          isOpen={showAbilityPopup}
          onClose={() => {
            setShowAbilityPopup(false);
            // 关闭弹窗时清除搜索查询
            setAbilitySearchQuery("");
          }}
          fullScreen={false}
        >
          <div className="space-y-4">
            <h3 className="font-bold text-lg">选择能力</h3>

            {/* 添加搜索框 */}
            <div className="flex gap-2">
              <label className="input flex items-center gap-2 w-full">
                <svg
                  className="h-[1em]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  className="grow"
                  placeholder="搜索能力..."
                  value={abilitySearchQuery}
                  onChange={e => setAbilitySearchQuery(e.target.value)}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {Object.entries(ruleAbility?.data?.skillDefault || {})
                .filter(([key]) =>
                  key.toLowerCase().includes(abilitySearchQuery.toLowerCase())
                  || abilitySearchQuery === "",
                )
                .map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`ability-${key}`}
                      checked={Object.prototype.hasOwnProperty.call(selectedAbilities, key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // 选中时添加能力
                          setSelectedAbilities(prev => ({
                            ...prev,
                            [key]: Number(value),
                          }));
                        }
                        else {
                          // 取消选中时移除能力
                          const { [key]: _, ...rest } = selectedAbilities;
                          setSelectedAbilities(rest);
                        }
                      }}
                      className="checkbox checkbox-sm"
                    />
                    <label htmlFor={`ability-${key}`} className="flex-1">
                      {key}
                      {" "}
                      (
                      {value}
                      )
                    </label>
                  </div>
                ))}
            </div>

            {/* 当搜索结果为空时显示提示 */}
            {abilitySearchQuery
              && Object.keys(ruleAbility?.data?.skillDefault || {})
                .filter(([key]) =>
                  key.toLowerCase().includes(abilitySearchQuery.toLowerCase()),
                )
                .length === 0 && (
              <div className="text-center py-4 text-base-content/50">
                未找到匹配的能力
              </div>
            )}

            <div className="divider">或创建新能力</div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newAbilityName}
                onChange={e => setNewAbilityName(e.target.value)}
                placeholder="能力名称"
                className="input input-bordered flex-1"
              />
              <input
                type="number"
                value={newAbilityValue}
                onChange={e => setNewAbilityValue(Number(e.target.value))}
                placeholder="数值"
                className="input input-bordered w-20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAbilityPopup(false);
                  setAbilitySearchQuery("");
                }}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddAbilities}
                className="btn btn-primary"
              >
                确认添加
              </button>
            </div>
          </div>
        </PopWindow>
      </div>
    </div>
  );
}
