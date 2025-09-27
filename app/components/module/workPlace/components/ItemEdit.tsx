/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useModuleContext } from "../context/_moduleContext";
import Veditor from "./veditor";

interface ItemEditProps {
  item: StageEntityResponse;
  onRegisterSave?: (fn: () => void) => void;
}

export default function ItemEdit({ item, onRegisterSave }: ItemEditProps) {
  const entityInfo = useMemo(() => item.entityInfo || {}, [item.entityInfo]);
  const { stageId, removeModuleTabItem } = useModuleContext();

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(item => item.entityType === 3);

  // 本地状态
  const [localItem, setLocalItem] = useState({ ...entityInfo });
  // 名称改为列表侧重命名，这里不再编辑
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const vditorId = `item-tip-editor-${item.id}`;
  const VeditorIdForDescription = `item-description-editor-${item.id}`;

  // 防抖定时器
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalItem({ ...entityInfo });
  }, [item, entityInfo]);

  // 接入接口
  const { mutate: updateItem } = useUpdateEntityMutation(stageId as number);

  // 定时器的保存
  const localItemRef = useRef(localItem);
  useEffect(() => {
    localItemRef.current = localItem;
  }, [localItem]);
  const handleSave = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsEditing(false);
      const oldName = item.name;
      const changed = false; // 不在编辑器内修改名称
      // 先更新物品自身，成功后再同步引用与关闭标签
      updateItem(
        { id: item.id!, entityType: 1, entityInfo: localItemRef.current, name: item.name },
        {
          onSuccess: () => {
            if (changed) {
              // 同步更新 scene 中引用的物品名
              const newScenes = sceneEntities?.map((scene) => {
                const newItems = scene.entityInfo?.items.map((it: string | undefined) => (it === oldName ? item.name : it));
                return { ...scene, entityInfo: { ...scene.entityInfo, items: newItems } };
              });
              newScenes?.forEach(scene => updateItem({ id: scene.id!, entityType: 3, entityInfo: scene.entityInfo, name: scene.name }));
              // 最后移除标签
              removeModuleTabItem(item.id!.toString());
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
    return `itemModule-${name}-${timestamp}`;
  };

  const uniqueFileName = generateUniqueFileName(item.name!);

  const handleImageChange = (image: string) => {
    const updatedItem = { ...localItem, image };
    setLocalItem(updatedItem);
    updateItem({
      id: item.id!,
      entityType: 1,
      entityInfo: updatedItem,
      name: item.name!,
    });
  };

  return (
    <div className={`space-y-6 pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      {/* 物品信息卡片 */}
      <div className={` bg-base-100 ${isEditing ? "ring-2 ring-primary" : ""}`}>
        <div className="flex items-start gap-8">
          {/* 图片 */}
          <ImgUploaderWithCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleImageChange} fileName={uniqueFileName}>
            <div className="avatar cursor-pointer group flex items-center justify-center w-[50%] min-w-[120px] md:w-48">
              <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                <img
                  src={localItem.image || "./favicon.ico"}
                  alt="Item Image"
                  className="object-cover transform group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </ImgUploaderWithCopper>

          {/* 右侧内容 */}
          <div className="flex-1 space-y-4 min-w-0 overflow-hidden p-2">
            <>
              {/* 物品名称改由左侧列表右键重命名，不在编辑器内显示可编辑输入框 */}
              <div className="text-lg font-bold break-words">{item.name}</div>
              <div>
                <label className="label">
                  <span className="label-text font-bold">物品描述（玩家可见）</span>
                </label>
                <Veditor
                  id={VeditorIdForDescription}
                  placeholder={localItem.description || ""}
                  onchange={(value) => {
                    setLocalItem(prev => ({ ...prev, description: value }));
                    saveTimer.current && clearTimeout(saveTimer.current);
                    saveTimer.current = setTimeout(handleSave, 8000);
                  }}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text font-bold">物品作用（仅KP可见）</span>
                </label>
                <Veditor
                  id={vditorId}
                  placeholder={localItem.tip || ""}
                  onchange={(value) => {
                    setLocalItem(prev => ({ ...prev, tip: value }));
                    saveTimer.current && clearTimeout(saveTimer.current);
                    saveTimer.current = setTimeout(handleSave, 8000);
                  }}
                />
              </div>
            </>
          </div>
        </div>
        {/* 保存按钮已统一移至 EditModule 的全局固定按钮 */}
      </div>
    </div>
  );
}
