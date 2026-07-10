import {
  Broom,
  CheckCircle,
  FileText,
  ImageSquare,
  Info,
  Table,
  User,
  UserPlus,
  Warning,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";
import type { RglImportResolverSources } from "@/components/chat/utils/importRglResolvers";
import type { FigurePosition } from "@/types/voiceRenderTypes";

import { IMPORT_SPECIAL_ROLE_ID, isDicerSpeakerName, normalizeSpeakerName, parseImportedChatText } from "@/components/chat/utils/importChatText";
import { createRglImportCompileContextFromSources } from "@/components/chat/utils/importRglResolvers";
import { compileRglImportEventsWithLineNumbers, parseRglImportText, summarizeRglImportEvents } from "@/components/chat/utils/importRglText";
import { RoomChatIcon } from "@/icons";
import { FIGURE_POSITION_LABELS, FIGURE_POSITION_ORDER } from "@/types/voiceRenderTypes";

import type { UserRole } from "../../../../api";
import type { ImportChatWindowMode } from "./importChatMessagesWindowState";

import { getImportChatWindowReadiness } from "./importChatMessagesWindowState";

export type RglImportSourcesLoader = () => Promise<Omit<RglImportResolverSources, "roles">>;
export type RglRoleAssetsImportResult = {
  create: number;
  roleCreate: number;
  update: number;
};
export type RglMaterialAssetsImportResult = {
  action: "create" | "update";
  materialCount: number;
  name: string;
  spacePackageId?: number;
};
export type RglLocalAssetsImportResult = {
  material?: RglMaterialAssetsImportResult;
  role?: RglRoleAssetsImportResult;
};
export type RglLocalAssetsImporter = (files: FileList) => Promise<RglLocalAssetsImportResult>;
export type RglMaterialAssetsImporter = (file: File) => Promise<RglMaterialAssetsImportResult>;
export type RglRoleAssetsImporter = (file: File) => Promise<RglRoleAssetsImportResult>;

export type ResolvedImportChatMessage = ImportChatRequestMessage & {
  lineNumber: number;
  speakerName?: string;
}

const RGL_EVENT_SUMMARY_ITEMS = [
  { key: "dialog", label: "对白" },
  { key: "narration", label: "旁白" },
  { key: "material", label: "素材" },
  { key: "dice", label: "骰子" },
  { key: "hitpoint", label: "状态" },
  { key: "control", label: "控制" },
] as const;
const RGL_LOCAL_ASSET_DIRECTORY_INPUT_PROPS = {
  directory: "",
  webkitdirectory: "",
} as Record<string, string>;

type ImportChatMessagesWindowProps = {
  availableRoles: UserRole[];
  initialRawText?: string;
  loadRglImportSources?: RglImportSourcesLoader;
  onImportRglLocalAssets?: RglLocalAssetsImporter;
  onImportRglMaterialAssets?: RglMaterialAssetsImporter;
  onImportRglRoleAssets?: RglRoleAssetsImporter;
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
  loadRglImportSources,
  onImportRglLocalAssets,
  onImportRglMaterialAssets,
  onImportRglRoleAssets,
  onImport,
  onClose,
  onOpenRoleAddWindow,
  onOpenNpcAddWindow,
  submitLabel,
  successMessage = "导入完成",
}: ImportChatMessagesWindowProps) {
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportChatWindowMode>("plain");
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [figurePositionMap, setFigurePositionMap] = useState<Record<string, Exclude<FigurePosition, undefined> | null>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingRglLocalAssets, setIsImportingRglLocalAssets] = useState(false);
  const [isImportingRglMaterialAssets, setIsImportingRglMaterialAssets] = useState(false);
  const [isImportingRglRoleAssets, setIsImportingRglRoleAssets] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const rglLocalAssetsInputRef = useRef<HTMLInputElement | null>(null);
  const rglMaterialAssetsInputRef = useRef<HTMLInputElement | null>(null);
  const rglRoleAssetsInputRef = useRef<HTMLInputElement | null>(null);

  const plainParsed = useMemo(() => parseImportedChatText(rawText), [rawText]);
  const rglParsed = useMemo(() => parseRglImportText(rawText), [rawText]);
  const rglEventSummary = useMemo(() => summarizeRglImportEvents(rglParsed.events), [rglParsed.events]);
  const supportsRglImport = typeof loadRglImportSources === "function";
  const isImportingRglAssets = isImportingRglLocalAssets || isImportingRglMaterialAssets || isImportingRglRoleAssets;
  const isImportBusy = isImporting || isImportingRglAssets;

  useEffect(() => {
    if (typeof initialRawText !== "string") {
      return;
    }
    setFileName(null);
    setRawText(initialRawText);
  }, [initialRawText]);

  const activeMessageCount = importMode === "rgl" ? rglParsed.events.length : plainParsed.messages.length;
  const activeInvalidLines = importMode === "rgl" ? rglParsed.invalidLines : plainParsed.invalidLines;

  const speakers = useMemo(() => {
    if (importMode === "rgl") {
      return [];
    }
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of plainParsed.messages) {
      const key = m.speakerName;
      if (seen.has(key))
        continue;
      seen.add(key);
      out.push(key);
    }
    return out;
  }, [importMode, plainParsed.messages]);

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
    if (isImportBusy) {
      return;
    }
    const file = files?.[0];
    if (!file)
      return;
    try {
      const text = await file.text();
      setFileName(file.name);
      setRawText(text);
      appToast.success(`已读取 ${file.name}`);
    }
    catch (e: any) {
      console.error("读取文件失败", e);
      appToast.error("读取文件失败");
    }
  };

  const handlePickRglRoleAssets = () => {
    if (isImportBusy || !onImportRglRoleAssets) {
      return;
    }
    rglRoleAssetsInputRef.current?.click();
  };

  const handlePickRglLocalAssets = () => {
    if (isImportBusy || !onImportRglLocalAssets) {
      return;
    }
    rglLocalAssetsInputRef.current?.click();
  };

  const handlePickRglMaterialAssets = () => {
    if (isImportBusy || !onImportRglMaterialAssets) {
      return;
    }
    rglMaterialAssetsInputRef.current?.click();
  };

  const handleImportRglLocalAssetsFile = async (files: FileList | null) => {
    if (isImportBusy || !files?.length || !onImportRglLocalAssets) {
      return;
    }

    setIsImportingRglLocalAssets(true);
    try {
      const result = await onImportRglLocalAssets(files);
      const details: string[] = [];
      if (result.material) {
        details.push(`${result.material.action === "update" ? "重写" : "创建"}通用素材包 ${result.material.name}（${result.material.materialCount} 个素材）`);
      }
      if (result.role) {
        details.push(`角色新建 ${result.role.roleCreate}，角色素材新建 ${result.role.create}，更新 ${result.role.update}`);
      }
      appToast.success(details.length > 0 ? `本地素材已导入：${details.join("；")}` : "本地素材已导入");
    }
    catch (e: any) {
      console.error("导入 RGL 本地素材失败", e);
      appToast.error(e?.message ? `导入本地素材失败：${e.message}` : "导入本地素材失败");
    }
    finally {
      setIsImportingRglLocalAssets(false);
      if (rglLocalAssetsInputRef.current) {
        rglLocalAssetsInputRef.current.value = "";
      }
    }
  };

  const handleImportRglMaterialAssetsFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (isImportBusy || !file || !onImportRglMaterialAssets) {
      return;
    }

    setIsImportingRglMaterialAssets(true);
    try {
      const result = await onImportRglMaterialAssets(file);
      appToast.success(`${result.action === "update" ? "已重写" : "已创建"}通用素材包：${result.name}（${result.materialCount} 个素材）`);
    }
    catch (e: any) {
      console.error("导入 RGL 通用素材失败", e);
      appToast.error(e?.message ? `导入通用素材失败：${e.message}` : "导入通用素材失败");
    }
    finally {
      setIsImportingRglMaterialAssets(false);
      if (rglMaterialAssetsInputRef.current) {
        rglMaterialAssetsInputRef.current.value = "";
      }
    }
  };

  const handleImportRglRoleAssetsFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (isImportBusy || !file || !onImportRglRoleAssets) {
      return;
    }

    setIsImportingRglRoleAssets(true);
    try {
      const result = await onImportRglRoleAssets(file);
      appToast.success(`角色素材已导入：角色新建 ${result.roleCreate}，差分新建 ${result.create}，更新 ${result.update}`);
    }
    catch (e: any) {
      console.error("导入 RGL 角色素材失败", e);
      appToast.error(e?.message ? `导入角色素材失败：${e.message}` : "导入角色素材失败");
    }
    finally {
      setIsImportingRglRoleAssets(false);
      if (rglRoleAssetsInputRef.current) {
        rglRoleAssetsInputRef.current.value = "";
      }
    }
  };

  const missingSpeakers = useMemo(() => {
    return speakers.filter(s => mapping[s] == null);
  }, [mapping, speakers]);

  const hasRglParseError = importMode === "rgl" && activeInvalidLines.length > 0;
  const hasParsedContent = activeMessageCount > 0 || activeInvalidLines.length > 0;
  const resolvedSpeakerCount = speakers.length - missingSpeakers.length;
  const importReadiness = getImportChatWindowReadiness({
    activeMessageCount,
    hasRglParseError,
    importMode,
    isImporting,
    isImportingRglAssets,
    missingSpeakerCount: missingSpeakers.length,
    supportsRglImport,
  });
  const canImport = importReadiness.canImport;
  const importBlockedReason = importReadiness.blockedReason;

  const handleImport = async () => {
    if (isImportBusy) {
      appToast.error(isImportingRglAssets ? "素材导入中，请等待完成" : "正在导入消息");
      return;
    }
    if (activeMessageCount === 0) {
      appToast.error("没有可导入的有效消息");
      return;
    }
    if (importMode === "plain" && missingSpeakers.length > 0) {
      appToast.error("请先为所有角色名指定对应角色");
      return;
    }
    if (importMode === "rgl" && activeInvalidLines.length > 0) {
      const firstInvalid = rglParsed.invalidLines[0];
      appToast.error(firstInvalid ? `第 ${firstInvalid.lineNumber} 行：${firstInvalid.reason}` : "请先修正 RGL 解析错误");
      return;
    }
    if (importMode === "rgl" && !loadRglImportSources) {
      appToast.error("当前入口暂不支持 RGL 素材解析");
      return;
    }

    setIsImporting(true);
    setProgress({ sent: 0, total: activeMessageCount });
    try {
      let resolved: ResolvedImportChatMessage[];
      if (importMode === "rgl") {
        const sources = await loadRglImportSources!();
        const context = createRglImportCompileContextFromSources({
          roles: availableRoles,
          ...sources,
        });
        resolved = compileRglImportEventsWithLineNumbers(rglParsed.events, context);
      }
      else {
        resolved = plainParsed.messages.map(m => ({
          lineNumber: m.lineNumber,
          speakerName: m.speakerName,
          roleId: mapping[m.speakerName] as number,
          content: m.content,
          figurePosition: figurePositionMap[m.speakerName] ?? undefined,
          diceTurn: m.diceTurn,
        }));
      }

      await onImport(resolved, (sent, total) => setProgress({ sent, total }));
      appToast.success(successMessage);
      onClose();
    }
    catch (e: any) {
      console.error("导入失败", e);
      appToast.error(e?.message ? `导入失败：${e.message}` : "导入失败");
    }
    finally {
      setIsImporting(false);
    }
  };

  const handleQuickCreateRole = () => {
    if (!onOpenRoleAddWindow) {
      appToast.error("当前页面无法打开创建角色入口");
      return;
    }
    onClose();
    setTimeout(() => onOpenRoleAddWindow(), 0);
  };

  const handleQuickCreateNpc = () => {
    if (!onOpenNpcAddWindow) {
      appToast.error("当前页面无法打开创建NPC入口");
      return;
    }
    onClose();
    setTimeout(() => onOpenNpcAddWindow(), 0);
  };

  const handleClear = () => {
    if (isImportBusy) {
      return;
    }
    setFileName(null);
    setRawText("");
  };

  return (
    <div className="
      flex h-[min(82vh,680px)] max-h-[calc(100dvh-2rem)] min-h-0
      w-[min(92vw,920px)] flex-col overflow-hidden bg-base-100 text-base-content
    ">
      <header className="
        flex-none border-b border-base-300/70 bg-base-100 px-5 py-4
      ">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="
              flex size-10 shrink-0 items-center justify-center rounded-md
              bg-info/10 text-info
            ">
              <RoomChatIcon className="size-[22px]" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="text-lg/6 font-semibold">导入对话</h2>
              {supportsRglImport && (
                <div className="join" role="group" aria-label="导入模式">
                  <button
                    type="button"
                    aria-label="切换到普通导入模式"
                    aria-pressed={importMode === "plain"}
                    className={`join-item btn btn-xs ${importMode === "plain" ? "border-info/40 bg-base-300 text-info shadow-sm" : "btn-ghost"}`}
                    onClick={() => setImportMode("plain")}
                    disabled={isImportBusy}
                  >
                    普通
                  </button>
                  <button
                    type="button"
                    aria-label="切换到 RGL 导入模式"
                    aria-pressed={importMode === "rgl"}
                    className={`join-item btn btn-xs ${importMode === "rgl" ? "border-info/40 bg-base-300 text-info shadow-sm" : "btn-ghost"}`}
                    onClick={() => setImportMode("rgl")}
                    disabled={isImportBusy}
                  >
                    <Table size={13} />
                    RGL
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-circle btn-sm shrink-0"
            onClick={onClose}
            disabled={isImportBusy}
            title="关闭"
            aria-label="关闭导入窗口"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="
        grid min-h-0 flex-1 grid-cols-1 overflow-hidden
        lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]
      ">
        <section className="
          flex min-h-0 flex-col border-b border-base-300/70 bg-base-200/25
          lg:border-b-0 lg:border-r
        ">
          <div className="
            flex flex-none items-center justify-between gap-3 border-b
            border-base-300/70 bg-base-100/70 px-5 py-3
          ">
            <h3 className="text-sm font-semibold">导入内容</h3>
            <button
              type="button"
              className="
                btn btn-ghost btn-xs text-error
                hover:bg-error/10
              "
              onClick={handleClear}
              disabled={isImportBusy || (!rawText && !fileName)}
              title="清空内容"
              aria-label="清空导入内容"
            >
              <Broom size={14} />
              清空
            </button>
          </div>

          <div className="
            flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5
          ">
            <div className="relative group flex-none">
              <input
                type="file"
                accept=".txt,.rgl,.md,text/plain,text/markdown"
                className="
                  absolute inset-0 z-10 size-full cursor-pointer opacity-0
                  disabled:cursor-not-allowed
                "
                onChange={e => handlePickFile(e.target.files)}
                disabled={isImportBusy}
                title="选择文本文件"
                aria-label="上传聊天记录文件"
              />
              <div
                className={`
                  flex min-h-24 items-center justify-center rounded-md border
                  border-dashed p-4 text-center transition
                  ${
                  fileName
                    ? "border-success/50 bg-success/10 text-success"
                    : `
                      border-base-300 bg-base-100
                      hover:border-info/45 hover:bg-info/5
                    `
                }
                `}
              >
                {fileName
                  ? (
                      <div className="
                        flex min-w-0 flex-col items-center gap-1.5
                      ">
                        <FileText size={26} weight="regular" />
                        <span className="
                          max-w-full truncate text-sm font-medium
                        ">{fileName}</span>
                        <span className="text-[11px] opacity-70">点击更换</span>
                      </div>
                    )
                  : (
                      <div className="
                        flex flex-col items-center gap-1.5 text-base-content/55
                      ">
                        <FileText size={26} weight="light" />
                        <span className="
                          text-sm font-medium text-base-content/70
                        ">拖入或点击选择 .txt/.rgl/.md 文件</span>
                        <span className="text-[11px]">也可以在下方粘贴文本</span>
                      </div>
                    )}
              </div>
            </div>

            <textarea
              className="
                size-full min-h-65 flex-1 resize-none rounded-md border
                border-base-300 bg-base-100 px-3 py-2 font-mono text-xs/relaxed
                transition
                focus:outline-none focus:ring-2 focus:ring-info/20
                focus:border-info
              "
              autoComplete="off"
              aria-label="导入消息文本"
              placeholder={importMode === "rgl"
                ? "粘贴 RGL 内容，例如 [角色.表情]:台词"
                : "粘贴聊天记录，例如 [KP]：台词 或 昵称 时间 内容"}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              disabled={isImportBusy}
            />

            {hasParsedContent && (
              <div className="
                flex flex-none flex-wrap items-center gap-2 rounded-md border
                border-base-300/70 bg-base-100 px-3 py-2 text-xs
              ">
                <div className="badge badge-sm badge-ghost gap-1">
                  <CheckCircle className="text-success" size={12} weight="fill" />
                  {activeMessageCount}
                  {" "}
                  条有效
                </div>
                {activeInvalidLines.length > 0 && (
                  <div className="badge badge-sm badge-warning gap-1">
                    <Warning className="text-warning-content" size={12} weight="fill" />
                    {activeInvalidLines.length}
                    {" "}
                    条无效
                  </div>
                )}
                {activeInvalidLines.length > 0 && (
                  <span className="min-w-0 text-base-content/55">
                    无法解析行号：
                    {activeInvalidLines.slice(0, 10).map(i => i.lineNumber).join(", ")}
                    {activeInvalidLines.length > 10 && " ..."}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-base-100">
          {importMode === "plain"
            ? (
                <>
                  <div className="
                    flex flex-none items-center justify-between gap-3 border-b
                    border-base-300/70 px-5 py-3
                  ">
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
                            className="btn btn-xs btn-outline btn-info gap-1"
                            onClick={handleQuickCreateRole}
                            disabled={isImportBusy}
                          >
                            <UserPlus size={14} />
                            新建角色
                          </button>
                        )}
                        {onOpenNpcAddWindow && (
                          <button
                            type="button"
                            className="btn btn-xs btn-outline gap-1"
                            onClick={handleQuickCreateNpc}
                            disabled={isImportBusy}
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
                          <div className="
                            flex flex-1 flex-col items-center justify-center gap-2 px-8
                            text-center text-base-content/35
                          ">
                            <User size={40} weight="regular" />
                            <span className="text-sm font-medium text-base-content/50">等待导入文本</span>
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
                                    className={`
                                      rounded-md border p-3 transition
                                      ${
                                      isMissing
                                        ? "border-error/30 bg-error/5"
                                        : `
                                          border-base-300/70 bg-base-200/30
                                          hover:bg-base-200/55
                                        `
                                    }
                                    `}
                                  >
                                    <div className="
                                      mb-2 flex items-center justify-between gap-3
                                    ">
                                      <div className="
                                        max-w-60 truncate font-mono text-sm font-medium
                                      " title={speaker}>
                                        {speaker}
                                      </div>
                                      <div className={`
                                        badge badge-sm
                                        ${isMissing ? `badge-error` : `
                                          badge-success badge-outline
                                        `}
                                      `}>
                                        {isMissing ? "待匹配" : "已匹配"}
                                      </div>
                                    </div>

                                    <div className="grid gap-2">
                                      <select
                                        className={`
                                          select select-bordered select-sm w-full
                                          rounded-md
                                          ${isMissing ? `select-error` : ""}
                                        `}
                                        value={value == null ? "" : String(value)}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setMapping(prev => ({ ...prev, [speaker]: v ? Number(v) : null }));
                                        }}
                                        disabled={isImportBusy}
                                        title="选择角色"
                                      >
                                        <option value="">请选择对应角色</option>
                                        <option disabled className="
                                          text-xs font-bold bg-base-200
                                          text-base-content/50
                                        ">— 特殊角色 —</option>
                                        <option value={String(IMPORT_SPECIAL_ROLE_ID.NARRATOR)}>旁白</option>
                                        <option value={String(IMPORT_SPECIAL_ROLE_ID.DICER)}>骰娘 (系统)</option>
                                        <option disabled className="
                                          text-xs font-bold bg-base-200
                                          text-base-content/50
                                        ">— 房间角色 —</option>
                                        {roleOptions.map(o => (
                                          <option key={o.roleId} value={String(o.roleId)}>
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>

                                      <div className="flex items-center gap-2">
                                        <span className="
                                          shrink-0 text-[11px] text-base-content/50
                                        ">立绘</span>
                                        <div className="join min-w-0 flex-1">
                                          {FIGURE_POSITION_ORDER.map(pos => (
                                            <input
                                              key={pos}
                                              className="
                                                join-item btn btn-xs btn-ghost flex-1
                                                px-1 text-[10px] font-normal
                                                aria-checked:bg-info/20
                                                aria-checked:text-info
                                              "
                                              type="radio"
                                              name={`pos-${speaker}`}
                                              aria-label={FIGURE_POSITION_LABELS[pos]}
                                              checked={figurePosition === pos}
                                              onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: pos }))}
                                              disabled={isImportBusy || value == null || value <= 0}
                                              title={`立绘位置：${FIGURE_POSITION_LABELS[pos]}`}
                                            />
                                          ))}
                                          <input
                                            className="
                                              join-item btn btn-xs btn-ghost px-2
                                              font-mono text-[10px]
                                              aria-checked:opacity-50
                                            "
                                            type="radio"
                                            name={`pos-${speaker}`}
                                            aria-label="无"
                                            checked={figurePosition == null}
                                            onChange={() => setFigurePositionMap(prev => ({ ...prev, [speaker]: null }))}
                                            disabled={isImportBusy || value == null || value <= 0}
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
                      <div className="
                        border-t border-error/10 bg-error/10 px-4 py-2 text-center
                        text-xs text-error
                      ">
                        还有
                        {" "}
                        {missingSpeakers.length}
                        {" "}
                        个未匹配
                      </div>
                    )}
                  </div>
                </>
              )
            : (
                <>
                  <div className="
                    flex flex-none items-center justify-between gap-3 border-b
                    border-base-300/70 px-5 py-3
                  ">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">RGL 导入</h3>
                      <p className="mt-0.5 text-xs text-base-content/50">
                        按底层 annotation ID 解析角色、素材和骰子
                      </p>
                    </div>
                    <div className="badge badge-outline badge-sm gap-1">
                      <Table size={12} />
                      严格模式
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                    {!supportsRglImport && (
                      <div className="alert alert-warning py-3 text-sm">
                        <Warning size={20} />
                        <span className="text-xs">当前入口没有提供素材/头像加载器，无法执行 RGL 导入。</span>
                      </div>
                    )}

                    <div className="rounded-md border border-base-300/70 bg-base-200/20 p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-ghost badge-sm gap-1">
                          <CheckCircle className="text-success" size={12} weight="fill" />
                          {activeMessageCount}
                          {" "}
                          条有效
                        </span>
                        {activeInvalidLines.length > 0 && (
                          <span className="badge badge-warning badge-sm gap-1">
                            <Warning className="text-warning-content" size={12} weight="fill" />
                            {activeInvalidLines.length}
                            {" "}
                            条无效
                          </span>
                        )}
                      </div>
                      {activeInvalidLines.length > 0 && (
                        <div className="mt-2 text-[11px] text-error/90">
                          无法解析行号：
                          {activeInvalidLines.slice(0, 10).map(i => i.lineNumber).join(", ")}
                          {activeInvalidLines.length > 10 && " ..."}
                        </div>
                      )}
                      {activeMessageCount > 0 && (
                        <div className="mt-3 grid grid-cols-6 gap-1">
                          {RGL_EVENT_SUMMARY_ITEMS.map(item => (
                            <div
                              key={item.key}
                              className="rounded bg-base-100 px-2 py-1 text-center"
                            >
                              <div className="text-[10px] text-base-content/50">{item.label}</div>
                              <div className="font-mono text-sm font-semibold">{rglEventSummary[item.key]}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {onImportRglLocalAssets && (
                      <div className="rounded-md border border-base-300/70 bg-base-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-medium">本地素材清单</div>
                            <div className="mt-1 text-[11px] text-base-content/55">
                              选择包含 assets.json / replay-assets.json / local-assets.json 和素材文件的目录，上传后写入通用素材和角色素材。
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs shrink-0 gap-1"
                            onClick={handlePickRglLocalAssets}
                            disabled={isImportBusy}
                          >
                            {isImportingRglLocalAssets
                              ? <span className="loading loading-spinner loading-xs"></span>
                              : <ImageSquare size={13} />}
                            上传
                          </button>
                        </div>
                      </div>
                    )}

                    {onImportRglMaterialAssets && (
                      <div className="rounded-md border border-base-300/70 bg-base-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-medium">通用素材</div>
                            <div className="mt-1 text-[11px] text-base-content/55">
                              读取导入期 asset-manifest.json 的 media 段，创建或重写 Replay 局内素材包。
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs shrink-0 gap-1"
                            onClick={handlePickRglMaterialAssets}
                            disabled={isImportBusy}
                          >
                            {isImportingRglMaterialAssets
                              ? <span className="loading loading-spinner loading-xs"></span>
                              : <ImageSquare size={13} />}
                            导入
                          </button>
                        </div>
                      </div>
                    )}

                    {onImportRglRoleAssets && (
                      <div className="rounded-md border border-base-300/70 bg-base-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-medium">角色素材</div>
                            <div className="mt-1 text-[11px] text-base-content/55">
                              读取导入期 asset-manifest.json 的 roles 段；缺失角色会自动创建并加入当前房间，再创建或更新 RoleAvatar。
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs shrink-0 gap-1"
                            onClick={handlePickRglRoleAssets}
                            disabled={isImportBusy}
                          >
                            {isImportingRglRoleAssets
                              ? <span className="loading loading-spinner loading-xs"></span>
                              : <ImageSquare size={13} />}
                            导入
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="rounded-md border border-base-300/70 bg-base-100 p-3 text-xs text-base-content/70">
                      角色解析按房间角色名和头像差分名匹配；素材解析按素材包分组名和素材名匹配。任何未找到、重名或缺少 annotation 的素材都会直接失败。
                    </div>
                  </div>
                </>
              )}
        </section>
      </main>

      <footer className="
        flex flex-none items-center justify-between gap-4 border-t
        border-base-300/70 bg-base-100 px-5 py-4
      ">
        <div className="min-w-0 flex-1">
          {isImporting && progress
            ? (
                <div className="flex max-w-md flex-col gap-1">
                  <div className="
                    flex justify-between text-xs text-base-content/60
                  ">
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
                  <progress className="progress progress-info h-2 w-full" value={progress.sent} max={progress.total}></progress>
                </div>
              )
            : isImportingRglAssets
              ? (
                  <div className="truncate text-xs text-base-content/55">
                    素材导入中，请等待完成后再导入消息
                  </div>
                )
            : (
                <div className="truncate text-xs text-base-content/55">
                  {activeMessageCount === 0
                    ? "请先粘贴文本或上传 .txt/.rgl/.md 文件"
                    : (
                        <>
                          <span className="font-medium text-base-content/80">{activeMessageCount}</span>
                          {" 条消息 · "}
                          {importMode === "rgl"
                            ? "RGL"
                            : (
                                <>
                                  <span className="font-medium text-base-content/80">{speakers.length}</span>
                                  {" 个角色"}
                                </>
                              )}
                          {importMode === "plain" && missingSpeakers.length > 0 && (
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
            disabled={isImportBusy}
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
            {submitLabel ? submitLabel(activeMessageCount, isImporting) : (isImporting ? "正在导入..." : `导入 ${activeMessageCount} 条`)}
          </button>
        </div>
      </footer>
      <input
        ref={rglLocalAssetsInputRef}
        type="file"
        className="hidden"
        multiple
        {...RGL_LOCAL_ASSET_DIRECTORY_INPUT_PROPS}
        disabled={isImportBusy}
        onChange={event => void handleImportRglLocalAssetsFile(event.target.files)}
      />
      <input
        ref={rglMaterialAssetsInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        disabled={isImportBusy}
        onChange={event => void handleImportRglMaterialAssetsFile(event.target.files)}
      />
      <input
        ref={rglRoleAssetsInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        disabled={isImportBusy}
        onChange={event => void handleImportRglRoleAssetsFile(event.target.files)}
      />
    </div>
  );
}
