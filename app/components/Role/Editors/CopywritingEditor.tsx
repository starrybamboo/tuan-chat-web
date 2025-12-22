import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CopywritingEditorProps {
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
}

/**
 * 骰娘文案编辑器
 * - 本地编辑 Record<string, string[]> 结构
 * - 支持新增/删除/修改文案组（键）以及组内多条文案（数组项）
 * - 不触发后端，只在父组件传入的本地对象中变更
 */
export default function CopywritingEditor({ value, onChange }: CopywritingEditorProps) {
  const [groupNameInput, setGroupNameInput] = useState("");
  // 每个分组的新文案输入状态
  const [newEntryInputs, setNewEntryInputs] = useState<Record<string, string>>({});

  // 为每个分组的每条文案生成并维护稳定 key，避免使用 index 作为 key
  const entryKeysRef = useRef<Record<string, string[]>>({});
  const createEntryKey = useCallback(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const groups = useMemo(() => Object.entries(value || {}), [value]);

  // 对齐各分组的 key 数组长度 & 清理已删除分组
  useEffect(() => {
    const groupNames = new Set(groups.map(([name]) => name));

    for (const name of Object.keys(entryKeysRef.current)) {
      if (!groupNames.has(name))
        delete entryKeysRef.current[name];
    }

    for (const [name, entries] of groups) {
      const keys = entryKeysRef.current[name] ?? [];
      if (keys.length < entries.length) {
        entryKeysRef.current[name] = [...keys, ...Array.from({ length: entries.length - keys.length }, createEntryKey)];
      }
      else if (keys.length > entries.length) {
        entryKeysRef.current[name] = keys.slice(0, entries.length);
      }
      else {
        entryKeysRef.current[name] = keys;
      }
    }
  }, [createEntryKey, groups]);

  // 当传入为空时，自动填充一组默认示例文案（仅一次）
  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      const demo: Record<string, string[]> = {
        成功: [
          "骰子转动如星辰，结果令人满意！",
          "太棒了！你的运气站在你这边。",
        ],
        失败: [
          "骰子有点调皮，这次没有如愿。",
          "别灰心，下一次一定可以！",
        ],
        问候: [
          "欢迎来到掷骰时间，准备好了吗？",
          "骰娘在线，请下达你的指令~",
        ],
      };
      onChange(demo);
    }
  }, [value, onChange]);

  const addGroup = useCallback(() => {
    const name = groupNameInput.trim();
    if (!name)
      return;
    if (value[name])
      return; // 避免重复
    const next = { ...value, [name]: [""] };
    onChange(next);
    entryKeysRef.current[name] = [createEntryKey()];
    setGroupNameInput("");
  }, [createEntryKey, groupNameInput, onChange, value]);

  const renameGroup = useCallback(
    (oldName: string, newNameRaw: string) => {
      const newName = newNameRaw.trim();
      if (!newName || newName === oldName)
        return;
      if (value[newName])
        return; // 已存在
      const { [oldName]: oldVals, ...rest } = value;
      const next = { ...rest, [newName]: oldVals ?? [] };
      onChange(next);

      if (entryKeysRef.current[oldName]) {
        entryKeysRef.current[newName] = entryKeysRef.current[oldName];
        delete entryKeysRef.current[oldName];
      }
    },
    [onChange, value],
  );

  const deleteGroup = useCallback(
    (name: string) => {
      const { [name]: _removed, ...rest } = value;
      onChange(rest);
      delete entryKeysRef.current[name];
    },
    [onChange, value],
  );

  const addEntry = useCallback(
    (group: string) => {
      const list = value[group] || [];
      const next = { ...value, [group]: [...list, ""] };
      onChange(next);

      const keys = entryKeysRef.current[group] ?? [];
      entryKeysRef.current[group] = [...keys, createEntryKey()];
    },
    [createEntryKey, onChange, value],
  );

  const updateEntry = useCallback(
    (group: string, index: number, text: string) => {
      const list = value[group] || [];
      const nextList = list.map((v, i) => (i === index ? text : v));
      const next = { ...value, [group]: nextList };
      onChange(next);
    },
    [onChange, value],
  );

  const deleteEntry = useCallback(
    (group: string, index: number) => {
      const list = value[group] || [];
      const nextList = list.filter((_, i) => i !== index);
      const next = { ...value, [group]: nextList };
      onChange(next);

      const keys = entryKeysRef.current[group] ?? [];
      if (keys.length > 0) {
        const nextKeys = [...keys];
        nextKeys.splice(index, 1);
        entryKeysRef.current[group] = nextKeys;
      }
    },
    [onChange, value],
  );

  return (
    <div className="space-y-6">
      {/* 新增分组 */}
      <div className="card bg-base-200 rounded-xl">
        <div className="card-body p-4">
          <h4 className="text-sm font-medium text-base-content/70 mb-2">添加新分组</h4>
          <div className="join w-full">
            <input
              type="text"
              className="input input-bordered join-item flex-1"
              placeholder="输入文案组名称，如：成功、失败、问候"
              value={groupNameInput}
              onChange={e => setGroupNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addGroup()}
            />
            <button
              type="button"
              className="btn btn-primary join-item"
              onClick={addGroup}
              disabled={!groupNameInput.trim() || !!value[groupNameInput.trim()]}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加
            </button>
          </div>
        </div>
      </div>

      {/* 分组列表 */}
      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="text-center py-8 text-base-content/50">
            <div className="text-4xl mb-2">📝</div>
            <p>还没有文案分组，先新增一个吧。</p>
          </div>
        )}
        {groups.map(([name, entries]) => (
          <div key={name} className="bg-base-200 rounded-xl">
            {/* 分组标题 */}
            <div className="flex items-center gap-2 p-3 border-b border-base-content/10">
              <input
                type="text"
                defaultValue={name}
                onBlur={e => renameGroup(name, e.target.value)}
                className="input input-sm input-ghost font-semibold text-base flex-1 focus:input-bordered"
                title="点击编辑分组名"
              />
              <span className="badge badge-primary badge-sm">{entries.length}</span>
              <div className="tooltip tooltip-left" data-tip="删除分组">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10"
                  onClick={() => deleteGroup(name)}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 组内文案条目 */}
            <div className="px-3 pb-3 pt-3">
              <ul className="list bg-base-100 rounded-lg">
                {entries.map((text, idx) => {
                  let entryKey = entryKeysRef.current[name]?.[idx];
                  if (!entryKey) {
                    entryKey = createEntryKey();
                    const keys = entryKeysRef.current[name] ?? [];
                    keys[idx] = entryKey;
                    entryKeysRef.current[name] = keys;
                  }

                  return (
                    <li
                      key={entryKey}
                      className="list-row items-start gap-3 py-2"
                    >
                      <div className="text-xs font-mono opacity-50 tabular-nums pt-3">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1">
                        <textarea
                          className="textarea w-full focus:outline-none border-none outline-none bg-transparent resize-none"
                          placeholder={`文案 #${idx + 1}`}
                          value={text}
                          onChange={e => updateEntry(name, idx, e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="tooltip tooltip-left" data-tip="删除文案">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10 mt-2"
                          onClick={() => deleteEntry(name, idx)}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
                {/* 添加新文案的空行 */}
                <li className="list-row items-start gap-3 py-2">
                  <div className="text-xs font-mono opacity-50 tabular-nums pt-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <textarea
                      className="textarea w-full focus:outline-none border-none outline-none bg-transparent resize-none"
                      placeholder="输入新文案..."
                      value={newEntryInputs[name] || ""}
                      onChange={e => setNewEntryInputs(prev => ({ ...prev, [name]: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="tooltip tooltip-left" data-tip="添加文案">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square text-primary hover:bg-primary/10 mt-2"
                      disabled={!newEntryInputs[name]?.trim()}
                      onClick={() => {
                        const text = newEntryInputs[name]?.trim();
                        if (text) {
                          addEntry(name);
                          // 更新刚添加的空条目为输入的内容
                          const list = value[name] || [];
                          const nextList = [...list, text];
                          onChange({ ...value, [name]: nextList });
                          // 清空输入框
                          setNewEntryInputs(prev => ({ ...prev, [name]: "" }));
                        }
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
