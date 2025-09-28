/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useQueryEntitiesQuery } from "api/hooks/moduleAndStageQueryHooks";
import { useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useModuleContext } from "../context/_moduleContext";
import Veditor from "./veditor";

interface LocationEditProps {
  location: StageEntityResponse;
  onRegisterSave?: (fn: () => void) => void;
}

export default function LocationEdit({ location, onRegisterSave }: LocationEditProps) {
  const entityInfo = useMemo(() => location.entityInfo || {}, [location.entityInfo]);
  const { stageId, removeModuleTabItem } = useModuleContext();

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(item => item.entityType === 3);

  // 本地状态
  const [localLocation, setLocalLocation] = useState({ ...entityInfo });
  // 名称改为列表侧重命名，这里不再编辑
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 定时器
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalLocation({ ...entityInfo });
  }, [location, entityInfo]);

  // 接入接口
  const { mutate: updateLocation } = useUpdateEntityMutation(stageId as number);
  // const { mutate: renameLocation } = useRenameMutation("scene");

  const localLocationRef = useRef(localLocation);
  useEffect(() => {
    localLocationRef.current = localLocation;
  }, [localLocation]);

  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      const oldName = location.name;
      const changed = false; // 不在编辑器内修改名称
      // 先更新地点自身，成功后再同步引用与关闭标签
      updateLocation(
        { id: location.id!, entityInfo: localLocationRef.current, name: location.name, entityType: 4 },
        {
          onSuccess: () => {
            if (changed) {
              // 同步更新 scene 中引用的地点名
              const newScenes = sceneEntities?.map((scene) => {
                const newLocations = scene.entityInfo?.locations.map((loc: string | undefined) => (loc === oldName ? location.name : loc));
                return { ...scene, entityInfo: { ...scene.entityInfo, locations: newLocations } };
              });
              newScenes?.forEach(scene => updateLocation({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
              // 最后移除标签
              removeModuleTabItem(location.id!.toString());
            }
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
  useLayoutEffect(() => {
    onRegisterSave?.(() => saveRef.current());
  }, [onRegisterSave]);

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
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center">
          <h1 className="font-semibold text-2xl break-words ml-2">{location.name}</h1>
        </div>
      </div>
      <div className="divider"></div>
      {/* 场景信息卡片 */}
      <div className={`space-y-6 bg-base-100  ${isEditing ? "ring-2 ring-primary" : ""}`}>

        <div className="flex items-start gap-8">

          {/* 右侧内容 */}
          <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
            <>
              {/* 地点名称改由左侧列表右键重命名，不在编辑器内显示可编辑输入框 */}
              <div className="w-48">
                {/* 头像 */}
                <ImgUploaderWithCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleAvatarChange} fileName={uniqueFileName}>
                  <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48">
                    <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                      <img
                        src={localLocation.image || "./favicon.ico"}
                        alt="Location Image"
                        className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                </ImgUploaderWithCopper>
              </div>
              <p>场景描述：</p>
              <Veditor
                id={VeditorIdForDescription}
                placeholder={localLocation.description || ""}
                onchange={(value) => {
                  setLocalLocation(prev => ({ ...prev, description: value }));
                  saveTimer.current && clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(handleSave, 8000);
                }}
              />
              <p>地区支线：</p>
              <Veditor
                id={vditorId}
                placeholder={localLocation.tip || ""}
                onchange={(value) => {
                  setLocalLocation(prev => ({ ...prev, tip: value }));
                  saveTimer.current && clearTimeout(saveTimer.current);
                  saveTimer.current = setTimeout(handleSave, 8000);
                }}
              />
            </>
          </div>
        </div>
        {/* 保存按钮已统一移至 EditModule 的全局固定按钮 */}
      </div>
    </div>
  );
}
