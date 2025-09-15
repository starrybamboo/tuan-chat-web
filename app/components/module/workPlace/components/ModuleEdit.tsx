/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { ModuleInfo } from "../context/types";

import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useUpdateModuleMutation } from "api/hooks/moduleAndStageQueryHooks";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import userContent from "../../detail/readmeDemo.md?raw";
import { useModuleContext } from "../context/_moduleContext";
import Veditor from "./veditor";

// ModuleInfo 类型已在 context/types 中定义

interface ModuleEditProps {
  data: ModuleInfo;
  onChange?: (next: ModuleInfo) => void;
  onRegisterSave?: (fn: () => void) => void;
}

export default function ModuleEdit({ data, onChange, onRegisterSave }: ModuleEditProps) {
  const initial = useMemo(() => data, [data]);
  const [local, setLocal] = useState<ModuleInfo>({ ...initial });
  const { moduleId } = useModuleContext();
  const { mutate: updateModule } = useUpdateModuleMutation();

  // 防抖保存的计时器与首次渲染标记
  const saveTimer = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const getModuleId = () => {
    const mid = Number(moduleId ?? (typeof window !== "undefined" ? localStorage.getItem("currentModuleId") : null));
    return Number.isNaN(mid) ? 0 : mid;
  };

  const doUpdate = (payload: Partial<ModuleInfo>) => {
    const mid = getModuleId();
    if (!mid) {
      toast.error("无法获取 moduleId，保存已取消");
      return;
    }
    // 统一提交当前本地数据 + payload 覆盖
    const next = { ...local, ...payload };
    updateModule(
      {
        moduleId: mid,
        // 全量字段
        ruleId: next.ruleId,
        moduleName: next.moduleName,
        description: next.description,
        instruction: next.instruction,
        authorName: next.authorName,
        minTime: next.minTime,
        minPeople: next.minPeople,
        maxTime: next.maxTime,
        maxPeople: next.maxPeople,
        image: next.image,
      } as any,
      {
        onSuccess: () => {
          onChange?.(next);
        },
        onError: (e: any) => {
          const msg = (e?.response?.data?.message as string | undefined) || (e?.message as string | undefined) || "保存失败";
          toast.error(msg);
        },
      },
    );
  };

  const handleSave = () => {
    doUpdate({});
    toast.success("模组信息已保存");
  };

  // 图片上传后：立即更新本地并立刻 mutate 持久化
  const handleImageChange = (imageUrl: string) => {
    setLocal((prev) => {
      const next = { ...prev, image: imageUrl };
      return next;
    });
    doUpdate({ image: imageUrl });
    toast.success("封面已更新");
  };

  // 注册保存函数
  const saveRef = useRef<() => void>(() => { });
  useLayoutEffect(() => {
    saveRef.current = handleSave;
  });
  useLayoutEffect(() => {
    onRegisterSave?.(() => saveRef.current());
  }, [onRegisterSave]);

  // 同步外部 data 变化到本地
  useEffect(() => {
    setLocal({ ...initial });
  }, [initial]);

  const setField = <K extends keyof ModuleInfo>(key: K, value: ModuleInfo[K]) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  // 变更后 8 秒自动保存（防抖）
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      handleSave();
    }, 8000);
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
    // 监听 local 的整体变化；编辑器输入会频繁更新，但被防抖
  }, [local]);

  const uniqueFileName = `module-cover-${Date.now()}`;

  return (
    <div className="space-y-6 pb-20">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div>
              <label className="label"><span className="label-text font-bold">封面</span></label>
              <ImgUploaderWithCopper
                setDownloadUrl={() => { }}
                // 上传并裁剪完成后，立即更新并持久化
                setCopperedDownloadUrl={handleImageChange}
                fileName={uniqueFileName}
              >
                <div className="avatar cursor-pointer group w-full max-w-xs">
                  <div className="rounded-xl ring-primary ring-offset-base-100 w-full ring ring-offset-2 relative">
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center z-1" />
                    <img src={local.image || "/moduleDefaultImage.webp"} alt="module cover" className="object-cover" />
                  </div>
                </div>
              </ImgUploaderWithCopper>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="label"><span className="label-text font-bold">模组名</span></label>
                <input className="input input-bordered w-full" value={local.moduleName} onChange={e => setField("moduleName", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label"><span className="label-text font-bold">规则</span></label>
                  <input type="number" className="input input-bordered w-full" value={local.ruleId} onChange={e => setField("ruleId", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">作者名</span></label>
                  <input className="input input-bordered w-full" value={local.authorName} onChange={e => setField("authorName", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label"><span className="label-text font-bold">最少时长</span></label>
                  <input type="number" className="input input-bordered w-full" value={local.minTime} onChange={e => setField("minTime", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">最多时长</span></label>
                  <input type="number" className="input input-bordered w-full" value={local.maxTime} onChange={e => setField("maxTime", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">最少人数</span></label>
                  <input type="number" className="input input-bordered w-full" value={local.minPeople} onChange={e => setField("minPeople", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="label"><span className="label-text font-bold">最多人数</span></label>
                  <input type="number" className="input input-bordered w-full" value={local.maxPeople} onChange={e => setField("maxPeople", Number(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="label"><span className="label-text font-bold">简介</span></label>
            <textarea className="textarea textarea-bordered w-full min-h-28" value={local.description} onChange={e => setField("description", e.target.value)} />
          </div>

          <div>
            <label className="label"><span className="label-text font-bold">README</span></label>
            <Veditor id="module-instruction" placeholder={local.instruction || userContent} onchange={value => setField("instruction", value)} />
          </div>

        </div>
      </div>
    </div>
  );
}
