/* eslint-disable react-hooks-extra/no-direct-set-state-in-use-effect */
import type { Module } from "api";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
// import RuleSelect from "../../common/ruleSelect";
import userContent from "@/components/module/detail/readmeDemo.md?raw";
import { useUpdateModuleMutation } from "api/hooks/moduleAndStageQueryHooks";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import QuillEditor from "../../../common/quillEditor/quillEditor";
import { useModuleContext } from "../context/_moduleContext";

interface ModuleEditProps {
  data: Module;
  onChange?: (next: Module) => void;
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

export default function ModuleEdit({ data, onChange }: ModuleEditProps) {
  const [selectedTab, setSelectedTab] = useState<"base" | "readme">("base");
  const initial = useMemo(() => data, [data]);
  const [local, setLocal] = useState<Module>({ ...initial });
  const [dirty, setDirty] = useState(false);
  const isComposing = useRef<boolean>(false);
  const readmeLockRef = useRef<boolean>(false);
  const readmeLockTimerRef = useRef<number | null>(null);
  const [readmeLocked, setReadmeLocked] = useState(false);

  const { moduleId, currentSelectedTabId, setTabSaveFunction } = useModuleContext();
  const { mutate: updateModule } = useUpdateModuleMutation();

  // 计算当前模块 ID（上下文优先，其次 localStorage）
  const currentMid = useMemo(() => {
    const raw = moduleId ?? (typeof window !== "undefined" ? window.localStorage.getItem("currentModuleId") : null);
    const num = Number(raw);
    return Number.isNaN(num) ? 0 : num;
  }, [moduleId]);

  // 每个 moduleId 的第一次展示：使用 userContent 作为 README 占位
  const [isFirstShowForModule, setIsFirstShowForModule] = useState(false);
  useEffect(() => {
    if (!currentMid) {
      setIsFirstShowForModule(false);
      return;
    }
    const key = `module_readme_first_show_${currentMid}`;
    const seen = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (!seen) {
      setIsFirstShowForModule(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, "1");
      }
    }
    else {
      setIsFirstShowForModule(false);
    }
  }, [currentMid]);

  // 防抖保存的计时器与首次渲染标记
  const saveTimer = useRef<number | null>(null);

  const getModuleId = useCallback(() => {
    const mid = Number(moduleId ?? (typeof window !== "undefined" ? localStorage.getItem("currentModuleId") : null));
    return Number.isNaN(mid) ? 0 : mid;
  }, [moduleId]);

