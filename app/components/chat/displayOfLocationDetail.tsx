import { useLocationDetailQuery } from "api/hooks/moduleQueryHooks";

interface EntityInfo {
  description?: string;
  image?: string;
  tip?: string;
}

interface StageEntityResponse {
  id?: number;
  name?: string;
  entityInfo?: EntityInfo;
}

function DisplayOfLocationDetail({ locationId }: { locationId: number }) {
  const { data, isLoading, isError } = useLocationDetailQuery(locationId);

  const location = (data ?? [])[0] as StageEntityResponse | undefined;
  const entityInfo = location?.entityInfo;

  if (isLoading) {
    return <div className="text-neutral-500 dark:text-neutral-300">加载中...</div>;
  }

  if (isError || !location || !entityInfo) {
    return <div className="text-red-500 dark:text-red-300">加载失败或未找到地点信息</div>;
  }

  const { name } = location;
  const { description, image, tip } = entityInfo;

  return (
    <div className="max-w-md w-full mx-auto mt-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
      <div className="w-full h-64 bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
        {image
          ? (
              <img
                src={image}
                alt={name ?? "地点图片"}
                className="w-full h-full object-cover transition-transform duration-300"
              />
            )
          : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-neutral-400 dark:text-neutral-300 text-sm text-center px-4">
                  该地点没有图片
                </span>
              </div>
            )}
      </div>

      <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 text-center">
          {name ?? "未命名地点"}
        </h2>
      </div>

      <div className="p-5 space-y-6">
        {description && (
          <div>
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">描述</h3>
            <p className="text-neutral-700 dark:text-neutral-200 whitespace-pre-line leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {tip && (
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-200 mb-2 uppercase tracking-wider">提示</h3>
            <p className="text-blue-800 dark:text-blue-100 whitespace-pre-line leading-relaxed">
              {tip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayOfLocationDetail;
