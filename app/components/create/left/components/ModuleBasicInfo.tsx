import type { Module } from "api";
import { useModuleDetailByIdQuery } from "api/hooks/moduleQueryHooks";

interface ModuleBasicInfoProps {
  moduleId: number;
}

function ModuleBasicInfo({ moduleId }: ModuleBasicInfoProps) {
  const { data: moduleData, isLoading, error } = useModuleDetailByIdQuery(moduleId);
  console.warn("moduleData:", moduleData);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (error || !moduleData?.data) {
    return (
      <div className="p-4">
        <p className="text-red-500">加载模组信息失败</p>
      </div>
    );
  }

  const module: Module = moduleData.data;

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">模组基本信息</h3>

      {/* 模组封面 */}
      {module.image && (
        <div className="mb-4">
          <img
            src={module.image}
            alt={module.moduleName || "模组封面"}
            className="w-full object-cover rounded-lg"
          />
        </div>
      )}

      {/* 基本信息 */}
      <div className="space-y-3">
        {/* 模组名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            模组名称
          </label>
          <p className="text-base text-gray-900">
            {module.moduleName || "未命名模组"}
          </p>
        </div>

        {/* 作者 */}
        {module.authorName && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作者
            </label>
            <p className="text-base text-gray-900">{module.authorName}</p>
          </div>
        )}

        {/* 简介 */}
        {module.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              简介
            </label>
            <p className="text-base text-gray-900 leading-relaxed">
              {module.description}
            </p>
          </div>
        )}

        {/* 时长 */}
        {(module.minTime || module.maxTime) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              预计时长
            </label>
            <p className="text-base text-gray-900">
              {module.minTime && module.maxTime
                ? `${module.minTime} - ${module.maxTime} 小时`
                : module.minTime
                  ? `约 ${module.minTime} 小时`
                  : `约 ${module.maxTime} 小时`}
            </p>
          </div>
        )}

        {/* 人数 */}
        {(module.minPeople || module.maxPeople) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              建议人数
            </label>
            <p className="text-base text-gray-900">
              {module.minPeople && module.maxPeople
                ? `${module.minPeople} - ${module.maxPeople} 人`
                : module.minPeople
                  ? `${module.minPeople}+ 人`
                  : `最多 ${module.maxPeople} 人`}
            </p>
          </div>
        )}

        {/* 规则ID */}
        {module.ruleId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              规则ID
            </label>
            <p className="text-base text-gray-900">{module.ruleId}</p>
          </div>
        )}

        {/* 创建时间 */}
        {module.createTime && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              创建时间
            </label>
            <p className="text-base text-gray-900">
              {new Date(module.createTime).toLocaleString()}
            </p>
          </div>
        )}

        {/* 更新时间 */}
        {module.updateTime && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最后更新
            </label>
            <p className="text-base text-gray-900">
              {new Date(module.updateTime).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* README 内容 */}
      {module.readMe && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            详细说明
          </label>
          <div className="bg-gray-50 p-3 rounded-lg">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
              {module.readMe}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModuleBasicInfo;
