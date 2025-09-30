import type { RoleAvatar as roleAvatar } from "api";
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatar from "@/components/common/roleAvatar";
import { CharacterCopper } from "@/components/newCharacter/sprite/CharacterCopper";
import { SpriteRenderStudio } from "@/components/newCharacter/sprite/SpriteRenderStudio";
import { useQuery } from "@tanstack/react-query";
import { useModuleIdQuery } from "api/hooks/moduleAndStageQueryHooks";
import { useQueryEntitiesQuery, useUpdateEntityMutation, useUploadModuleRoleAvatarMutation } from "api/hooks/moduleQueryHooks";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { tuanchat } from "api/instance";
import { useDeleteRoleAvatarMutation } from "api/queryHooks";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useModuleContext } from "../context/_moduleContext";
import { invokeSaveWithTinyRetry } from "./invokeSaveWithTinyRetry";

interface NPCEditProps {
  role: StageEntityResponse;
}

// 内联的属性编辑模块 (简化版 ExpansionModule) - 独立定义避免每次渲染重建
interface InlineExpansionModuleProps {
  ability: Record<string, number>;
  setAbility: React.Dispatch<React.SetStateAction<any>>;
  scheduleSave: () => void;
  /** 基础属性中文键集合 */
  basicDefaults: Record<string, any>;
  abilityDefaults: Record<string, any>;
  setShowAbilityPopup: (v: boolean) => void;
}

