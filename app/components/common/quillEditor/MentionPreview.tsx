interface MentionPreviewProps {
  category: string;
  name: string;
  description?: string;
  left: number; // vw
  top: number; // vw
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// 300px / 1680px ≈ 17.86vw；使用 17.9vw 四舍五入
const WRAP_WIDTH_VW = 17.9;
const WRAP_HEIGHT_VW = 17.9; // 同宽度形成正方/接近正方区域

export function MentionPreview(props: MentionPreviewProps) {
  const { category, name, description, left, top, onMouseEnter, onMouseLeave } = props;
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
      <div className="flex-1 p-3 overflow-auto leading-relaxed whitespace-pre-wrap text-xs">
        {description?.trim() ? description : <span className="opacity-50">暂无描述</span>}
      </div>
    </div>
  );
}

export default MentionPreview;
