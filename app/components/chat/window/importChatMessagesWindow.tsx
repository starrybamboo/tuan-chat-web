import type { UserRole } from "../../../../api";
import type { ImportedDiceTurn } from "@/components/chat/utils/importChatText";
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
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IMPORT_SPECIAL_ROLE_ID, isDicerSpeakerName, normalizeSpeakerName, parseImportedChatText } from "@/components/chat/utils/importChatText";
import { FIGURE_POSITION_LABELS, FIGURE_POSITION_ORDER } from "@/types/voiceRenderTypes";

export interface ResolvedImportChatMessage {
  lineNumber: number;
  speakerName: string;
  roleId: number;
  content: string;
  figurePosition?: Exclude<FigurePosition, undefined>;
  diceTurn?: ImportedDiceTurn;
}

interface ImportChatMessagesWindowProps {
  availableRoles: UserRole[];
  initialRawText?: string;
  onImport: (messages: ResolvedImportChatMessage[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  onClose: () => void;
  onOpenRoleAddWindow?: () => void;
  onOpenNpcAddWindow?: () => void;
  submitLabel?: (messageCount: number, isImporting: boolean) => string;
  successMessage?: string;
}

export default function ImportChatMessagesWindow({
  availableRoles,
  initialRawText,
  onImport,
  onClose,
  onOpenRoleAddWindow,
  onOpenNpcAddWindow,
  submitLabel,
  successMessage = "导入完成",
}: ImportChatMessagesWindowProps) {
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [figurePositionMap, setFigurePositionMap] = useState<Record<string, Exclude<FigurePosition, undefined> | null>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);

  const parsed = useMemo(() => parseImportedChatText(rawText), [rawText]);

  useEffect(() => {
    if (typeof initialRawText !== "string") {
      return;
    }
    setFileName(null);
    setRawText(initialRawText);
  }, [initialRawText]);

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

      if (normalized === "旁白" || normalized.toLowerCase() === "narrator") {
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
        if (normalized === "旁白" || normalized.toLowerCase() === "narrator") {
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
  }, [availableRoles, speakers]);

  const handlePickFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file)
      return;
    try {
      const text = await file.text();
      setFileName(file.name);
      setRawText(text);
      toast.success(`已读取 ${file.name}`);
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
  const hasParsedContent = parsed.messages.length > 0 || parsed.invalidLines.length > 0;
  const resolvedSpeakerCount = speakers.length - missingSpeakers.length;
  const importBlockedReason = parsed.messages.length === 0
    ? "请先粘贴文本或上传 .txt 文件"
    : missingSpeakers.length > 0
      ? `还有 ${missingSpeakers.length} 个角色未匹配`
      : "已准备好导入";

  const handleImport = async () => {
    if (!parsed.messages.length) {
      toast.error("没有可导入的有效消息");
      return;
    }
    if (missingSpeakers.length > 0) {
      toast.error("请先为所有角色名指定对应角色");
      return;
    }

    const resolved: ResolvedImportChatMessage[] = parsed.messages.map(m => ({
      lineNumber: m.lineNumber,
      speakerName: m.speakerName,
      roleId: mapping[m.speakerName] as number,
      content: m.content,
      figurePosition: figurePositionMap[m.speakerName] ?? undefined,
      diceTurn: m.diceTurn,
    }));

    setIsImporting(true);
    setProgress({ sent: 0, total: resolved.length });
    try {
      await onImport(resolved, (sent, total) => setProgress({ sent, total }));
      toast.success(successMessage);
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

  const handleQuickCreateNpc = () => {
    if (!onOpenNpcAddWindow) {
      toast.error("当前页面无法打开创建NPC入口");
      return;
    }
    onClose();
    setTimeout(() => onOpenNpcAddWindow(), 0);
  };

  const handleClear = () => {
    setFileName(null);
    setRawText("");
  };

  return (
    <div className="flex h-[min(82vh,680px)] max-h-[calc(100dvh-2rem)] min-h-0 w-[min(92vw,920px)] flex-col overflow-hidden bg-base-100 text-base-content">
      <header className="flex-none border-b border-base-300/70 bg-base-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ChatCircleText size={22} weight="duotone" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold leading-6">导入对话</h2>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm shrink-0"
            onClick={onClose}
            disabled={isImporting}
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section className="flex min-h-0 flex-col border-b border-base-300/70 bg-base-200/25 lg:border-b-0 lg:border-r">
          <div className="flex flex-none items-center justify-between gap-3 border-b border-base-300/70 bg-base-100/70 px-5 py-3">
            <h3 className="text-sm font-semibold">导入内容</h3>
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

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5">
            <div className="relative group flex-none">
              <input
                type="file"
                accept=".txt,text/plain"
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                onChange={e => handlePickFile(e.target.files)}
                disabled={isImporting}
                title="选择文本文件"
              />
              <div
                className={`flex min-h-24 items-center justify-center rounded-md border border-dashed px-4 py-4 text-center transition ${
                  fileName
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-base-300 bg-base-100 hover:border-primary/45 hover:bg-primary/5"
                }`}
              >
                {fileName
                  ? (
                      <div className="flex min-w-0 flex-col items-center gap-1.5">
                        <FileText size={26} weight="duotone" />
                        <span className="max-w-full truncate text-sm font-medium">{fileName}</span>
                        <span className="text-[11px] opacity-70">点击更换</span>
                      </div>
                    )
                  : (
                      <div className="flex flex-col items-center gap-1.5 text-base-content/55">
                        <FileText size={26} weight="light" />
                        <span className="text-sm font-medium text-base-content/70">拖入或点击选择 .txt 文件</span>
                        <span className="text-[11px]">也可以在下方粘贴文本</span>
                      </div>
                    )}
              </div>
            </div>

            <textarea
              className="h-full min-h-65 w-full flex-1 resize-none rounded-md border border-base-300 bg-base-100 px-3 py-2 font-mono text-xs leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder={"[KP]：欢迎来到这里\n<张三>：这是哪里？\n\n或\n\n木落(303451945) 2022/03/21 19:06:53\n房前有两棵树"}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              disabled={isImporting}
            />

            {hasParsedContent && (
              <div className="flex flex-none flex-wrap items-center gap-2 rounded-md border border-base-300/70 bg-base-100 px-3 py-2 text-xs">
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
                {parsed.invalidLines.length > 0 && (
                  <span className="min-w-0 text-base-content/55">
                    无法解析行号：
                    {parsed.invalidLines.slice(0, 10).map(i => i.lineNumber).join(", ")}
                    {parsed.invalidLines.length > 10 && " ..."}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-base-100">
          <div className="flex flex-none items-center justify-between gap-3 border-b border-base-300/70 px-5 py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">角色映射</h3>
              {speakers.length > 0 && (
                <p className="mt-0.5 text-xs text-base-content/50">
                  {resolvedSpeakerCount}
                  {" / "}
                  {speakers.length}
                  {" 已匹配"}
                </p>
              )}
            </div>
            {(onOpenRoleAddWindow || onOpenNpcAddWindow) && (
              <div className="flex shrink-0 items-center gap-2">
                {onOpenRoleAddWindow && (
                  <button
                    type="button"
                    className="btn btn-xs btn-outline btn-primary gap-1"
                    onClick={handleQuickCreateRole}
                    disabled={isImporting}
                  >
                    <UserPlus size={14} />
                    新建角色
                  </button>
                )}
                {onOpenNpcAddWindow && (
                  <button
                    type="button"
                    className="btn btn-xs btn-outline btn-secondary gap-1"
                    onClick={handleQuickCreateNpc}
                    disabled={isImporting}
                  >
                    <UserPlus size={14} />
                    新建NPC
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {roleOptions.length === 0 && (
              <div className="m-4 alert alert-info py-3 text-sm">
                <Info size={20} />
                <span className="text-xs">暂无可用角色，请先新建或导入</span>
              </div>
            )}

            {speakers.length === 0
              ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center text-base-content/35">
                    <User size={40} weight="duotone" />
                    <span className="text-sm font-medium text-base-content/45">等待导入文本</span>
                  </div>
                )
              : (
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                    <div className="space-y-2">
                      {speakers.map((speaker) => {
                        const value = mapping[speaker];
                        const figurePosition = figurePositionMap[speaker] ?? null;
                        const isMissing = value == null;

                        return (
                          <div
                            key={speaker}
                            className={`rounded-md border p-3 transition ${
                              isMissing
                                ? "border-error/30 bg-error/5"
                                : "border-base-300/70 bg-base-200/30 hover:bg-base-200/55"
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="max-w-60 truncate font-mono text-sm font-medium" title={speaker}>
                                {speaker}
                              </div>
                              <div className={`badge badge-sm ${isMissing ? "badge-error" : "badge-success badge-outline"}`}>
                                {isMissing ? "待匹配" : "已匹配"}
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <select
                                className={`select select-bordered select-sm w-full rounded-md ${isMissing ? "select-error" : ""}`}
                                value={value == null ? "" : String(value)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setMapping(prev => ({ ...prev, [speaker]: v ? Number(v) : null }));
                                }}
                                disabled={isImporting}
                                title="选择角色"
                              >
                                <option value="">请选择对应角色</option>
                                <option disabled className="text-xs font-bold bg-base-200 text-base-content/50">— 特殊角色 —</option>
                                <option value={String(IMPORT_SPECIAL_ROLE_ID.NARRATOR)}>旁白</option>
                                <option value={String(IMPORT_SPECIAL_ROLE_ID.DICER)}>骰娘 (系统)</option>
                                <option disabled className="text-xs font-bold bg-base-200 text-base-content/50">— 房间角色 —</option>
                                {roleOptions.map(o => (
                                  <option key={o.roleId} value={String(o.roleId)}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>

                              <div className="flex items-center gap-2">
                                <span className="shrink-0 text-[11px] text-base-content/45">立绘</span>
                                <div className="join min-w-0 flex-1">
                                  {FIGURE_POSITION_ORDER.map(pos => (
                                    <input
                                      key={pos}
                                      className="join-item btn btn-xs btn-ghost flex-1 px-1 text-[10px] font-normal aria-checked:bg-primary/20 aria-checked:text-primary"
                                      type="radio"
                                      name={`pos-${speaker}`}
                                      aria-label={FIGURE_POSITION_LABELS[pos]}
                                      checked={figurePosition === pos}
                                      onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: pos }))}
                                      disabled={isImporting || value == null || value <= 0}
                                      title={`立绘位置：${FIGURE_POSITION_LABELS[pos]}`}
                                    />
                                  ))}
                                  <input
                                    className="join-item btn btn-xs btn-ghost px-2 font-mono text-[10px] aria-checked:opacity-50"
                                    type="radio"
                                    name={`pos-${speaker}`}
                                    aria-label="无"
                                    checked={figurePosition == null}
                                    onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: null }))}
                                    disabled={isImporting || value == null || value <= 0}
                                    title="不显示立绘"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

            {speakers.length > 0 && missingSpeakers.length > 0 && (
              <div className="border-t border-error/10 bg-error/10 px-4 py-2 text-center text-xs text-error">
                还有
                {" "}
                {missingSpeakers.length}
                {" "}
                个未匹配
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="flex flex-none items-center justify-between gap-4 border-t border-base-300/70 bg-base-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          {isImporting && progress
            ? (
                <div className="flex max-w-md flex-col gap-1">
                  <div className="flex justify-between text-xs text-base-content/60">
                    <span>导入进度</span>
                    <span>
                      {progress.sent}
                      {" / "}
                      {progress.total}
                      {" · "}
                      {Math.round((progress.sent / progress.total) * 100)}
                      %
                    </span>
                  </div>
                  <progress className="progress progress-primary h-2 w-full" value={progress.sent} max={progress.total}></progress>
                </div>
              )
            : (
                <div className="truncate text-xs text-base-content/55">
                  {parsed.messages.length === 0
                    ? "请先粘贴文本或上传 .txt 文件"
                    : (
                        <>
                          <span className="font-medium text-base-content/80">{parsed.messages.length}</span>
                          {" 条消息 · "}
                          <span className="font-medium text-base-content/80">{speakers.length}</span>
                          {" 个角色"}
                          {missingSpeakers.length > 0 && (
                            <span className="ml-1 text-error/80">
                              {"· 还有 "}
                              {missingSpeakers.length}
                              {" 个未匹配"}
                            </span>
                          )}
                          {canImport && (
                            <span className="ml-1 text-success/80">· 已准备好</span>
                          )}
                        </>
                      )}
                </div>
              )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
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
            className="btn btn-primary min-w-36"
            onClick={handleImport}
            disabled={!canImport}
            title={canImport ? "开始导入" : importBlockedReason}
          >
            {isImporting ? <span className="loading loading-spinner loading-xs"></span> : null}
            {submitLabel ? submitLabel(parsed.messages.length, isImporting) : (isImporting ? "正在导入..." : `导入 ${parsed.messages.length} 条`)}
          </button>
        </div>
      </footer>
    </div>
  );
}
