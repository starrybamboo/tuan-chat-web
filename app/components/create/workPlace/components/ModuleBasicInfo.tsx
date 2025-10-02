import type { Module } from "api";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useCallback, useState } from "react";

interface ModuleBasicInfoProps {
  module?: Module;
  onModuleChange?: (module: Module) => void;
  readonly?: boolean;
}

function CoverSlot({ image }: { image?: string | null }) {
  return (
    <div className="h-full w-full bg-base-300 rounded-lg border-2 border-dashed border-base-content/30 hover:border-primary hover:bg-base-200 transition-colors cursor-pointer flex flex-col items-center justify-center group">
      {image && (
        <div className="relative w-full h-full">
          <img src={image} alt="模组封面" className="w-full h-full object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center" />
        </div>
      )}
      {!image && (
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
            模组封面
          </span>
        </>
      )}
    </div>
  );
}

const defaultModule: Module = {};

export default function ModuleBasicInfo({
  module = defaultModule,
  onModuleChange,
  readonly = false,
}: ModuleBasicInfoProps) {
  const [localModule, setLocalModule] = useState<Module>(module);
  const [isComposing, setIsComposing] = useState(false);

  const handleChange = useCallback(<K extends keyof Module>(key: K, value: Module[K]) => {
    const updatedModule = { ...localModule, [key]: value };
    setLocalModule(updatedModule);
    onModuleChange?.(updatedModule);
  }, [localModule, onModuleChange]);

  const handleStringChange = useCallback(<K extends keyof Module>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isComposing) {
        handleChange(key, e.target.value as Module[K]);
      }
    }, [handleChange, isComposing]);

  const handleNumberChange = useCallback(<K extends keyof Module>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === "" ? undefined : Number(e.target.value);
      handleChange(key, value as Module[K]);
    }, [handleChange]);

  const handleImageChange = useCallback((imageUrl: string) => {
    handleChange("image", imageUrl);
  }, [handleChange]);

  const uniqueFileName = `module_${localModule.moduleId || Date.now()}`;

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      {/* 封面区域 */}
      <div className="w-full">
        <label className="label">
          <span className="label-text font-bold">封面</span>
        </label>
        <div className="w-full h-48">
          {readonly
            ? (
                <CoverSlot image={localModule.image} />
              )
            : (
                <ImgUploaderWithCopper
                  setDownloadUrl={() => {}}
                  setCopperedDownloadUrl={handleImageChange}
                  fileName={uniqueFileName}
                >
                  <CoverSlot image={localModule.image} />
                </ImgUploaderWithCopper>
              )}
        </div>
      </div>

      {/* 基本信息 */}
      <div className="space-y-4">
        <div>
          <label className="label">
            <span className="label-text font-bold">模组名称</span>
          </label>
          <input
            className="input input-bordered w-full"
            value={localModule.moduleName || ""}
            readOnly={readonly}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={handleStringChange("moduleName")}
            placeholder="请输入模组名称"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-bold">模组作者</span>
          </label>
          <input
            className="input input-bordered w-full"
            value={localModule.authorName || ""}
            readOnly={readonly}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={handleStringChange("authorName")}
            placeholder="请输入作者名称"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-bold">简介</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full min-h-24"
            value={localModule.description || ""}
            readOnly={readonly}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onChange={handleStringChange("description")}
            placeholder="请输入模组简介"
          />
        </div>
      </div>

      {/* 时长和人数设置 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              <span className="label-text font-bold text-sm">最少时长(小时)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full input-sm"
              value={localModule.minTime || ""}
              readOnly={readonly}
              onChange={handleNumberChange("minTime")}
              placeholder="0"
              min="0"
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text font-bold text-sm">最多时长(小时)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full input-sm"
              value={localModule.maxTime || ""}
              readOnly={readonly}
              onChange={handleNumberChange("maxTime")}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">
              <span className="label-text font-bold text-sm">最少人数</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full input-sm"
              value={localModule.minPeople || ""}
              readOnly={readonly}
              onChange={handleNumberChange("minPeople")}
              placeholder="1"
              min="1"
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text font-bold text-sm">最多人数</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full input-sm"
              value={localModule.maxPeople || ""}
              readOnly={readonly}
              onChange={handleNumberChange("maxPeople")}
              placeholder="1"
              min="1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
