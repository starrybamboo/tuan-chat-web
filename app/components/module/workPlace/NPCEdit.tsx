import type { StageEntityResponse } from "api/models/StageEntityResponse";
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

  // 干净的文本
  // const cleanText = (text: string) => {
  //   if (!text)
  //     return "";
  //   return text
  //     .replace(/\r\n/g, "\n")
  //     .replace(/ {2,}/g, " ")
  //     .replace(/\n{2,}/g, "\n")
  //     .replace(/\s+$/g, "");
  // };

  const handleSave = () => {
    setIsTransitioning(true);
    // 这里只做本地保存，不调接口
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

  // 头像变更（仅本地）
  const handleAvatarChange = (avatar: string) => {
    setLocalRole(prev => ({ ...prev, avatar }));
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
            <div>
              <img
                src={localRole.avatar || ""}
                alt="角色头像"
                className="w-24 h-24 rounded-full object-cover border"
              />
              {isEditing && (
                <input
                  type="text"
                  value={localRole.avatar || ""}
                  onChange={e => handleAvatarChange(e.target.value)}
                  placeholder="头像URL"
                  className="input input-bordered w-full mt-2"
                />
              )}
            </div>
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
        </div>
      </div>
    </div>
  );
}
