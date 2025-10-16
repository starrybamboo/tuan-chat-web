/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { ImgUploaderWithSelector } from "@/components/common/uploader/ImgUploaderWithSelector";
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
  const entityInfo = useMemo(() => location.entityInfo || {}, [location.entityInfo]);
  const { stageId, updateModuleTabLabel, beginSelectionLock, endSelectionLock, setTabSaveFunction, currentSelectedTabId } = useModuleContext();

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(item => item.entityType === 3);

  // 本地状态
  const [localLocation, setLocalLocation] = useState({ ...entityInfo });
  // 名称可在此内联编辑（与 NPCEdit 一致）
  const [isTransitioning, setIsTransitioning] = useState(false);
  const vditorId = `location-tip-editor-${location.id}`;
  const VeditorIdForDescription = `location-description-editor-${location.id}`;

  // 防抖定时器
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalLocation({ ...entityInfo });
  }, [location, entityInfo]);

  // 接入接口
  const { mutate: updateLocation } = useUpdateEntityMutation(stageId as number);
  const queryClient = useQueryClient();

  // 名称编辑 ref 与防抖
  const nameInputRef = useRef(location.name || "");
  const nameDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const nameRef = useRef(location.name);
  // 记录最近一次已持久化名称，用于 scene 引用同步
  const lastPersistedNameRef = useRef(location.name || "");
  useLayoutEffect(() => {
    if ((location.name || "") !== nameInputRef.current) {
      nameRef.current = location.name;
      nameInputRef.current = location.name || "";
    }
  }, [location.name]);

  // 保存引用供防抖/保存使用
  const localLocationRef = useRef(localLocation);
  useEffect(() => {
    localLocationRef.current = localLocation;
  }, [localLocation]);

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
      // 先更新地点自身，成功后再同步引用与关闭标签
      updateLocation(
        { id: location.id!, entityType: 4, entityInfo: localLocationRef.current, name: nameRef.current || location.name },
        {
          onSuccess: () => {
            toast.success("地点保存成功");
          },
        },
      );
    }, 300);
  };

  const generateUniqueFileName = (name: string): string => {
    const timestamp = Date.now();
    return `locationModule-${name}-${timestamp}`;
  };

  const uniqueFileName = generateUniqueFileName(location.name!);

  const handleImageChange = (image: string) => {
    const updatedLocation = { ...localLocation, image };
    setLocalLocation(updatedLocation);
    updateLocation({
      id: location.id!,
      entityType: 4,
      entityInfo: updatedLocation,
      name: location.name!,
    });
  };

  // 保存函数注册：使用稳定包装器防止闭包陈旧 & 初始为 no-op
  const latestHandleSaveRef = useRef(handleSave);
  latestHandleSaveRef.current = handleSave; // 每次 render 更新指针
  useEffect(() => {
    const tabId = location.id?.toString();
    if (!tabId) {
      return;
    }
    if (currentSelectedTabId === tabId) {
      setTabSaveFunction(() => {
        latestHandleSaveRef.current();
      });
    }
    return () => {
      if (currentSelectedTabId === tabId) {
        setTabSaveFunction(() => {});
      }
    };
  }, [currentSelectedTabId, location.id, setTabSaveFunction]);

  return (
    <div className={`max-w-4xl mx-auto pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      <div className="flex flex-col md:flex-row items-end justify-between gap-3">
        {/* 左侧标题 */}
        <div className="flex items-center gap-4 self-start md:self-auto">
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
        </div>
        <div className="flex gap-2">
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
      <div className="divider mb-0"></div>
      <div className="space-y-6 bg-base-100 p-6 rounded-xl">
        <div>
          <div className="flex items-center justify-center py-4">
            <div className="w-48">
              <ImgUploaderWithSelector setDownloadUrl={() => { }} setCopperedDownloadUrl={handleImageChange} fileName={uniqueFileName}>
                <div className="avatar cursor-pointer group flex items-center justify-center w-full min-w-[120px] md:w-48">
                  <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                    <img
                      src={localLocation.image || "./favicon.ico"}
                      alt="Location Image"
                      className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </ImgUploaderWithSelector>
            </div>
          </div>
        </div>
        <div className="divider"></div>
        <div>
          <span className="text-base-content/60 mb-4">公开可见描述</span>
          <QuillEditor
            id={VeditorIdForDescription}
            placeholder={localLocation.description || ""}
            onchange={(value) => {
              setLocalLocation(prev => ({ ...prev, description: value }));
              saveTimer.current && clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(handleSave, 8000);
            }}
          />
        </div>
        <div>
          <span className="text-base-content/60 mb-2">仅kp可见描述</span>
          <QuillEditor
            id={vditorId}
            placeholder={localLocation.tip || ""}
            onchange={(value) => {
              setLocalLocation(prev => ({ ...prev, tip: value }));
              saveTimer.current && clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(handleSave, 8000);
            }}
          />
        </div>
      </div>
    </div>
  );
}
