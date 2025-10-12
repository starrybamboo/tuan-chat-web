import type { ClueMessage } from "api/models/ClueMessage";
import { useLocationDetailQuery } from "api/hooks/moduleQueryHooks";
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
  name?: string;
  description?: string;
  image?: string;
  note?: string;
}

interface DisplayOfLocationDetailProps {
  locationId?: number;
  manualData?: ManualData;
  onSend: (clue: ClueMessage) => void;
}

function DisplayOfLocationDetail({ locationId, manualData, onSend }: DisplayOfLocationDetailProps) {
  // 如果提供了 manualData，则使用手动数据，否则通过 locationId 获取数据
  const { data, isLoading, isError } = useLocationDetailQuery(
    manualData ? -1 : (locationId ?? -1),
  );

  const useManualData = !!manualData;

  let location: StageEntityResponse | undefined;
  let entityInfo: EntityInfo | undefined;

  if (useManualData) {
    location = {
      name: manualData.name,
      entityInfo: {
        description: manualData.description,
        image: manualData.image,
        note: manualData.note,
      },
    };
    entityInfo = location.entityInfo;
  }
  else {
    location = (data ?? [])[0] as StageEntityResponse | undefined;
    entityInfo = location?.entityInfo;
  }

  if (!useManualData && isLoading) {
    return <div className="text-neutral-500 dark:text-neutral-300">加载中...</div>;
  }

  if (!useManualData && (isError || !location || !entityInfo)) {
    return <div className="text-red-500 dark:text-red-300">加载失败或未找到地点信息</div>;
  }

  if (useManualData && !manualData?.name) {
    return <div className="text-red-500 dark:text-red-300">地点信息不完整</div>;
  }

  const { name } = location!;
  const { description, image } = entityInfo!;

  const noteOrTip = useManualData ? manualData!.note : entityInfo!.tip;

  const clueMessage: ClueMessage = {
    img: image ?? "",
    name: name ?? "",
    description: description ?? "",
  };

  return (
    <div className="max-w-md w-full mx-auto mt-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="w-full h-64 bg-neutral-100 dark:bg-neutral-700 overflow-hidden min-w-64">
        {image
          ? (
              <img
                src={image}
                alt={name ?? "地点图片"}
                className="w-full h-full object-cover transition-transform duration-300 min-w-64"
              />
            )
          : (
              <div className="w-full h-full flex items-center justify-center min-w-64">
                <span className="text-neutral-400 dark:text-neutral-300 text-sm text-center px-4">
                  该地点没有图片
                </span>
              </div>
            )}
      </div>

      <div className="p-5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
          {name ?? "未命名地点"}
        </h2>
        <button
          type="button"
          className="btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={() => onSend(clueMessage)}
        >
          公布
        </button>
      </div>

      <div className="p-5 space-y-6">
        {description && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">描述</h3>
            <div className="text-neutral-700 dark:text-neutral-200 leading-relaxed">
              <MarkdownMentionViewer
                markdown={description || "无描述信息"}
                enableHoverPreview={true}
              />
            </div>
          </div>
        )}

        {noteOrTip && (
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200 mb-2 uppercase tracking-wider">
              {useManualData ? "笔记" : "提示"}
            </h3>
            <div className="text-blue-800 dark:text-blue-100 leading-relaxed">
              <MarkdownMentionViewer
                markdown={noteOrTip || (useManualData ? "无笔记" : "无提示")}
                enableHoverPreview={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayOfLocationDetail;
