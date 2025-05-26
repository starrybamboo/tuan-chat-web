import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { MarkdownViewer } from "@/components/common/MarkDownViewer";
import { PopWindow } from "@/components/common/popWindow";

import { useEffect, useState } from "react";

// 动态导入所有Markdown文件
const markdownFiles = import.meta.glob("/app/updateLogs/*.md", {
  query: "?raw",
  import: "default",
  eager: false,
});
export default function UpdatesPopWindow() {
  // 储存上一次未提醒的日志文件编号
  const [unRemindFileNumber, setLastUnRemindFileNumber] = useLocalStorage<number>("unRemindFileNumber", -1);
  const totalFiles = Object.keys(markdownFiles).length;
  const [curLogIndex, setMarkdownIndex] = useState<number>(totalFiles - 1);
  const [currentContent, setCurrentContent] = useState("");
  const [isOpen, setIsOpen] = useState(unRemindFileNumber < totalFiles);
  // 加载当前Markdown内容
  useEffect(() => {
    if (isOpen && totalFiles > 0) {
      const loadMarkdown = async () => {
        const filePaths = Object.keys(markdownFiles);
        const content = await markdownFiles[filePaths[curLogIndex]]() as string;
        setCurrentContent(content);
      };
      loadMarkdown();
    }
  }, [curLogIndex, isOpen, totalFiles]);
  const handleClose = () => {
    setIsOpen(false);
  };
  if (!isOpen || totalFiles === 0)
    return null;
  return (
    <PopWindow isOpen={isOpen} onClose={handleClose}>
      <div className="max-w-2xl p-6 w-[80vw] lg:w-[60vw]">
        <div className="flex justify-between items-center pb-4">
          <span className="text-xl font-bold">
            更新日志 (
            {curLogIndex + 1}
            /
            {totalFiles}
            )
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto ">
          <MarkdownViewer content={currentContent} />
        </div>

        <div className="flex justify-between pt-3">
          <button
            onClick={() => { setMarkdownIndex(prev => (prev > 0 ? prev - 1 : totalFiles - 1)); }}
            type="button"
            className="btn btn-info"
            disabled={totalFiles <= 1}
          >
            {"<"}
          </button>
          <button
            onClick={() => { setLastUnRemindFileNumber(totalFiles); }}
            type="button"
            className="btn btn-info"
          >
            不再提醒
          </button>
          <button
            onClick={() => { setMarkdownIndex(prev => (prev < totalFiles - 1 ? prev + 1 : 0)); }}
            type="button"
            className="btn btn-info"
            disabled={totalFiles <= 1}
          >
            {">"}
          </button>
        </div>
      </div>
    </PopWindow>
  );
}
