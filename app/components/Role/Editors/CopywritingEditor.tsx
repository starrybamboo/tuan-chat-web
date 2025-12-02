import { useCallback, useEffect, useMemo, useState } from "react";

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

  const groups = useMemo(() => Object.entries(value || {}), [value]);

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
    setGroupNameInput("");
  }, [groupNameInput, onChange, value]);

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
    },
    [onChange, value],
  );

  const deleteGroup = useCallback(
    (name: string) => {
      const { [name]: _removed, ...rest } = value;
      onChange(rest);
    },
    [onChange, value],
  );

  const addEntry = useCallback(
    (group: string) => {
      const list = value[group] || [];
      const next = { ...value, [group]: [...list, ""] };
      onChange(next);
    },
    [onChange, value],
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
    },
    [onChange, value],
  );

  return (
    <div className="space-y-4">
      {/* 新增分组 */}
      <div className="border-t-2 pt-4 border-base-content/10">
        <span className="text-sm text-base-content/50 mb-2 block">添加新分组</span>
        <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
          <input
            type="text"
            className="grow focus:outline-none border-none outline-none bg-transparent"
            placeholder="输入文案组名称，如：成功、失败、问候"
            value={groupNameInput}
            onChange={e => setGroupNameInput(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-primary"
            onClick={addGroup}
            disabled={!groupNameInput.trim() || !!value[groupNameInput.trim()]}
            title="添加分组"
          >
            ✓
          </button>
        </label>
      </div>

      {/* 分组列表 */}
      <div className="space-y-4">
        {groups.length === 0 && (
          <div className="text-base-content/60 text-sm">还没有文案分组，先新增一个吧。</div>
        )}
        {groups.map(([name, entries]) => (
          <div key={name} className="space-y-3">
            {/* 分组标题 */}
            <div className="flex items-center gap-2">
              <label className="input input-sm flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none bg-base-100 flex-1">
                <input
                  type="text"
                  defaultValue={name}
                  onBlur={e => renameGroup(name, e.target.value)}
                  className="grow focus:outline-none border-none outline-none bg-transparent font-semibold text-base"
                  title="点击编辑分组名"
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                onClick={() => deleteGroup(name)}
                title="删除分组"
              >
                ✕
              </button>
            </div>

            {/* 组内文案条目 */}
            <div className="space-y-2 pl-4">
              {entries.length === 0 && (
                <div className="text-base-content/50 text-sm">该分组暂无文案</div>
              )}
              {entries.map((text, idx) => (
                <div key={`${name}-${idx}`} className="form-control">
                  <label className="textarea w-full flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none bg-base-100 p-0">
                    <textarea
                      className="textarea grow focus:outline-none border-none outline-none bg-transparent resize-none"
                      style={{ minHeight: "4rem" }}
                      placeholder={`文案 #${idx + 1}`}
                      value={text}
                      onChange={e => updateEntry(name, idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error hover:bg-error/10 mr-2"
                      onClick={() => deleteEntry(name, idx)}
                      title="删除文案"
                    >
                      ✕
                    </button>
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-outline w-full"
                onClick={() => addEntry(name)}
              >
                + 添加文案
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
