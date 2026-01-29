import type { UserRole } from "../../../../api";
import type { FigurePosition } from "@/types/voiceRenderTypes";

import {
  Broom,
  ChatCircleText,
  CheckCircle,
  FileText,
  Info,
  User,
  UserPlus,
  Warning,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IMPORT_SPECIAL_ROLE_ID, isDicerSpeakerName, normalizeSpeakerName, parseImportedChatText } from "@/components/chat/utils/importChatText";

export interface ResolvedImportChatMessage {
  lineNumber: number;
  speakerName: string;
  roleId: number;
  content: string;
  figurePosition?: Exclude<FigurePosition, undefined>;
}

export interface ImportChatMessagesWindowProps {
  isKP: boolean;
  availableRoles: UserRole[];
  onImport: (messages: ResolvedImportChatMessage[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  onClose: () => void;
  onOpenRoleAddWindow?: () => void;
}

export default function ImportChatMessagesWindow({
  isKP,
  availableRoles,
  onImport,
  onClose,
  onOpenRoleAddWindow,
}: ImportChatMessagesWindowProps) {
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [figurePositionMap, setFigurePositionMap] = useState<Record<string, Exclude<FigurePosition, undefined> | null>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);

  const parsed = useMemo(() => parseImportedChatText(rawText), [rawText]);

  const speakers = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of parsed.messages) {
      const key = m.speakerName;
      if (seen.has(key))
        continue;
      seen.add(key);
      out.push(key);
    }
    return out;
  }, [parsed.messages]);

  const roleOptions = useMemo(() => {
    return availableRoles
      .map(r => ({
        roleId: r.roleId,
        label: `${r.roleName ?? `角色${r.roleId}`} (#${r.roleId})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
  }, [availableRoles]);

  useEffect(() => {
    const roleNameToRoleIds = new Map<string, number[]>();
    for (const role of availableRoles) {
      const name = normalizeSpeakerName(role.roleName ?? "");
      if (!name)
        continue;
      const list = roleNameToRoleIds.get(name) ?? [];
      list.push(role.roleId);
      roleNameToRoleIds.set(name, list);
    }

    const next: Record<string, number | null> = {};
    for (const speaker of speakers) {
      const normalized = normalizeSpeakerName(speaker);

      if (isKP && (normalized === "旁白" || normalized.toLowerCase() === "narrator")) {
        next[speaker] = IMPORT_SPECIAL_ROLE_ID.NARRATOR;
        continue;
      }

      if (isDicerSpeakerName(normalized)) {
        next[speaker] = IMPORT_SPECIAL_ROLE_ID.DICER;
        continue;
      }

      const candidates = roleNameToRoleIds.get(normalized) ?? [];
      next[speaker] = candidates.length === 1 ? candidates[0] : null;
    }
    setMapping(next);
    setFigurePositionMap((prev) => {
      const nextFigurePosition: Record<string, Exclude<FigurePosition, undefined> | null> = {};
      for (const speaker of speakers) {
        const normalized = normalizeSpeakerName(speaker);
        if (isKP && (normalized === "旁白" || normalized.toLowerCase() === "narrator")) {
          nextFigurePosition[speaker] = null;
          continue;
        }
        if (isDicerSpeakerName(normalized)) {
          nextFigurePosition[speaker] = null;
          continue;
        }
        nextFigurePosition[speaker] = prev[speaker] ?? null;
      }
      return nextFigurePosition;
    });
  }, [availableRoles, isKP, speakers]);

  const handlePickFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file)
      return;
    try {
      const text = await file.text();
      setFileName(file.name);
      setRawText(text);
      toast.success(`已读取文件: ${file.name}`);
    }
    catch (e: any) {
      console.error("读取文件失败", e);
      toast.error("读取文件失败");
    }
  };

  const missingSpeakers = useMemo(() => {
    return speakers.filter(s => mapping[s] == null);
  }, [mapping, speakers]);

  const canImport = parsed.messages.length > 0 && missingSpeakers.length === 0 && !isImporting;

  const handleImport = async () => {
    if (!parsed.messages.length) {
      toast.error("没有可导入的有效消息");
      return;
    }
    if (missingSpeakers.length > 0) {
      toast.error("请先为所有角色名指定对应角色");
      return;
    }
    if (!isKP && availableRoles.length === 0) {
      toast.error("当前房间没有可用角色，请先创建/导入角色");
      return;
    }

    const resolved: ResolvedImportChatMessage[] = parsed.messages.map(m => ({
      lineNumber: m.lineNumber,
      speakerName: m.speakerName,
      roleId: mapping[m.speakerName] as number,
      content: m.content,
      figurePosition: (figurePositionMap[m.speakerName] ?? undefined) ?? undefined,
    }));

    setIsImporting(true);
    setProgress({ sent: 0, total: resolved.length });
    try {
      await onImport(resolved, (sent, total) => setProgress({ sent, total }));
      toast.success("导入完成");
      onClose();
    }
    catch (e: any) {
      console.error("导入失败", e);
      toast.error(e?.message ? `导入失败：${e.message}` : "导入失败");
    }
    finally {
      setIsImporting(false);
    }
  };

  const handleQuickCreateRole = () => {
    if (!onOpenRoleAddWindow) {
      toast.error("当前页面无法打开创建角色入口");
      return;
    }
    onClose();
    setTimeout(() => onOpenRoleAddWindow(), 0);
  };

  const handleClear = () => {
    setFileName(null);
    setRawText("");
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="flex-none flex items-center justify-between p-4 border-b border-base-200 bg-base-100/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ChatCircleText size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              导入对话
              <span className={`badge badge-sm ${isKP ? "badge-info" : "badge-ghost"} font-normal`}>
                {isKP ? "KP模式" : "玩家模式"}
              </span>
            </h2>
            <div className="text-xs text-base-content/60 flex items-center gap-2">
              <span>
                每行一条消息，格式：
                <code className="bg-base-200 px-1 rounded">[角色名]：内容</code>
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-circle btn-sm"
          onClick={onClose}
          disabled={isImporting}
          title="关闭"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-base-200">
        {/* Left Column: Input Source */}
        <div className="flex flex-col h-full bg-base-50/50">
          <div className="p-3 border-b border-base-200 flex items-center justify-between bg-base-100">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-xs">1</span>
              粘贴文本或上传文件
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error hover:bg-error/10"
              onClick={handleClear}
              disabled={isImporting || (!rawText && !fileName)}
              title="清空内容"
            >
              <Broom size={14} />
              清空
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* File Drop / Action Area */}
            <div className="relative group">
              <input
                type="file"
                accept=".txt,text/plain"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                onChange={e => handlePickFile(e.target.files)}
                disabled={isImporting}
                title="选择文本文件"
              />
              <div className={`
                border-2 border-dashed rounded-xl p-6 text-center transition-all
                ${fileName
      ? "border-success/50 bg-success/5"
      : "border-base-300 hover:border-primary/50 hover:bg-base-200/30"}
              `}
              >
                {fileName
                  ? (
                      <div className="flex flex-col items-center gap-2 text-success">
                        <FileText size={32} weight="duotone" />
                        <span className="font-medium text-sm">{fileName}</span>
                        <span className="text-xs opacity-70">点击更换文件</span>
                      </div>
                    )
                  : (
                      <div className="flex flex-col items-center gap-2 text-base-content/50">
                        <FileText size={32} weight="light" />
                        <span className="text-sm">点击选择 .txt 文件，或拖拽文件到此处</span>
                      </div>
                    )}
              </div>
            </div>

            {/* Text Area */}
            <div className="relative flex-1 min-h-[300px] flex flex-col">
              <div className="label pt-0 pb-1">
                <span className="label-text text-xs text-base-content/60">或者直接粘贴文本内容：</span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full flex-1 font-mono text-xs leading-relaxed resize-none focus:outline-hidden focus:border-primary transition-colors h-full"
                placeholder={"[KP]：欢迎来到这里\n[张三]：这是哪里？\n[KP]：请进行侦查判定\n..."}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                disabled={isImporting}
              />
            </div>

            {/* Parsing Stats & Errors */}
            {(parsed.messages.length > 0 || parsed.invalidLines.length > 0) && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="badge badge-sm badge-ghost gap-1">
                    <CheckCircle className="text-success" size={12} weight="fill" />
                    {parsed.messages.length}
                    {" "}
                    条有效
                  </div>
                  {parsed.invalidLines.length > 0 && (
                    <div className="badge badge-sm badge-warning gap-1">
                      <Warning className="text-warning-content" size={12} weight="fill" />
                      {parsed.invalidLines.length}
                      {" "}
                      条无效
                    </div>
                  )}
                </div>

                {parsed.invalidLines.length > 0 && (
                  <div className="alert alert-warning shadow-xs py-2 text-xs flex-row items-start">
                    <WarningCircle size={16} className="mt-0.5 shrink-0" />
                    <div className="opacity-90">
                      部分行无法解析（格式不对）：
                      <div className="mt-1 font-mono text-[10px] opacity-70">
                        行号:
                        {" "}
                        {parsed.invalidLines.slice(0, 10).map(i => i.lineNumber).join(", ")}
                        {parsed.invalidLines.length > 10 && " ..."}
                      </div>
                    </div>
                  </div>

                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Mapping */}
        <div className="flex flex-col h-full bg-base-100">
          <div className="p-3 border-b border-base-200 flex items-center justify-between bg-base-100">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-xs">2</span>
              角色匹配与设置 (
              {speakers.length}
              )
            </div>
            {onOpenRoleAddWindow && (
              <button
                type="button"
                className="btn btn-xs btn-outline btn-primary gap-1"
                onClick={handleQuickCreateRole}
                disabled={isImporting}
              >
                <UserPlus size={14} />
                导入角色
              </button>
            )}
          </div>

          <div className="flex-1 overflow-hidden relative flex flex-col">
            {!isKP && roleOptions.length === 0 && (
              <div className="m-4 alert alert-info py-3 text-sm">
                <Info size={20} />
                <div>
                  <h3 className="font-bold text-xs">无可用角色</h3>
                  <div className="text-xs opacity-90">请先创建或导入角色，然后再进行映射。</div>
                </div>
              </div>
            )}

            {speakers.length === 0
              ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-base-content/30 gap-3">
                    <User size={48} weight="duotone" />
                    <span className="text-sm">等待导入文本...</span>
                  </div>
                )
              : (
                  <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                    <table className="table table-pin-rows table-sm w-full">
                      <thead>
                        <tr className="bg-base-100 z-10">
                          <th className="bg-base-200/50 w-1/3">文本中的名字</th>
                          <th className="bg-base-200/50 w-1/3">对应房间角色</th>
                          <th className="bg-base-200/50 w-1/4">显示位置</th>
                          <th className="bg-base-200/50 w-12 text-center">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {speakers.map((speaker) => {
                          const value = mapping[speaker];
                          const figurePosition = figurePositionMap[speaker] ?? null;
                          const isMissing = value == null;

                          return (
                            <tr key={speaker} className={`group hover:bg-base-50 ${isMissing ? "bg-error/5" : ""}`}>
                              <td>
                                <div className="font-mono text-sm font-medium truncate max-w-[140px] px-2 py-1 rounded bg-base-200/50 w-fit" title={speaker}>
                                  {speaker}
                                </div>
                              </td>
                              <td>
                                <select
                                  className={`select select-bordered select-xs w-full max-w-full ${isMissing ? "select-error" : ""}`}
                                  value={value == null ? "" : String(value)}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setMapping(prev => ({ ...prev, [speaker]: v ? Number(v) : null }));
                                  }}
                                  disabled={isImporting}
                                  title="选择角色"
                                >
                                  <option value="">-- 请选择 --</option>
                                  <option disabled className="text-xs font-bold bg-base-200 text-base-content/50">- 特殊角色 -</option>
                                  {isKP && <option value={String(IMPORT_SPECIAL_ROLE_ID.NARRATOR)}>📝 旁白 (KP)</option>}
                                  <option value={String(IMPORT_SPECIAL_ROLE_ID.DICER)}>🎲 骰娘 (系统)</option>
                                  <option disabled className="text-xs font-bold bg-base-200 text-base-content/50">- 房间角色 -</option>
                                  {roleOptions.map(o => (
                                    <option key={o.roleId} value={String(o.roleId)}>
                                      👤
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <div className="join w-full">
                                  <input
                                    className="join-item btn btn-xs btn-ghost px-1 flex-1 text-[10px] font-normal aria-checked:bg-primary/20 aria-checked:text-primary"
                                    type="radio"
                                    name={`pos-${speaker}`}
                                    aria-label="左"
                                    checked={figurePosition === "left"}
                                    onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: "left" }))}
                                    disabled={isImporting || value == null || value <= 0}
                                    title="立绘位置：左"
                                  />
                                  <input
                                    className="join-item btn btn-xs btn-ghost px-1 flex-1 text-[10px] font-normal aria-checked:bg-primary/20 aria-checked:text-primary"
                                    type="radio"
                                    name={`pos-${speaker}`}
                                    aria-label="中"
                                    checked={figurePosition === "center"}
                                    onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: "center" }))}
                                    disabled={isImporting || value == null || value <= 0}
                                    title="立绘位置：中"
                                  />
                                  <input
                                    className="join-item btn btn-xs btn-ghost px-1 flex-1 text-[10px] font-normal aria-checked:bg-primary/20 aria-checked:text-primary"
                                    type="radio"
                                    name={`pos-${speaker}`}
                                    aria-label="右"
                                    checked={figurePosition === "right"}
                                    onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: "right" }))}
                                    disabled={isImporting || value == null || value <= 0}
                                    title="立绘位置：右"
                                  />
                                  <input
                                    className="join-item btn btn-xs btn-ghost px-1 font-mono text-[10px] aria-checked:opacity-50"
                                    type="radio"
                                    name={`pos-${speaker}`}
                                    aria-label="✕"
                                    checked={figurePosition == null}
                                    onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: null }))}
                                    disabled={isImporting || value == null || value <= 0}
                                    title="不显示立绘"
                                  />
                                </div>
                              </td>
                              <td className="text-center">
                                {isMissing && <div className="badge badge-xs badge-error animate-pulse">!</div>}
                                {!isMissing && <div className="badge badge-xs badge-success badge-outline">ok</div>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

            {/* Mapping specific alerts or footers */}
            {speakers.length > 0 && missingSpeakers.length > 0 && (
              <div className="p-2 bg-error/10 text-error text-xs text-center border-t border-error/10">
                还有
                {" "}
                {missingSpeakers.length}
                {" "}
                个角色未指定映射
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none p-4 border-t border-base-200 bg-base-100 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-2">
          {isImporting && progress && (
            <div className="flex flex-col w-full max-w-md gap-1">
              <div className="flex justify-between text-xs text-base-content/60">
                <span>导入进度</span>
                <span>
                  {Math.round((progress.sent / progress.total) * 100)}
                  %
                </span>
              </div>
              <progress className="progress progress-primary w-full h-2" value={progress.sent} max={progress.total}></progress>
            </div>
          )}
          {!isImporting && (
            <span className="text-xs text-base-content/50">
              提示：请确认所有角色都已正确匹配后再开始导入。
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isImporting}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary px-8"
            onClick={handleImport}
            disabled={!canImport}
          >
            {isImporting ? <span className="loading loading-spinner loading-xs"></span> : null}
            {isImporting ? "正在导入..." : `开始导入 (${parsed.messages.length} 条)`}
          </button>
        </div>
      </div>
    </div>
  );
}
