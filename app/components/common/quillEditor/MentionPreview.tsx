/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { useMemo } from "react";
import { markdownToHtmlWithEntities, rawMarkdownToHtml } from "./markdownToHtml";
import "./quill-overrides.css";

interface MentionPreviewProps {
  category: string;
  name: string;
  description?: string;
  left: number; // vw
  top: number; // vw
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  // 可选：用于校验 @类别名称 是否存在；如果不传则直接按原始 markdown 渲染（与编辑区保持一致）
  entitiesMap?: Record<string, string[]>; // { 人物: [...], 地点: [...], 物品: [...] }
}

// 300px / 1680px ≈ 17.86vw；使用 17.9vw 四舍五入
const WRAP_WIDTH_VW = 17.9;
const WRAP_HEIGHT_VW = 17.9; // 同宽度形成正方/接近正方区域

export function MentionPreview(props: MentionPreviewProps) {
  const { category, name, description, left, top, onMouseEnter, onMouseLeave, entitiesMap } = props;

  // 只读转换：支持 **bold** / *italic* / _italic_ / ~~strike~~ / ++underline++ / @人物张三 及 /t 缩进 等现有自定义规则
  // 说明：
  // 1) 使用现有 markdownToHtmlWithEntities 以最大复用（里面已处理 @mention 生成 span、空行、列表、code 等）
  // 2) MentionPreview 本身不需要 hover 再弹下一层，所以不加额外事件；span.ql-mention-span 仍可沿用样式。
  const renderedHtml = useMemo(() => {
    if (!description || !description.trim()) {
      return "";
    }
    const safeMap = entitiesMap || { 人物: [], 地点: [], 物品: [] };
    const totalEntities = [...(safeMap.人物 || []), ...(safeMap.地点 || []), ...(safeMap.物品 || [])].length;
    try {
      // 如果实体列表还是空的（尚未加载或接口未返回），不要做校验避免把 @语法直接还原成纯文本
      if (totalEntities === 0) {
        return rawMarkdownToHtml(description);
      }
      return markdownToHtmlWithEntities(description, safeMap);
    }
    catch {
      const esc = description
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre style=\"margin:0;white-space:pre-wrap;\">${esc}</pre>`;
    }
  }, [description, entitiesMap]);
  return (
    <div
      className="mention-preview shadow-lg rounded-md overflow-hidden border border-base-300 bg-base-100 text-sm select-none"
      style={{
        position: "fixed",
        width: `${WRAP_WIDTH_VW}vw`,
        maxWidth: `${WRAP_WIDTH_VW}vw`,
        height: `${WRAP_HEIGHT_VW}vw`,
        maxHeight: `${WRAP_HEIGHT_VW}vw`,
        left: `${left}vw`,
        top: `${top}vw`,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-3 py-2 font-semibold border-b border-base-300 flex items-center gap-2 text-primary">
        <span className="text-xs uppercase tracking-wide opacity-70">{category}</span>
        <span className="truncate" title={name}>{name}</span>
      </div>
      <div
        className="flex-1 p-3 overflow-auto leading-relaxed text-xs markdown-preview-body"
        style={{ wordBreak: "break-word" }}
      >
        {renderedHtml
          ? <div className="preview-html" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          : <span className="opacity-50">暂无描述</span>}
      </div>
    </div>
  );
}

export default MentionPreview;
