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
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
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
        {/* 右侧分组：下拉 + 保存按钮 */}
        <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0 ml-auto">
          <div>
            <select
              className="select select-lg select-bordered rounded-md"
              value={selectedTab}
              onChange={e => setSelectedTab(e.target.value as "image" | "description" | "tip")}
            >
              <option value="image">场景图片</option>
              <option value="description">场景描述</option>
              <option value="tip">地区隐藏信息</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              // 使用微小重试机制，处理名字变更导致的短暂未注册窗口
              invokeSaveWithTinyRetry(handleSave);
            }}
            className="btn btn-primary flex-shrink-0 self-start md:self-auto"
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              保存地点信息
            </span>
          </button>
        </div>
      </div>
      <div className="divider"></div>
      {/* 场景信息卡片 */}
      <div className={`space-y-6 bg-base-100  ${isEditing ? "ring-2 ring-primary" : ""}`}>
        {selectedTab === "image" && (
          <div className="flex items-center justify-center py-8">
            <div className="w-48">
              <ImgUploaderWithCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleAvatarChange} fileName={uniqueFileName}>
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
              </ImgUploaderWithCopper>
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
