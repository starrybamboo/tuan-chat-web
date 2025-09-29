/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
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
  const [selectedTab, setSelectedTab] = useState<"image" | "description" | "tip">("image");
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
            <h1 className="font-semibold text-2xl md:text-3xl my-2">{location.name}</h1>
            <p className="text-base-content/60">
              {selectedTab === "image" && "场景图片"}
              {selectedTab === "description" && "场景描述"}
              {selectedTab === "tip" && "地区支线"}
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
          <button
            type="button"
            className={`btn btn-md rounded-md ${selectedTab === "tip" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setSelectedTab("tip")}
          >
            地区支线
          </button>
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
              id={VeditorIdForDescription}
              placeholder={localLocation.description || ""}
              onchange={(value) => {
                setLocalLocation(prev => ({ ...prev, description: value }));
                saveTimer.current && clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(handleSave, 8000);
              }}
            />
          </div>
        )}
        {selectedTab === "tip" && (
          <div>
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
        )}
        {/* 保存按钮已统一移至 EditModule 的全局固定按钮 */}
      </div>
    </div>
  );
}
