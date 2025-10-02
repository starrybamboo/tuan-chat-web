/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryEntitiesQuery } from "api/hooks/moduleAndStageQueryHooks";
import { useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import QuillEditor from "../../../common/quillEditor/quillEditor";
import { useModuleContext } from "../context/_moduleContext";
import { invokeSaveWithTinyRetry } from "./invokeSaveWithTinyRetry";

interface LocationEditProps {
  location: StageEntityResponse;
}

export default function LocationEdit({ location }: LocationEditProps) {
  const [selectedTab, setSelectedTab] = useState<"image" | "description">("image");
  const [isPublic, setIsPublic] = useState(true); // 控制描述是公开还是私有
  const [isPermissionExpanded, setIsPermissionExpanded] = useState(false); // 控制权限悬浮块展开/收起
  const entityInfo = useMemo(() => location.entityInfo || {}, [location.entityInfo]);
  const { stageId, updateModuleTabLabel, beginSelectionLock, endSelectionLock } = useModuleContext();

  // 当切换到 description 标签时，自动展开权限控制块
  useEffect(() => {
    if (selectedTab === "description") {
      setIsPermissionExpanded(true);
    }
  }, [selectedTab]);

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(item => item.entityType === 3);

  // 本地状态
  const [localLocation, setLocalLocation] = useState({ ...entityInfo });
  // 名称支持内联编辑（与 NPCEdit 一致）
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const localLocationRef = useRef(localLocation);
  useEffect(() => {
    localLocationRef.current = localLocation;
  }, [localLocation]);

  // 定时器
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalLocation({ ...entityInfo });
  }, [location, entityInfo]);

  // 接入接口
  const { mutate: updateLocation } = useUpdateEntityMutation(stageId as number);
  const queryClient = useQueryClient();

  // 名称编辑相关 ref + 防抖
  const nameInputRef = useRef(location.name || "");
  const nameRef = useRef(location.name);
  const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastPersistedNameRef = useRef(location.name || "");
  useLayoutEffect(() => {
    if ((location.name || "") !== nameInputRef.current) {
      nameRef.current = location.name;
      nameInputRef.current = location.name || "";
    }
  }, [location.name]);

  const optimisticUpdateEntityName = (newName: string) => {
    if (!stageId) {
      return;
    }
    queryClient.setQueryData<any>(["queryEntities", stageId], (oldData: any) => {
      if (!oldData) {
        return oldData;
      }
      const cloned = { ...oldData };
      if (Array.isArray(cloned.data)) {
        cloned.data = cloned.data.map((ent: any) => ent.id === location.id ? { ...ent, name: newName } : ent);
      }
      return cloned;
    });
  };

  // 将旧地点名在所有 scene (entityType=3) 的 entityInfo.locations 数组中同步为新名字
  const propagateNameChange = (oldName: string | undefined, newName: string | undefined) => {
    if (!stageId) {
      return;
    }
    if (!oldName || !newName || oldName === newName) {
      return;
    }
    // 乐观更新缓存中的所有 scene locations
    queryClient.setQueryData<any>(["queryEntities", stageId], (oldData: any) => {
      if (!oldData) {
        return oldData;
      }
      const cloned = { ...oldData };
      if (Array.isArray(cloned.data)) {
        cloned.data = cloned.data.map((ent: any) => {
          if (ent.entityType === 3 && Array.isArray(ent.entityInfo?.locations) && ent.entityInfo.locations.includes(oldName)) {
            const newLocations = ent.entityInfo.locations.map((loc: string | undefined) => (loc === oldName ? newName : loc));
            return { ...ent, entityInfo: { ...ent.entityInfo, locations: newLocations } };
          }
          return ent;
        });
      }
      return cloned;
    });
    // 找出需要持久化更新的 scene
    const scenesNeedUpdate = (sceneEntities || []).filter(scene => Array.isArray(scene.entityInfo?.locations) && scene.entityInfo.locations.includes(oldName));
    scenesNeedUpdate.forEach((scene) => {
      try {
        const locationsArr = Array.isArray(scene.entityInfo?.locations) ? scene.entityInfo?.locations : [];
        const newLocations = locationsArr.map((loc: string | undefined) => (loc === oldName ? newName : loc));
        updateLocation({ id: scene.id!, entityType: 3, entityInfo: { ...scene.entityInfo, locations: newLocations }, name: scene.name });
      }
      catch (e) {
        console.error("更新 scene 引用地点名失败", e);
      }
    });
  };

  const handleNameChange = (val: string) => {
    beginSelectionLock("editing-location-name", 1200);
    nameInputRef.current = val;
    updateModuleTabLabel(location.id!.toString(), val || "未命名");
    optimisticUpdateEntityName(val || "未命名");
    nameRef.current = val;
    if (nameDebounceTimer.current) {
      clearTimeout(nameDebounceTimer.current);
    }
    nameDebounceTimer.current = setTimeout(() => {
      const oldName = lastPersistedNameRef.current;
      const newName = val;
      updateLocation(
        { id: location.id!, entityType: 4, entityInfo: localLocationRef.current, name: newName },
        {
          onSuccess: () => {
            propagateNameChange(oldName, newName);
            lastPersistedNameRef.current = newName;
            endSelectionLock();
          },
        },
      );
    }, 600);
  };

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      // 先更新地点自身，成功后再同步引用与关闭标签
      updateLocation(
        { id: location.id!, entityInfo: localLocationRef.current, name: nameRef.current || location.name, entityType: 4 },
        {
          onSuccess: () => {
            toast.success("保存成功");
          },
        },
      );
    }, 300);
  };

  // 对外注册保存函数（保持稳定引用，避免 effect 依赖 handleSave）
  const saveRef = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    saveRef.current = handleSave;
  });

  const generateUniqueFileName = (name: string): string => {
    const timestamp = Date.now();
    return `sceneModule-${name}-${timestamp}`;
  };

  const uniqueFileName = generateUniqueFileName(location.name!);

  const handleAvatarChange = (avatar: string) => {
    const updatedLocation = { ...localLocation, image: avatar };
    setLocalLocation(updatedLocation);
    updateLocation({
      id: location.id!,
      entityType: 4,
      entityInfo: updatedLocation,
      name: location.name!,
    });
  };
  const vditorId = `location-tip-editor-${location.id}`;
  const VeditorIdForDescription = `location-description-editor-${location.id}`;

  return (
    <div className={`max-w-4xl mx-auto pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      <div className="flex flex-col md:flex-row items-end justify-between gap-3">
        {/* 左侧标题 */}
        <div className="flex items-center gap-4 self-start md:self-auto">
          <div>
            <div className="group relative max-w-full">
              <input
                type="text"
                aria-label="编辑地点名称"
                value={nameInputRef.current}
                onChange={e => handleNameChange(e.target.value)}
                onFocus={() => beginSelectionLock("editing-location-name", 1500)}
                onBlur={() => endSelectionLock()}
                placeholder="输入地点名称"
                title="点击编辑地点名称"
                className="font-semibold text-2xl md:text-3xl my-2 bg-transparent outline-none w-full truncate px-1 -mx-1 border-b border-dashed border-transparent focus:border-primary/70 focus:bg-primary/5 hover:border-base-content/40 hover:bg-base-200/40 rounded-sm transition-colors caret-primary"
                maxLength={50}
              />
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 group-focus-within:opacity-80 transition-opacity text-base-content/60 pr-1">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </span>
            </div>
            <p className="text-base-content/60">
              {selectedTab === "image" && "场景图片"}
              {selectedTab === "description" && "场景描述"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn btn-md rounded-md ${selectedTab === "image" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedTab("image")}
          >
            场景图片
          </button>
          <button
            type="button"
            className={`btn btn-md rounded-md ${selectedTab === "description" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedTab("description")}
          >
            场景描述
          </button>
          <div className="divider divider-horizontal mx-0"></div>
          <button
            type="button"
            onClick={() => {
              // 使用微小重试机制，处理名字变更导致的短暂未注册窗口
              invokeSaveWithTinyRetry(handleSave);
            }}
            className="btn bg-accent rounded-md flex-shrink-0 self-start md:self-auto"
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              保存
            </span>
          </button>
        </div>
      </div>
      <div className="divider"></div>

      {/* 权限控制悬浮块 - 仅在描述页面显示 */}
      {selectedTab === "description" && (
        <div className="relative mb-4">
          <div className="absolute right-0 top-0 z-10 transition-all duration-300">
            {!isPermissionExpanded
              ? (
                  <button
                    type="button"
                    onClick={() => setIsPermissionExpanded(true)}
                    className="btn btn-circle btn-sm btn-ghost hover:btn-primary"
                    title="内容权限设置"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )
              : (
                  <fieldset className="fieldset bg-transparent border-primary rounded-box w-48 border p-4 mr-4">
                    <legend className="fieldset-legend flex items-center gap-2">
                      <span>内容权限</span>
                      <button
                        type="button"
                        onClick={() => setIsPermissionExpanded(false)}
                        className="btn btn-circle btn-xs btn-ghost hover:btn-error"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </legend>
                    <label className="label cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={e => setIsPublic(e.target.checked)}
                        className="toggle toggle-primary"
                      />
                      <span className="label-text">{isPublic ? "公开可见的描述" : "仅kp可见的描述"}</span>
                    </label>
                  </fieldset>
                )}
          </div>
        </div>
      )}

      {/* 场景信息卡片 */}
      <div className={`space-y-6 bg-base-100  ${isEditing ? "ring-2 ring-primary" : ""}`}>
        {selectedTab === "image" && (
          <div className="w-full flex flex-col items-center justify-center py-4">
            <div className="text-lg text-base-content/70 text-center mb-8">
              支持上传地点图片作为封面，方便地图和场景展示。建议使用清晰、代表性的图片，支持拖拽或点击上传。
            </div>
            <div className="w-full flex flex-col items-center justify-center">
              <div className="flex justify-center w-full">
                <div className="w-full aspect-[4/3] max-w-[90vh] border-2 border-dashed border-base-content/40 rounded-xl p-4 bg-base-100 flex flex-col items-center justify-center">
                  <ImgUploaderWithCopper
                    setDownloadUrl={() => { }}
                    setCopperedDownloadUrl={handleAvatarChange}
                    fileName={uniqueFileName}
                  >
                    <div className="w-full aspect-[4/3] bg-base-300 rounded-lg border-2 border-dashed border-base-content/30 hover:border-primary hover:bg-base-200 transition-colors cursor-pointer flex flex-col items-center justify-center group">
                      {localLocation.image && (
                        <div className="relative w-full h-full">
                          <img src={localLocation.image} alt="地点封面" className="w-full min-w-[60vh] h-full object-cover rounded-lg" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center" />
                        </div>
                      )}
                      {!localLocation.image && (
                        <>
                          <svg
                            className="w-8 h-8 text-base-content/50 group-hover:text-primary mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs text-base-content/60 group-hover:text-primary text-center">
                            点击上传
                            <br />
                            地点封面
                          </span>
                        </>
                      )}
                    </div>
                  </ImgUploaderWithCopper>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedTab === "description" && (
          <div>
            <QuillEditor
              id={isPublic ? VeditorIdForDescription : vditorId}
              placeholder={isPublic ? (localLocation.description || "") : (localLocation.tip || "")}
              onchange={(value) => {
                if (isPublic) {
                  setLocalLocation(prev => ({ ...prev, description: value }));
                }
                else {
                  setLocalLocation(prev => ({ ...prev, tip: value }));
                }
                saveTimer.current && clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(handleSave, 8000);
              }}
            />
          </div>
        )}
        {/* 保存按钮已统一移至 EditModule 的全局固定按钮 */}
      </div>
    </div>
  );
}
