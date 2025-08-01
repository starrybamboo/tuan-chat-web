import type { RoleAvatar as roleAvatar } from "api";
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { PopWindow } from "@/components/common/popWindow";
import RoleAvatar from "@/components/common/roleAvatar";

import { CharacterCopper } from "@/components/newCharacter/CharacterCopper";
import { useQuery } from "@tanstack/react-query";
import { useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
import { useModuleContext } from "./context/_moduleContext";

interface NPCEditProps {
  role: StageEntityResponse;
}

export default function NPCEdit({ role }: NPCEditProps) {
  // entityInfo 结构见后端定义
  const entityInfo = role.entityInfo || {};
  const { stageId, removeModuleTabItem } = useModuleContext();
  // 本地状态
  const [localRole, setLocalRole] = useState({ ...entityInfo });
  const [ability, setAbility] = useState(entityInfo.ability || {});
  const [name, setName] = useState(role.name);
  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    if (role) {
      setLocalRole({ ...entityInfo, name: role.name });
      setAbility(entityInfo.ability || {});
      setCharCount(entityInfo.description?.length || 0);
      setName(role.name);
    }
  }, [entityInfo, role]);

  // 接入接口
  const { mutate: updateRole } = useUpdateEntityMutation(stageId as number);

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const updatedRole = { ...localRole, ability };
      setIsTransitioning(false);
      setIsEditing(false);
      if (name !== role.name) {
        removeModuleTabItem(role.id!.toString());
      }
      updateRole({ id: role.id!, entityType: 2, entityInfo: updatedRole, name });
    }, 300);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setLocalRole({ ...entityInfo, name: role.name! });
    setIsEditing(false);
  };

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
    updateRole({ id: role.id!, entityType: 2, entityInfo: { ...localRole, ability: updatedAbility }, name });
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
    queryKey: ["roleAvatar", role.id],
    queryFn: async () => {
      const res = role.entityInfo!.avatarIds.map(async (avatarId: number) => {
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

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
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
                    key={`${item}`}
                    className="relative w-full max-w-[128px] flex flex-col items-center rounded-lg transition-colors"
                    onClick={() => handleAvatarClick(item.avatarUrl as string, index)}
                  >
                    {/* 头像卡片容器 */}
                    <div className="relative w-full aspect-square group cursor-pointer">
                      <img
                        src={item.avatarUrl || "/favicon.ico"}
                        alt="头像"
                        className={`w-full h-full object-contain rounded-lg transition-all duration-300 group-hover:scale-105 ${item === copperedUrl ? "border-2 border-primary" : "border"}`}
                      />
                      {/* 删除按钮  */}
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 md:w-7 md:h-7 bg-gray-700 md:bg-gray-500/50 cursor-pointer text-white rounded-full flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-gray-800 z-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAvatar(index);
                        }}
                        type="button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                          <path
                            fill="currentColor"
                            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                          />
                        </svg>
                      </button>
                      {/* 添加悬浮遮罩 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 rounded-lg"></div>
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
                  >
                    <button className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-base-200 transition-all cursor-pointer relative group">
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
              }}
              className="btn btn-primary btn-md md:btn-lg"
            >
              确认更改头像
            </button>
          </div>
        </div>

      </PopWindow>
      {/* 基础信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8" onClick={() => setChangeAvatarConfirmOpen(true)}>
            {/* 头像 */}
            <div><RoleAvatar avatarId={role.entityInfo!.avatarIds[0]} width={36} isRounded={false} stopPopWindow={true} /></div>
            {/* 右侧内容 */}
            <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
              {isEditing
                ? (
                    <>
                      <p>角色名：</p>
                      <input
                        type="text"
                        value={name || ""}
                        onChange={e => setName(e.target.value)}
                        placeholder="角色名"
                        className="input input-bordered w-full text-lg font-bold"
                      />
                      <p>简介：</p>
                      <textarea
                        value={localRole.description || ""}
                        onChange={(e) => {
                          setLocalRole(prev => ({ ...prev, description: e.target.value }));
                          setCharCount(e.target.value.length);
                        }}
                        placeholder="角色描述"
                        className="textarea textarea-bordered w-full h-24 resize-none"
                      />
                      <div className="text-right mt-1">
                        <span
                          className={`text-sm font-bold ${charCount > MAX_DESCRIPTION_LENGTH
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
                      <p>模型名：</p>
                      <input
                        type="text"
                        value={localRole.modelName || ""}
                        onChange={e => setLocalRole(prev => ({ ...prev, modelName: e.target.value }))}
                        placeholder="模型名"
                        className="input input-bordered w-full"
                      />
                      <p>类型（0=NPC, 1=预设卡）：</p>
                      <input
                        type="number"
                        value={localRole.type ?? ""}
                        onChange={e => setLocalRole(prev => ({ ...prev, type: Number(e.target.value) }))}
                        placeholder="类型"
                        className="input input-bordered w-full"
                      />
                    </>
                  )
                : (
                    <>
                      <h2 className="card-title text-2xl">{role.name || "未命名角色"}</h2>
                      <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        {localRole.description || "暂无描述"}
                      </p>
                      <p className="text-base-content/70 whitespace-pre-wrap break-words max-w-full overflow-hidden">
                        采用模型：
                        {localRole.modelName || "暂无"}
                        <br />
                        类型：
                        {localRole.type === 0 ? "NPC" : localRole.type === 1 ? "预设卡" : "未知"}
                      </p>
                    </>
                  )}
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
          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <>
                    <button
                      type="submit"
                      onClick={handleSave}
                      className={`btn btn-primary ${isTransitioning ? "scale-95" : ""}`}
                      disabled={isTransitioning}
                    >
                      {isTransitioning
                        ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          )
                        : (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                              保存
                            </span>
                          )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn btn-secondary ml-2"
                    >
                      取消
                    </button>
                  </>
                )
              : (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="btn btn-accent"
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                        <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      编辑
                    </span>
                  </button>
                )}
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
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.str ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, str: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.str ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">STR</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">敏捷</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.dex ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, dex: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.dex ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">DEX</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">意志</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.pow ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, pow: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.pow ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">POW</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">体质</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.con ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, con: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.con ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">CON</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">外貌</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.app ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, app: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.app ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">APP</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">教育</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.edu ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, edu: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.edu ?? localRole.ability?.edu ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">EDU</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">体型</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.siz ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, siz: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.siz ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">SIZ</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">智力</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.int ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, int: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.int ?? "-"}</span>
                          )}
                    </td>
                    <td className="text-center text-xs text-gray-500">INT</td>
                  </tr>
                  <tr>
                    <td className="text-center font-bold">幸运</td>
                    <td className="text-center">
                      {isEditing
                        ? (
                            <input
                              type="number"
                              className="input input-bordered input-sm w-20 text-center"
                              value={ability.luck ?? ""}
                              onChange={e => setAbility((prev: any) => ({ ...prev, luck: Number(e.target.value) }))}
                            />
                          )
                        : (
                            <span className="font-bold text-lg">{ability.luck ?? "-"}</span>
                          )}
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
                        {isEditing
                          ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={value as number}
                                  onChange={e => setAbility((prev: any) => ({
                                    ...prev,
                                    [key]: Number(e.target.value),
                                  }))}
                                  className="input input-bordered input-sm w-20"
                                />
                                <button
                                  onClick={() => {
                                    const newAbility = { ...ability };
                                    delete newAbility[key];
                                    setAbility(newAbility);
                                  }}
                                  className="btn btn-error btn-circle btn-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            )
                          : (
                              <div className="font-bold text-lg">{value as number}</div>
                            )}
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
                {Object.entries(ruleAbility?.data?.abilityDefault?.["320"] || {})
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
                && Object.keys(ruleAbility?.data?.abilityDefault?.["320"] || {})
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
                  onClick={() => {
                    setShowAbilityPopup(false);
                    setAbilitySearchQuery("");
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button
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
    </div>
  );
}
