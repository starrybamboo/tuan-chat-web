import type { ClueMessage } from "api/models/ClueMessage";
import BetterImg from "@/components/common/betterImg";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useModuleItemDetailQuery, useUpdateEntityMutation } from "api/hooks/moduleQueryHooks";
import { useUpdateClueMutation } from "api/hooks/spaceClueHooks";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import MarkdownMentionViewer from "../common/quillEditor/MarkdownMentionViewer";

interface EntityInfo {
  description?: string;
  image?: string;
  tip?: string;
  note?: string;
}

interface StageEntityResponse {
  id?: number;
  name?: string;
  entityInfo?: EntityInfo;
}

interface ManualData {
  id?: number;
  name?: string;
  description?: string;
  image?: string;
  note?: string;
  clueStarsId?: number;
}

interface DisplayOfItemDetailProps {
  itemId?: number;
  manualData?: ManualData;
  onSend: (clue: ClueMessage) => void;
  onUpdate?: () => void;
  stageId?: number;
  entityType?: number;
  roomId?: number;
}

function DisplayOfItemDetail({
  itemId,
  manualData,
  onSend,
  onUpdate,
  stageId = -1,
  entityType = 1,
  roomId,
}: DisplayOfItemDetailProps) {
  // 如果提供了 manualData，则使用手动数据，否则通过 itemId 获取数据
  const { data, isLoading, isError } = useModuleItemDetailQuery(
    manualData ? -1 : (itemId ?? -1),
  );

  const useManualData = !!manualData;

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  // 使用状态来管理显示的数据，这样在保存后可以立即更新
  const [displayData, setDisplayData] = useState<{
    name: string;
    description: string;
    image: string;
    note?: string;
    tip?: string;
  }>({
    name: manualData?.name || "",
    description: manualData?.description || "",
    image: manualData?.image || "",
    note: manualData?.note || "",
    tip: "",
  });

  useEffect(() => {
    if (manualData) {
      setDisplayData({
        name: manualData.name || "",
        description: manualData.description || "",
        image: manualData.image || "",
        note: manualData.note || "",
        tip: "", // manualData 情况下不需要 tip
      });
    }
    else if (data && data.length > 0) {
      const item = data[0] as StageEntityResponse;
      setDisplayData({
        name: item.name || "",
        description: item.entityInfo?.description || "",
        image: item.entityInfo?.image || "",
        tip: item.entityInfo?.tip || "",
        note: "",
      });
    }
  }, [manualData, data]);

  // 更新线索的 mutation（用于 manualData 情况）
  const updateClueMutation = useUpdateClueMutation();
  // 更新实体的 mutation（用于非 manualData 情况）
  const updateEntityMutation = useUpdateEntityMutation(stageId, roomId ?? -1);

  let item: StageEntityResponse | undefined;
  let entityInfo: EntityInfo | undefined;

  if (useManualData) {
    item = {
      name: displayData.name,
      entityInfo: {
        description: displayData.description,
        image: displayData.image,
        note: displayData.note,
      },
    };
    entityInfo = item.entityInfo;
  }
  else {
    item = (data ?? [])[0] as StageEntityResponse | undefined;
    entityInfo = item?.entityInfo;
  }

  // 处理输入框变化
  const handleInputChange = (field: string, value: string) => {
    setDisplayData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // 保存修改
  const handleSave = async () => {
    if (useManualData) {
      // 使用线索更新接口
      if (!manualData?.id) {
        toast.error("无法更新: 缺少线索ID");
        return;
      }

      try {
        const updateRequest = {
          id: manualData.id,
          name: displayData.name,
          description: displayData.description,
          image: displayData.image,
          note: displayData.note,
          clueStarsId: manualData.clueStarsId,
        };

        await updateClueMutation.mutateAsync([updateRequest]);

        toast.success("线索更新成功");
        setIsEditing(false);
        onUpdate?.(); // 调用更新回调
      }
      catch {
        toast.error("更新线索失败");
      }
    }
    else {
      // 使用实体更新接口
      if (!item?.id) {
        toast.error("无法更新: 缺少实体ID");
        return;
      }

      try {
        const updateRequest = {
          id: item.id,
          name: displayData.name,
          entityType,
          entityInfo: {
            description: displayData.description,
            image: displayData.image,
            tip: displayData.tip,
          },
        };

        await updateEntityMutation.mutateAsync(updateRequest);

        toast.success("实体更新成功");
        setIsEditing(false);
        onUpdate?.();
      }
      catch {
        toast.error("更新实体失败");
      }
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (useManualData) {
      setDisplayData({
        name: manualData?.name || "",
        description: manualData?.description || "",
        image: manualData?.image || "",
        note: manualData?.note || "",
        tip: "",
      });
    }
    else if (data && data.length > 0) {
      const item = data[0] as StageEntityResponse;
      setDisplayData({
        name: item.name || "",
        description: item.entityInfo?.description || "",
        image: item.entityInfo?.image || "",
        tip: item.entityInfo?.tip || "",
        note: "",
      });
    }
    setIsEditing(false);
  };

  if (!useManualData && isLoading) {
    return <div className="text-neutral-500 dark:text-neutral-300">加载中...</div>;
  }

  if (!useManualData && (isError || !item || !entityInfo)) {
    return <div className="text-red-500 dark:text-red-300">加载失败或未找到物品信息</div>;
  }

  if (useManualData && !displayData.name) {
    return <div className="text-red-500 dark:text-red-300">物品信息不完整</div>;
  }

  const displayNoteOrTip = useManualData ? displayData.note : displayData.tip;

  const clueMessage: ClueMessage = {
    img: displayData.image ?? "",
    name: displayData.name ?? "",
    description: displayData.description ?? "",
  };

  const isUpdating = useManualData ? updateClueMutation.isPending : updateEntityMutation.isPending;

  return (
    <div className="max-w-md w-full mx-auto mt-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      {/* 头部区域 */}
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-700 overflow-hidden flex-shrink-0">
            {isEditing
              ? (
                  <ImgUploaderWithCopper
                    setCopperedDownloadUrl={url => handleInputChange("image", url)}
                    fileName={`${useManualData ? "clue" : "entity"}-image-${Date.now()}`}
                  >
                    <div className="relative group overflow-hidden rounded-lg w-full h-full cursor-pointer border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300">
                      {displayData.image
                        ? (
                            <>
                              <BetterImg
                                src={displayData.image}
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm">
                                <div className="text-center">
                                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">
                                    更换
                                  </span>
                                </div>
                              </div>
                            </>
                          )
                        : (
                            <div className="w-full h-full flex flex-col items-center justify-center transition-all duration-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                              <svg className="w-6 h-6 text-neutral-400 dark:text-neutral-500 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors mt-1">
                                上传
                              </span>
                            </div>
                          )}
                    </div>
                  </ImgUploaderWithCopper>
                )
              : displayData.image
                ? (
                    <BetterImg
                      src={displayData.image}
                      className="w-full h-full object-cover transition-transform duration-300 cursor-pointer"
                    />
                  )
                : (
                    <span className="text-neutral-400 dark:text-neutral-300 text-sm text-center px-2">
                      该物品没有图片
                    </span>
                  )}
          </div>
          <div className="flex-grow">
            {isEditing
              ? (
                  <input
                    type="text"
                    value={displayData.name || ""}
                    onChange={e => handleInputChange("name", e.target.value)}
                    className="w-full text-2xl font-bold text-neutral-800 dark:text-neutral-100 bg-transparent border-b border-blue-500 focus:outline-none focus:border-blue-700"
                    placeholder="请输入名称"
                  />
                )
              : (
                  <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                    {displayData.name ?? "未命名物品"}
                  </h2>
                )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex gap-2">
              {isEditing
                ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition duration-200"
                        onClick={handleSave}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "保存中..." : "保存"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition duration-200"
                        onClick={handleCancel}
                      >
                        取消
                      </button>
                    </>
                  )
                : (
                    <button
                      type="button"
                      className="btn btn-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition duration-200"
                      onClick={() => setIsEditing(true)}
                    >
                      编辑
                    </button>
                  )}
            </div>
            <button
              type="button"
              className="btn btn-sm px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition duration-200"
              onClick={() => onSend(clueMessage)}
            >
              公布
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-5 space-y-6">
        {(displayData.description || isEditing) && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">描述</h3>
            {isEditing
              ? (
                  <textarea
                    value={displayData.description || ""}
                    onChange={e => handleInputChange("description", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入描述"
                  />
                )
              : (
                  <div className="text-neutral-700 dark:text-neutral-200 leading-relaxed">
                    <MarkdownMentionViewer
                      markdown={displayData.description || "无描述信息"}
                      enableHoverPreview={true}
                    />
                  </div>
                )}
          </div>
        )}

        {(displayNoteOrTip || isEditing) && (
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200 mb-2 uppercase tracking-wider">
              {useManualData ? "笔记" : "提示"}
            </h3>
            {isEditing
              ? (
                  <textarea
                    value={displayNoteOrTip || ""}
                    onChange={e => handleInputChange(useManualData ? "note" : "tip", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700 rounded-md bg-blue-25 dark:bg-blue-800 text-blue-800 dark:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={useManualData ? "请输入笔记" : "请输入提示"}
                  />
                )
              : (
                  <div className="text-blue-800 dark:text-blue-100 leading-relaxed">
                    <MarkdownMentionViewer
                      markdown={displayNoteOrTip || (useManualData ? "无笔记" : "无提示")}
                      enableHoverPreview={true}
                    />
                  </div>
                )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayOfItemDetail;
