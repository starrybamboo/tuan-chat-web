import useCommandExecutor from "@/components/common/commandExecutor";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface ImportWithStCmdProps {
  ruleId: number;
  roleId: number;
  onImportSuccess?: () => void;
}

export default function ImportWithStCmd({ ruleId, roleId, onImportSuccess }: ImportWithStCmdProps) {
  const [commandInput, setCommandInput] = useState("");
  const execute = useCommandExecutor(roleId, ruleId);

  const handleImport = () => {
    try {
      const importResult = execute(commandInput);

      // 处理结果格式
      let formattedResult = importResult
        .replace(/[\n\r]/g, "") // 去掉换行
        .replace(/[{}]/g, ""); // 去掉大括号

      // 统计属性数量并格式化
      const props = formattedResult.split(",");
      const propCount = props.length;
      if (propCount > 5) {
        formattedResult = `${props.slice(0, 5).join(",")}等`;
      }

      // 添加总数信息
      formattedResult += `共${propCount}项属性`;

      toast.success(formattedResult, {
        duration: 4000,
        position: "top-center",
      });
      setCommandInput("");
      onImportSuccess?.();
    }
    catch (error) {
      toast.error(`导入失败: ${error instanceof Error ? error.message : "指令格式有误"}`, {
        duration: 4000,
        position: "top-center",
      });
    }
  };

  return (
    <fieldset className="border border-base-300 rounded-lg p-4">
      <legend className="px-2 font-bold">ST指令导入</legend>
      <div className="relative w-full">
        <textarea
          className="bg-base-200 rounded-lg p-4 w-full h-40 overflow-auto resize-none"
          placeholder="输入.st指令导入属性（例：.st 力量80 敏捷70 意志50）"
          value={commandInput}
          onChange={e => setCommandInput(e.target.value)}
        />
        <button
          className="btn btn-accent absolute bottom-4 right-2"
          onClick={handleImport}
          disabled={!commandInput.trim()}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
          </svg>
          导入属性
        </button>
      </div>
    </fieldset>
  );
}
