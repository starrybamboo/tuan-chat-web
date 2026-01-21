import type { UserRole } from "../../../../api";
import type { FigurePosition } from "@/types/voiceRenderTypes";

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
  const previewMessages = useMemo(() => parsed.messages.slice(0, 12), [parsed.messages]);

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

  const handlePickFile = async (file: File | null) => {
    if (!file)
      return;
    try {
      const text = await file.text();
      setFileName(file.name);
      setRawText(text);
      toast.success("已读取文件");
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
    <div className="w-[92vw] max-w-5xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-lg font-bold">导入文本到聊天室</div>
          <div className="text-xs text-base-content/60">
            每行一条消息，格式：
            <span className="ml-1 font-mono">[角色名]：对话内容</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge badge-sm ${isKP ? "badge-info" : "badge-ghost"}`}>
              {isKP ? "KP" : "玩家"}
            </span>
            <span className="badge badge-sm badge-ghost">
              有效消息：
              {parsed.messages.length}
            </span>
            <span className="badge badge-sm badge-ghost">
              无效行：
              {parsed.invalidLines.length}
            </span>
            {fileName && (
              <span className="badge badge-sm badge-ghost max-w-80 truncate" title={fileName}>
                {fileName}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} disabled={isImporting}>
          关闭
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm">1. 导入文本</div>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={handleClear}
                disabled={isImporting || (rawText.length === 0 && fileName == null)}
              >
                清空
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".txt,text/plain"
                className="file-input file-input-sm file-input-bordered w-full sm:w-auto"
                onChange={e => handlePickFile(e.target.files?.[0] ?? null)}
                disabled={isImporting}
              />
              <div className="text-xs text-base-content/60">
                或直接粘贴到下方（建议 UTF-8）
              </div>
            </div>

            <textarea
              className="textarea textarea-bordered w-full min-h-44 font-mono text-xs leading-relaxed"
              placeholder={"在此粘贴文本，或选择 .txt 文件\n示例：\n[KP]：你好\n[蓝色的人]：你好"}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              disabled={isImporting}
            />

            {parsed.invalidLines.length > 0 && (
              <div className="alert alert-warning py-2 text-xs">
                <div className="leading-relaxed">
                  检测到无法解析的行（仅展示前 8 条行号）：
                  {parsed.invalidLines.slice(0, 8).map(i => `#${i.lineNumber}`).join("、")}
                </div>
              </div>
            )}

            <details className="collapse collapse-arrow bg-base-200/40 rounded-xl">
              <summary className="collapse-title py-2 text-sm font-medium">
                消息预览（前
                {previewMessages.length}
                条）
              </summary>
              <div className="collapse-content space-y-2">
                {previewMessages.length === 0 && (
                  <div className="text-xs text-base-content/60">暂无可预览的有效消息</div>
                )}
                {previewMessages.length > 0 && (
                  <div className="space-y-1">
                    {previewMessages.map(m => (
                      <div key={`${m.lineNumber}-${m.speakerName}`} className="text-xs leading-relaxed">
                        <span className="font-mono text-base-content/70">{`[${m.speakerName}]`}</span>
                        <span className="ml-2">{m.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm">2. 角色映射</div>
              {onOpenRoleAddWindow && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  onClick={handleQuickCreateRole}
                  disabled={isImporting}
                >
                  创建角色
                </button>
              )}
            </div>

            {!isKP && roleOptions.length === 0 && (
              <div className="alert alert-info py-2 text-xs">
                <div className="leading-relaxed">
                  当前房间没有可用角色，无法完成映射。请先创建/导入角色，然后再回来继续导入。
                </div>
                {onOpenRoleAddWindow && (
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={handleQuickCreateRole}
                    disabled={isImporting}
                  >
                    创建/导入角色
                  </button>
                )}
              </div>
            )}

            {speakers.length === 0 && (
              <div className="text-sm text-base-content/60">请先导入文本内容</div>
            )}

            {speakers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th className="w-44">发言人</th>
                      <th>对应角色</th>
                      <th className="w-28">立绘位置</th>
                      <th className="w-20">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.map((speaker) => {
                      const value = mapping[speaker];
                      const figurePosition = figurePositionMap[speaker] ?? null;
                      const isSpecial = value != null && value <= 0;
                      const isMissing = value == null;

                      return (
                        <tr key={speaker} className={isMissing ? "bg-error/5" : undefined}>
                          <td className="font-mono text-xs max-w-44 truncate" title={speaker}>
                            {`[${speaker}]`}
                          </td>
                          <td>
                            <select
                              className="select select-sm select-bordered w-full min-w-52"
                              value={value == null ? "" : String(value)}
                              onChange={(e) => {
                                const v = e.target.value;
                                setMapping(prev => ({ ...prev, [speaker]: v ? Number(v) : null }));
                              }}
                              disabled={isImporting}
                            >
                              <option value="">请选择角色</option>
                              {isKP && <option value={String(IMPORT_SPECIAL_ROLE_ID.NARRATOR)}>旁白（KP）</option>}
                              <option value={String(IMPORT_SPECIAL_ROLE_ID.DICER)}>骰娘（系统）</option>
                              {roleOptions.map(o => (
                                <option key={o.roleId} value={String(o.roleId)}>{o.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="select select-sm select-bordered w-28"
                              value={figurePosition ?? ""}
                              onChange={(e) => {
                                const pos = e.target.value as Exclude<FigurePosition, undefined> | "";
                                setFigurePositionMap(prev => ({ ...prev, [speaker]: pos || null }));
                              }}
                              disabled={isImporting || value == null || value <= 0}
                              title={value != null && value > 0 ? "设置该发言人的立绘位置" : "旁白/系统消息不显示立绘"}
                            >
                              <option value="">不设置</option>
                              <option value="left">左</option>
                              <option value="center">中</option>
                              <option value="right">右</option>
                            </select>
                          </td>
                          <td>
                            {isMissing && <span className="badge badge-sm badge-error">待选</span>}
                            {!isMissing && isSpecial && <span className="badge badge-sm badge-ghost">特殊</span>}
                            {!isMissing && !isSpecial && <span className="badge badge-sm badge-success">已匹配</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {missingSpeakers.length > 0 && (
              <div className="alert alert-error py-2 text-xs">
                <div className="leading-relaxed">
                  仍需为以下发言人指定对应角色：
                  {missingSpeakers.map(s => `[${s}]`).join("、")}
                </div>
                {onOpenRoleAddWindow && (
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={handleQuickCreateRole}
                    disabled={isImporting}
                  >
                    去创建角色
                  </button>
                )}
              </div>
            )}

            <div className="text-xs text-base-content/60 leading-relaxed">
              提示：支持自动匹配同名角色；选择“骰娘（系统）”会按骰娘消息类型导入；旁白仅在 KP 模式可用。
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {progress && isImporting && (
          <progress
            className="progress progress-info w-full"
            value={progress.sent}
            max={Math.max(progress.total, 1)}
          />
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-base-content/60">
            {progress && isImporting ? `导入中：${progress.sent}/${progress.total}` : " "}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-info"
            onClick={handleImport}
            disabled={!canImport}
          >
            {isImporting ? "导入中..." : "开始导入"}
          </button>
        </div>
      </div>
    </div>
  );
}
