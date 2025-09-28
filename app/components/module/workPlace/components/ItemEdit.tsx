/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { StageEntityResponse } from "api/models/StageEntityResponse";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useQueryEntitiesQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import QuillEditor from "../../../common/quillEditor/quillEditor";
import { useModuleContext } from "../context/_moduleContext";
import { invokeSaveWithTinyRetry } from "./invokeSaveWithTinyRetry";

interface ItemEditProps {
  item: StageEntityResponse;
}

export default function ItemEdit({ item }: ItemEditProps) {
  const entityInfo = useMemo(() => item.entityInfo || {}, [item.entityInfo]);
  const { stageId, removeModuleTabItem } = useModuleContext();

  const sceneEntities = useQueryEntitiesQuery(stageId as number).data?.data?.filter(item => item.entityType === 3);

  // 本地状态
  const [localItem, setLocalItem] = useState({ ...entityInfo });
  // 名称改为列表侧重命名，这里不再编辑
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
    <div className={`max-w-4xl mx-auto pb-20 transition-opacity duration-300 ease-in-out ${isTransitioning ? "opacity-50" : ""}`}>
      <div className="flex flex-col md:flex-row items-end justify-between gap-3">
        {/* 左侧标题 */}
        <div className="flex items-center gap-4 self-start md:self-auto">
          <div>
            <h1 className="font-semibold text-2xl md:text-3xl my-2">{item.name}</h1>
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
              <ImgUploaderWithCopper setDownloadUrl={() => { }} setCopperedDownloadUrl={handleImageChange} fileName={uniqueFileName}>
                <div className="avatar cursor-pointer group flex items-center justify-center w-full min-w-[120px] md:w-48">
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
            </div>
          </div>
        </div>
        <div className="divider"></div>
        <div>
          <span className="text-base-content/60 mb-4">公开可见描述</span>
          <QuillEditor
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
          <span className="text-base-content/60 mb-2">仅kp可见描述</span>
          <QuillEditor
            id={vditorId}
            placeholder={localItem.tip || ""}
            onchange={(value) => {
              setLocalItem(prev => ({ ...prev, tip: value }));
              saveTimer.current && clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(handleSave, 8000);
            }}
          />
        </div>
      </div>
    </div>
  );
}