function InlineExpansionModule({ ability, setAbility, scheduleSave, basicDefaults, abilityDefaults, setShowAbilityPopup }: InlineExpansionModuleProps) {
  // 基础属性键集合（中文）
  const basicKeys = Object.keys(basicDefaults || {});
  const abilityKeys = Object.keys(abilityDefaults || {});

  return (
    <div className="space-y-6">
      {/* 基础属性 Section */}
      <div className="space-y-4">
        <div className="collapse collapse-arrow rounded-2xl border-2 border-base-content/10 bg-base-100">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-lg font-bold">基础属性</div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {basicKeys.map(label => (
                <div key={label} className="card bg-base-100 shadow-sm p-3 border border-base-200">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm truncate" title={label}>{label}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={ability[label] ?? ""}
                        onChange={(e) => {
                          setAbility((prev: any) => ({ ...prev, [label]: Number(e.target.value) }));
                          scheduleSave();
                        }}
                        className="input input-bordered input-sm w-20"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {basicKeys.length === 0 && (
                <div className="text-sm opacity-60 col-span-full text-center py-4">暂无基础属性配置</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="collapse collapse-arrow rounded-2xl border-2 border-base-content/10 bg-base-100">
          <input type="checkbox" defaultChecked />
          <div className="collapse-title text-lg font-bold">能力设置</div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {abilityKeys.map(label => (
                <div key={label} className="card bg-base-100 shadow-sm p-3 border border-base-200">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm truncate" title={label}>{label}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ability[label] ?? ""}
                        className="input input-bordered input-sm w-20"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {abilityKeys.length === 0 && (
                <div className="text-sm opacity-60 col-span-full text-center py-4">暂无能力属性配置</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 自定义能力 Section */}
      <div className="relative collapse collapse-arrow rounded-2xl border-2 border-base-content/10 bg-base-100">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title flex items-center justify-between pr-0">
          <span className="font-bold">自定义能力</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowAbilityPopup(true);
            }}
            className="btn btn-sm btn-accent absolute z-20 right-30"
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 4v16m8-8H4" stroke="currentColor" strokeWidth="2" />
              </svg>
              创建能力
            </span>
          </button>
        </div>
        <div className="collapse-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(ability)
              .filter(([key]) => !basicKeys.includes(key))
              .map(([key, value]) => (
                <div key={key} className="card bg-base-100 shadow-sm p-3 border border-base-200">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm truncate" title={key}>{key}</div>
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
            {Object.entries(ability).filter(([key]) => !basicKeys.includes(key)).length === 0 && (
              <div className="text-sm opacity-60 col-span-full text-center py-4">暂无自定义能力，点击“创建能力”添加</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NPCEdit({ role }: NPCEditProps) {
  // 上下文获取moduleId
  const { moduleId } = useModuleContext();
  // 接入接口
  const { mutate: updateRoleAvatar } = useUploadModuleRoleAvatarMutation();
  const { mutate: deleteAvatar } = useDeleteRoleAvatarMutation();
  const moduleInfo = useModuleIdQuery(moduleId as number);
  // entityInfo 结构见后端定义
  const entityInfo = role.entityInfo || {};
  const { stageId, removeModuleTabItem, updateModuleTabLabel } = useModuleContext();

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(entity => entity.entityType === 3);
  // 本地状态
  const [localRole, setLocalRole] = useState({ ...entityInfo });
  const [ability, setAbility] = useState<Record<string, number>>(entityInfo.ability || {});
  // 角色名改为仅在列表中重命名，编辑器内不再直接编辑
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [charCount, setCharCount] = useState(entityInfo.description?.length || 0);

  // 头像相关事宜
  const [copperedUrl, setCopperedUrl] = useState<string>("");
  const [roleAvatars, setRoleAvatars] = useState<roleAvatar[]>([]);
  const [avatarToDeleteIndex, setAvatarToDeleteIndex] = useState<number | null>(null);

  const MAX_DESCRIPTION_LENGTH = 140;

  // 获取规则详细
  const { data: ruleAbility } = useGetRuleDetailQuery(moduleInfo.data?.data?.ruleId as number);
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

  // 注册保存函数（保持稳定引用，避免依赖 handleSave）
  const saveRef = useRef<() => void>(() => { });
  useLayoutEffect(() => {
    saveRef.current = handleSave;
  });

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

  // 当 ruleAbility 或 ability 变化时执行一次迁移（仅当存在旧缩写且中文键缺失时）
  useEffect(() => {
    let changed = false;
    const next = { ...ability } as any;
    if (ruleAbility?.data?.basicDefault) {
      Object.entries(ruleAbility.data.basicDefault).forEach(([abbr, cn]) => {
        if (next[abbr] !== undefined) {
          if (next[cn] === undefined) {
            next[cn] = next[abbr];
          }
          delete next[abbr];
          changed = true;
        }
      });
    }
    let t: any;
    if (changed) {
      t = setTimeout(() => {
        setAbility(next);
        scheduleSave();
      }, 0);
    }
    return () => {
      if (t) {
        clearTimeout(t);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleAbility?.data?.basicDefault]);

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

  return (
    <div className={`transition-opacity duration-300 p-4 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      {/* 顶部区域 (去掉返回按钮) */}
      <div className="hidden md:flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-semibold text-2xl md:text-3xl my-2">{role.name}</h1>
            <p className="text-base-content/60">
              角色编辑 ·
              {localRole.type === 0 ? "NPC" : localRole.type === 1 ? "预设卡" : localRole.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => invokeSaveWithTinyRetry(handleSave)}
            className="btn btn-primary btn-sm md:btn-lg"
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
      <div className="max-md:hidden divider" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧 */}
        <div className="lg:col-span-1 self-start lg:sticky lg:top-4 space-y-6">
          <div className="card-sm md:card-xl bg-base-100 shadow-xs rounded-2xl md:border-2 md:border-base-content/10">
            <div className="card-body p-4">
              {/* 头像与类型选择 */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h1 className="font-semibold text-xl">{role.name}</h1>
                  <p className="text-base-content/60 text-sm">
                    角色类型 ·
                    {localRole.type === 0 ? "NPC" : localRole.type === 1 ? "预设卡" : localRole.type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    id="roleType"
                    value={localRole.type ?? ""}
                    onChange={(e) => {
                      setLocalRole(prev => ({ ...prev, type: Number(e.target.value) }));
                      scheduleSave();
                    }}
                    className="select select-sm rounded-md"
                  >
                    <option value={0}>NPC</option>
                    <option value={1}>预设卡</option>
                  </select>
                </div>
              </div>
              <div className="divider my-0" />
              <div className="flex justify-center mt-6 mb-2">
                <div className="avatar cursor-pointer group" onClick={() => setChangeAvatarConfirmOpen(true)}>
                  <div className="rounded-xl ring-primary ring-offset-base-100 w-32 h-32 ring ring-offset-2 relative">
                    <RoleAvatar
                      avatarId={localRole.avatarId || (localRole.avatarIds && localRole.avatarIds.length > 0 ? localRole.avatarIds[0] : 0)}
                      width={32}
                      isRounded={false}
                      stopPopWindow={true}
                    />
                  </div>
                </div>
              </div>
              <div className="divider font-bold text-center text-xl">{role.name}</div>
              <div>
                <textarea
                  value={localRole.description || ""}
                  onChange={(e) => {
                    setLocalRole(prev => ({ ...prev, description: e.target.value }));
                    setCharCount(e.target.value.length);
                    scheduleSave();
                  }}
                  placeholder="角色描述"
                  className="textarea textarea-sm w-full h-24 resize-none mt-2 rounded-md"
                />
                <div className="text-right mt-1">
                  <span
                    className={`text-sm font-bold ${charCount > MAX_DESCRIPTION_LENGTH ? "text-error" : "text-base-content/70"}`}
                  >
                    {charCount}
                    /
                    {MAX_DESCRIPTION_LENGTH}
                    {charCount > MAX_DESCRIPTION_LENGTH && (
                      <span className="ml-2">(已超出描述字数上限)</span>
                    )}
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-base-content/60 mt-4">
                角色ID号：
                {role.id}
              </p>
            </div>
          </div>
        </div>

        {/* 右侧 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 渲染结果预览 */}
          <div className="card-sm md:card-xl bg-base-100 shadow-xs md:rounded-2xl md:border-2 border-base-content/10">
            <div className="card-body">
              <h3 className="font-semibold mb-4">渲染结果预览</h3>
              <SpriteRenderStudio
                characterName={role.name || "未命名角色"}
                roleAvatars={roleAvatars as any}
                initialAvatarId={localRole.avatarId}
                className="w-full p-3 gap-4 flex mb-2"
              />
            </div>
          </div>
          {/* 属性与自定义能力 */}
          <InlineExpansionModule
            ability={ability}
            setAbility={setAbility}
            scheduleSave={scheduleSave}
            basicDefaults={ruleAbility?.data?.basicDefault || {}}
            abilityDefaults={ruleAbility?.data?.abilityFormula || {}}
            setShowAbilityPopup={setShowAbilityPopup}
          />
        </div>
      </div>

      {/* 头像管理弹窗与删除确认 */}
      <PopWindow isOpen={changeAvatarConfirmOpen} onClose={handleCancelChangeAvatar}>
        <div className="h-full w-full flex flex-col">
          <div className="flex flex-col md:flex-row gap-4 min-h-0 justify-center">
            <div className="w-full md:w-1/2 bg-base-200 p-3 rounded-lg order-1 md:order-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">角色头像</h2>
              </div>
              <div className=" bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                <img src={roleAvatars[0]?.avatarUrl ?? "./favicon.ico"} alt="预览" className="md:max-h-[65vh] md:min-h-[35vh] object-contain" />
              </div>
            </div>
            <div className="w-full md:w-1/2 p-3 order-2 md:order-2">
              <h2 className="text-xl font-bold mb-4">选择头像：</h2>
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
                {roleAvatars.map((item, index) => (
                  <li key={`${item.avatarId ?? index}`} className="relative w-full max-w-[128px] flex flex-col items-center rounded-lg transition-colors" onClick={() => handleAvatarClick(item.avatarUrl as string, index)}>
                    <div className="relative w-full aspect-square group cursor-pointer">
                      <img src={item.avatarUrl || "/favicon.ico"} alt="头像" className={`w-full h-full object-contain rounded-lg transition-all duration-300 group-hover:scale-105 ${item.avatarUrl === copperedUrl ? "border-2 border-primary" : "border"}`} />
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
                <li className="relative w-full max-w-[128px] aspect-square flex flex-col items-center rounded-lg transition-colors">
                  <CharacterCopper
                    setDownloadUrl={() => { }}
                    setCopperedDownloadUrl={setCopperedUrl}
                    fileName={uniqueFileName}
                    scene={4}
                    mutate={(data) => {
                      updateRoleAvatar({ ...data, id: role.id }, {
                        onSuccess: (_data) => {
                          const updatedRole = { ...localRole, avatarIds: [...(localRole.avatarIds || []), _data] };
                          setLocalRole(updatedRole);
                          updateRole({ id: role.id!, entityType: 2, entityInfo: updatedRole, name: role.name! });
                        },
                      });
                    }}
                  >
                    <button type="button" className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-gray-400 transition-transform duration-300 group-hover:scale-105" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </CharacterCopper>
                </li>
              </div>
            </div>
            <PopWindow isOpen={isDeleteModalOpen} onClose={cancelDeleteAvatar}>
              <div className="card">
                <div className="card-body items-center text-center">
                  <h2 className="card-title text-2xl font-bold">确认删除头像</h2>
                  <div className="divider"></div>
                  <p className="text-lg opacity-75 mb-8">确定要删除这个头像吗？</p>
                </div>
              </div>
              <div className="card-actions justify-center gap-6 mt-8">
                <button type="button" className="btn btn-outline" onClick={cancelDeleteAvatar}>取消</button>
                <button type="button" className="btn btn-error" onClick={confirmDeleteAvatar}>删除</button>
              </div>
            </PopWindow>
          </div>
          <div className="absolute bottom-5 right-5 md:bottom-10 md:right-10 card-actions justify-end">
            <button
              type="submit"
              onClick={() => {
                setChangeAvatarConfirmOpen(false);
                const newAvatarId = roleAvatars[0]?.avatarId;
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

      {/* 自定义能力弹窗 */}
      <PopWindow
        isOpen={showAbilityPopup}
        onClose={() => {
          setShowAbilityPopup(false);
          setAbilitySearchQuery("");
        }}
        fullScreen={false}
      >
        <div className="space-y-4">
          <h3 className="font-bold text-lg">选择能力</h3>
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
                key.toLowerCase().includes(abilitySearchQuery.toLowerCase()) || abilitySearchQuery === "",
              )
              .map(([key, value]) => {
                const checked = Object.prototype.hasOwnProperty.call(selectedAbilities, key);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`ability-${key}`}
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAbilities(prev => ({ ...prev, [key]: Number(value) }));
                        }
                        else {
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
                );
              })}
          </div>
          {(() => {
            const noAbilityMatch = abilitySearchQuery
              && Object.keys(ruleAbility?.data?.skillDefault || {})
                .filter(k => k.toLowerCase().includes(abilitySearchQuery.toLowerCase()))
                .length === 0;
            return noAbilityMatch
              ? <div className="text-center py-4 text-base-content/50">未找到匹配的能力</div>
              : null;
          })()}
          <div className="divider">或创建新能力</div>
          <div className="flex gap-2 items-center">
            <input type="text" value={newAbilityName} onChange={e => setNewAbilityName(e.target.value)} placeholder="能力名称" className="input input-bordered flex-1" />
            <input type="number" value={newAbilityValue} onChange={e => setNewAbilityValue(Number(e.target.value))} placeholder="数值" className="input input-bordered w-20" />
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
  );
}
