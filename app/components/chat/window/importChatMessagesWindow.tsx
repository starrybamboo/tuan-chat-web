import type { UserRole } from "../../../../api";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IMPORT_SPECIAL_ROLE_ID, isDicerSpeakerName, normalizeSpeakerName, parseImportedChatText } from "@/components/chat/utils/importChatText";

export interface ResolvedImportChatMessage {
  lineNumber: number;
  speakerName: string;
  roleId: number;
  content: string;
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

  return (
    <div className="w-[90vw] max-w-3xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold">导入文本到聊天室</div>
          <div className="text-xs text-base-content/60 mt-1">
            支持格式：`[角色名]：对话内容`（每行一条消息）
          </div>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} disabled={isImporting}>
          关闭
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-md border border-base-300 bg-base-100 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".txt,text/plain"
              className="file-input file-input-sm file-input-bordered"
              onChange={e => handlePickFile(e.target.files?.[0] ?? null)}
              disabled={isImporting}
            />
            {fileName && (
              <span className="text-xs text-base-content/60">
                已选择：
                {fileName}
              </span>
            )}
          </div>

          <textarea
            className="textarea textarea-bordered w-full min-h-40 font-mono text-xs"
            placeholder={"在此粘贴文本，或选择 .txt 文件\n示例：\n[KP]：你好\n[蓝色的人]：你好"}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            disabled={isImporting}
          />

          <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/70">
            <span>
              有效消息：
              {parsed.messages.length}
            </span>
            <span>
              无效行：
              {parsed.invalidLines.length}
            </span>
          </div>

          {parsed.invalidLines.length > 0 && (
            <div className="text-xs text-warning">
              检测到无效行（仅展示前 5 条）：
              {parsed.invalidLines.slice(0, 5).map(i => `#${i.lineNumber}`).join("、")}
            </div>
          )}
        </div>

        <div className="rounded-md border border-base-300 bg-base-100 p-3 space-y-2">
          <div className="font-semibold text-sm">角色映射</div>
          {!isKP && roleOptions.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-base-200/60 rounded-md p-2">
              <div className="text-xs text-base-content/70">
                当前房间没有可用角色，无法导入。可先快速创建角色并导入到房间。
              </div>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                onClick={handleQuickCreateRole}
                disabled={isImporting}
              >
                创建/导入角色
              </button>
            </div>
          )}
          {speakers.length === 0 && (
            <div className="text-sm text-base-content/60">请先导入文本内容</div>
          )}

          {speakers.length > 0 && (
            <div className="space-y-2">
              {speakers.map((speaker) => {
                const value = mapping[speaker];
                return (
                  <div key={speaker} className="flex flex-wrap items-center gap-2">
                    <div className="w-40 min-w-0 truncate text-sm">
                      [
                      {speaker}
                      ]
                    </div>
                    <select
                      className="select select-sm select-bordered flex-1 min-w-52"
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
                  </div>
                );
              })}
            </div>
          )}

          {missingSpeakers.length > 0 && (
            <div className="text-xs text-error">
              仍需指定：
              {missingSpeakers.map(s => `[${s}]`).join("、")}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-base-content/60">
            {progress && isImporting ? `导入中：${progress.sent}/${progress.total}` : " "}
          </div>
          <button
            type="button"
            className={`btn btn-sm ${canImport ? "btn-info" : "btn-disabled"}`}
            onClick={handleImport}
            disabled={!canImport}
          >
            开始导入
          </button>
        </div>
      </div>
    </div>
  );
}