  const doUpdate = useCallback((
    payload: Partial<Module>,
    handlers?: { onSuccess?: () => void; onError?: (e: any) => void },
  ) => {
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
        readMe: next.readMe,
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
          handlers?.onSuccess?.();
        },
        onError: (e: any) => {
          const msg = (e?.response?.data?.message as string | undefined) || (e?.message as string | undefined) || "保存失败";
          toast.error(msg);
          handlers?.onError?.(e);
        },
      },
    );
  }, [getModuleId, local, onChange, updateModule]);

  const handleSave = () => {
    if (!dirty) {
      return;
    }
    doUpdate({}, {
      onSuccess: () => {
        setDirty(false);
        toast.success("模组信息已保存");
      },
    });
  };

  // 图片上传后：立即更新本地并立刻 mutate 持久化
  const handleImageChange = (imageUrl: string) => {
    setLocal((prev: any) => {
      const next = { ...prev, image: imageUrl };
      return next;
    });
    // 直接持久化图片更新，不影响脏标记，避免二次自动保存
    doUpdate({ image: imageUrl }, { onSuccess: () => toast.success("封面已更新") });
  };

  // 浅比较，避免不必要的本地重置
  const shallowEqual = (a: Module, b: Module) => (
    a.ruleId === b.ruleId
    && a.moduleName === b.moduleName
    && a.description === b.description
    && a.readMe === b.readMe
    && a.authorName === b.authorName
    && a.minTime === b.minTime
    && a.minPeople === b.minPeople
    && a.maxTime === b.maxTime
    && a.maxPeople === b.maxPeople
    && a.image === b.image
  );

  // 同步外部 data 变化到本地（仅当未编辑且不在输入法合成中）
  useEffect(() => {
    if (dirty || isComposing.current) {
      return;
    }
    if (readmeLocked) {
      const merged = { ...initial, readMe: local.readMe };
      if (!shallowEqual(local, merged)) {
        setLocal(merged);
      }
    }
    else {
      if (shallowEqual(local, initial)) {
        return;
      }
      setLocal({ ...initial });
    }
    setDirty(false);
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [initial, dirty, local, readmeLocked]);

  // 移除未使用的 setField，避免 lint 报错

  // 变更后 8 秒自动保存（防抖）
  useEffect(() => {
    // 任何改动，先重置已有的计时器（即使当前不满足保存条件，也确保不会触发早先的计时器）
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    // 仅在存在用户改动且不在输入法合成或 readme 锁定期间，才开启新的计时器
    if (dirty && !isComposing.current && !readmeLocked) {
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null;
        // 直接在这里执行保存，避免对 handleSave 的依赖
        doUpdate({}, {
          onSuccess: () => {
            setDirty(false);
            toast.success("模组信息已保存");
          },
        });
      }, 8000);
    }
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
    // 监听 local 与 dirty；编辑器输入会频繁更新，但被防抖
  }, [local, dirty, doUpdate, readmeLocked]);

  // 统一的输入处理器，避免内联多语句
  const handleStringInput = <K extends keyof Module>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setDirty(true);
    const value = e.target.value as Module[K];
    setLocal((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleNumberInput = <K extends keyof Module>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDirty(true);
    const value = (Number(e.target.value) || 0) as Module[K];
    setLocal((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleReadMeChange = (value: string) => {
    setDirty(true);
    setLocal((prev: any) => ({ ...prev, readMe: value }));
    // README 编辑加锁，短时间内阻止外部同步与自动保存覆盖
    readmeLockRef.current = true;
    setReadmeLocked(true);
    if (readmeLockTimerRef.current) {
      window.clearTimeout(readmeLockTimerRef.current);
      readmeLockTimerRef.current = null;
    }
    readmeLockTimerRef.current = window.setTimeout(() => {
      readmeLockRef.current = false;
      setReadmeLocked(false);
      readmeLockTimerRef.current = null;
    }, 3000);
  };

  const uniqueFileName = `module-cover-${Date.now()}`;

  // 计算 README 占位：首次展示用 userContent，否则用接口的 readMe；均做安全降级
  const readmePlaceholder = useMemo(() => {
    if (isFirstShowForModule) {
      return userContent || "";
    }
    return (initial?.readMe ?? userContent ?? "");
  }, [isFirstShowForModule, initial]);

  // 保存函数注册：使用稳定包装器防止闭包陈旧 & 初始为 no-op
  const latestHandleSaveRef = useRef(handleSave);
  latestHandleSaveRef.current = handleSave; // 每次 render 更新指针
  useEffect(() => {
    const tabId = "当前模组";
    if (!tabId) {
      return;
    }
    if (currentSelectedTabId === tabId) {
      setTabSaveFunction(() => {
        latestHandleSaveRef.current();
      });
    }
    return () => {
      if (currentSelectedTabId === tabId) {
        setTabSaveFunction(() => { });
      }
    };
  }, [currentMid, currentSelectedTabId, setTabSaveFunction]);

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="font-semibold text-2xl break-words">模组编辑</h1>
            <p className="text-base-content/60 mt-1">
              {selectedTab === "base" && "模组基本信息"}
              {selectedTab === "readme" && "README"}
            </p>
          </div>
        </div>
        {/* 右侧分组：下拉 + 按钮（与 SceneEdit 保持一致布局） */}
        <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-0 ml-auto">
          <div>
            <select
              className="select select-lg select-bordered rounded-md"
              value={selectedTab}
              onChange={e => setSelectedTab(e.target.value as "base" | "readme")}
            >
              <option value="base">模组基本信息</option>
              <option value="readme">README</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-accent rounded-md flex-shrink-0 self-start md:self-auto"
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
      {selectedTab === "base" && (
        <div className="w-full h-full flex flex-col gap-4 space-y-6">
          {/* 左侧规则选择面板 */}
          {/* <div className="basis-1/3">
            <RuleSelect
              className="w-full h-[520px]"
              ruleId={local.ruleId}
              editable={false}
              onRuleSelect={() => {}}
            />
          </div> */}

          {/* 左侧封面 */}
          <div className="w-full flex flex-col items-center justify-center py-4">
            <div className="w-1/3 max-w-full flex flex-col items-center justify-center">
              <ImgUploaderWithCopper
                setDownloadUrl={() => { }}
                setCopperedDownloadUrl={handleImageChange}
                fileName={uniqueFileName}
              >
                <CoverSlot image={local.image} />
              </ImgUploaderWithCopper>
            </div>
          </div>

          <div className="divider"></div>

          {/* 右侧表单区 */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label"><span className="label-text font-bold mb-2">模组作者</span></label>
                <input
                  className="input input-bordered w-full rounded-md"
                  value={local.authorName}
                  onCompositionStart={() => { isComposing.current = true; }}
                  onCompositionEnd={() => {
                    isComposing.current = false;
                    setDirty(true);
                  }}
                  onChange={handleStringInput("authorName")}
                />
              </div>
              <div>
                <label className="label"><span className="label-text font-bold mb-2">模组名称</span></label>
                <input
                  className="input input-bordered w-full rounded-md"
                  value={local.moduleName}
                  onCompositionStart={() => { isComposing.current = true; }}
                  onCompositionEnd={() => {
                    isComposing.current = false;
                    setDirty(true);
                  }}
                  onChange={handleStringInput("moduleName")}
                />
              </div>
            </div>

            <div>
              <label className="label"><span className="label-text font-bold mb-2">简介</span></label>
              <textarea
                className="textarea textarea-bordered w-full min-h-28 rounded-md"
                value={local.description}
                onCompositionStart={() => { isComposing.current = true; }}
                onCompositionEnd={() => {
                  isComposing.current = false;
                  setDirty(true);
                }}
                onChange={handleStringInput("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label"><span className="label-text font-bold mb-2">最少时长</span></label>
                <input type="number" className="input input-bordered w-full rounded-md" value={local.minTime} onChange={handleNumberInput("minTime")} />
              </div>
              <div>
                <label className="label"><span className="label-text font-bold mb-2">最多时长</span></label>
                <input type="number" className="input input-bordered w-full rounded-md" value={local.maxTime} onChange={handleNumberInput("maxTime")} />
              </div>
              <div>
                <label className="label"><span className="label-text font-bold mb-2">最少人数</span></label>
                <input type="number" className="input input-bordered w-full rounded-md" value={local.minPeople} onChange={handleNumberInput("minPeople")} />
              </div>
              <div>
                <label className="label"><span className="label-text font-bold mb-2">最多人数</span></label>
                <input type="number" className="input input-bordered w-full rounded-md" value={local.maxPeople} onChange={handleNumberInput("maxPeople")} />
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedTab === "readme" && (
        <div className="w-full h-full">
          <QuillEditor
            key={currentMid || "module-editor"}
            id={`module-instruction-${currentMid || "default"}`}
            placeholder={readmePlaceholder}
            onchange={handleReadMeChange}
          />
        </div>
      )}
    </div>
  );
}
