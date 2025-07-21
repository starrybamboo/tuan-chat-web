import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { CharacterCopper } from "@/components/newCharacter/CharacterCopper";
import { useAddMutation, useRenameMutation } from "api/hooks/moduleQueryHooks";
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
  const [name, setName] = useState(role.name);
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [charCount, setCharCount] = useState(entityInfo.description?.length || 0);
  const MAX_DESCRIPTION_LENGTH = 140;

  useEffect(() => {
    setLocalRole({ ...entityInfo, name: role.name });
    setCharCount(entityInfo.description?.length || 0);
    setName(role.name);
  }, [role]);

  // 接入接口
  const { mutate: updateRole } = useAddMutation();
  const { mutate: renameRole } = useRenameMutation();

  // 表演属性
  // act 字段相关本地状态
  const [actFields, setActFields] = useState<{ [key: string]: string }>(localRole.act || {});
  const [newActKey, setNewActKey] = useState("");
  const [newActValue, setNewActValue] = useState("");

  // 编辑 act 字段
  const handleActFieldChange = (key: string, value: string) => {
    setActFields(prev => ({ ...prev, [key]: value }));
  };

  const handleDeleteActField = (key: string) => {
    const updated = { ...actFields };
    delete updated[key];
    setActFields(updated);
  };

  const handleAddActField = () => {
    if (newActKey.trim() && newActValue.trim()) {
      setActFields(prev => ({ ...prev, [newActKey.trim()]: newActValue }));
      setNewActKey("");
      setNewActValue("");
    }
  };

  const handleSave = () => {
    setIsTransitioning(true);
    // 保存到localRole
    setLocalRole(prev => ({ ...prev, act: actFields }));
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      updateRole({ stageId: stageId as number, entityType: "role", entityInfo: localRole, operationType: 0, name: role.name! });
      if (name !== role.name) {
        removeModuleTabItem(role.createTime! + role.name);
        renameRole({ stageId: stageId as number, entityType: "role", oldName: role.name!, newName: name! });
      }
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
      stageId: stageId as number,
      entityType: "role",
      entityInfo: updatedRole, // 使用新创建的updatedRole而不是localRole
      operationType: 0,
      name: role.name!,
    });
  };

  return (
    <div
      className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}
    >
      {/* 基础信息卡片 */}
      <div className={`card bg-base-100 shadow-xl ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="card-body">
          <div className="flex items-center gap-8">
            {/* 头像 */}
            <CharacterCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleAvatarChange} fileName={uniqueFileName}>
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
          {/* act 字段编辑区 */}
          <div className="mt-6">
            <h3 className="font-bold mb-2">角色表演属性</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(actFields).map(([key, value]) => (
                <div key={key} className="group">
                  {isEditing
                    ? (
                        <div className="flex items-center gap-1">
                          <fieldset className="fieldset relative bg-base-200 border-base-300 rounded-box w-full">
                            <legend className="fieldset-legend text-sm">{key}</legend>
                            <textarea
                              value={value}
                              onChange={e => handleActFieldChange(key, e.target.value)}
                              className="textarea w-full resize-none"
                              rows={1}
                            />
                            <button
                              type="button"
                              className="absolute -top-6 -right-3 btn btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-gray-800 hover:text-white rounded-full p-1"
                              onClick={() => handleDeleteActField(key)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path
                                  fill="currentColor"
                                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                                />
                              </svg>
                            </button>
                          </fieldset>
                        </div>
                      )
                    : (
                        <div className="card bg-base-100 shadow-sm p-2 h-full">
                          <div className="divider">{key}</div>
                          <div className="text-base-content mt-0.5 flex justify-center p-2">
                            <div className="text-left">
                              {value || <span className="text-base-content/50">未设置</span>}
                            </div>
                          </div>
                        </div>
                      )}
                </div>
              ))}
            </div>
            {/* 添加新字段 */}
            {isEditing && (
              <fieldset className="border border-base-300 rounded-lg p-4 mt-4">
                <legend className="px-2 font-bold">添加新表演属性</legend>
                <input
                  type="text"
                  placeholder="属性名称"
                  className="input input-bordered input-sm w-1/4 mt-2"
                  value={newActKey}
                  onChange={e => setNewActKey(e.target.value)}
                />
                <div className="relative w-full">
                  <textarea
                    placeholder="值"
                    className="textarea textarea-bordered textarea-sm w-full h-30 resize-none mt-4"
                    value={newActValue}
                    onChange={e => setNewActValue(e.target.value)}
                    rows={1}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-primary absolute bottom-2 right-2"
                    onClick={handleAddActField}
                    disabled={!newActKey || !newActValue}
                  >
                    添加属性
                  </button>
                </div>
              </fieldset>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
