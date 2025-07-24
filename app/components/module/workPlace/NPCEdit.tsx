import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { CharacterCopper } from "@/components/newCharacter/CharacterCopper";
import { useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
// import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
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

  // 获取规则详细
  // const { data: ruleAbility } = useGetRuleDetailQuery(1);
  const MAX_DESCRIPTION_LENGTH = 140;

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
      updateRole({ id: role.id!, entityType: "role", entityInfo: updatedRole, name });
    }, 300);
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setLocalRole({ ...entityInfo, name: role.name! });
    setIsEditing(false);
  };

  const generateUniqueFileName = (name: string): string => {
    const timestamp = Date.now();
    return `avatarModule-${name}-${timestamp}`;
  };

  // 生成唯一文件名
  const uniqueFileName = generateUniqueFileName(role.name!);

  const handleAvatarChange = (avatar: string) => {
    const updatedRole = { ...localRole, avatar };
    setLocalRole(updatedRole);
    updateRole({
      id: role.id!,
      entityType: "role",
      entityInfo: updatedRole,
      name: role.name!,
    });
  };

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
      {/* 基础信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8">
            {/* 头像 */}
            <CharacterCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleAvatarChange} fileName={uniqueFileName} scene={4}>
              <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48">
                <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                  <img
                    src={localRole.avatar || "./favicon.ico"}
                    alt="Character Avatar"
                    className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </CharacterCopper>
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
          </div>
        </div>
      </div>

    </div>
  );
}
