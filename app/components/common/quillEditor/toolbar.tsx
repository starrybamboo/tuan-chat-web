// 选中态横向工具栏按钮集合（紧凑尺寸）
export function SelectionMenu(props: {
  activeHeader: number;
  activeList: string | null;
  activeCodeBlock: boolean;
  activeAlign: "left" | "center" | "right" | "justify";
  activeInline: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean };
  onMenuParagraph: () => void;
  onMenuHeader: (lvl: 1 | 2 | 3) => void;
  onMenuList: (type: "bullet" | "ordered") => void;
  onMenuCode: () => void;
  onMenuAlign: (val: "left" | "center" | "right" | "justify") => void;
  onMenuInline: (type: "bold" | "italic" | "underline" | "strike") => void;
  onMenuClearInline: () => void;
}) {
  const { activeHeader, activeList, activeCodeBlock, activeAlign, activeInline, onMenuParagraph, onMenuHeader, onMenuList, onMenuCode, onMenuAlign, onMenuInline, onMenuClearInline } = props;
  return (
    <>
      {/* 段落 */}
      <button type="button" title="正文" aria-label="正文" className={activeHeader === 0 && !activeList && !activeCodeBlock ? "active" : ""} style={{ color: activeHeader === 0 && !activeList && !activeCodeBlock ? "#2563eb" : undefined }} onClick={onMenuParagraph}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M12 6v12" />
        </svg>
      </button>
      {/* left */}
      <button type="button" title="左对齐" aria-label="左对齐" className={activeAlign === "left" ? "active" : ""} style={{ color: activeAlign === "left" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("left")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h12" />
          <path d="M4 14h16" />
          <path d="M4 18h10" />
        </svg>
      </button>
      {/* center */}
      <button type="button" title="居中对齐" aria-label="居中对齐" className={activeAlign === "center" ? "active" : ""} style={{ color: activeAlign === "center" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("center")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M6 10h12" />
          <path d="M4 14h16" />
          <path d="M7 18h10" />
        </svg>
      </button>
      {/* right */}
      <button type="button" title="右对齐" aria-label="右对齐" className={activeAlign === "right" ? "active" : ""} style={{ color: activeAlign === "right" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("right")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M8 10h12" />
          <path d="M4 14h16" />
          <path d="M10 18h10" />
        </svg>
      </button>
      {/* justify */}
      <button type="button" title="两端对齐" aria-label="两端对齐" className={activeAlign === "justify" ? "active" : ""} style={{ color: activeAlign === "justify" ? "#2563eb" : undefined }} onClick={() => onMenuAlign("justify")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h16" />
          <path d="M4 14h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      {/* H1 */}
      <button type="button" title="H1" aria-label="H1" className={activeHeader === 1 ? "active" : ""} style={{ color: activeHeader === 1 ? "#2563eb" : undefined }} onClick={() => onMenuHeader(1)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="9" fill="currentColor">1</text>
        </svg>
      </button>
      {/* H2 */}
      <button type="button" title="H2" aria-label="H2" className={activeHeader === 2 ? "active" : ""} style={{ color: activeHeader === 2 ? "#2563eb" : undefined }} onClick={() => onMenuHeader(2)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="9" fill="currentColor">2</text>
        </svg>
      </button>
      {/* H3 */}
      <button type="button" title="H3" aria-label="H3" className={activeHeader === 3 ? "active" : ""} style={{ color: activeHeader === 3 ? "#2563eb" : undefined }} onClick={() => onMenuHeader(3)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="9" fill="currentColor">3</text>
        </svg>
      </button>
      {/* bullet */}
      <button type="button" title="• 列表" aria-label="• 列表" className={activeList === "bullet" ? "active" : ""} style={{ color: activeList === "bullet" ? "#2563eb" : undefined }} onClick={() => onMenuList("bullet")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="7" r="1.4" />
          <path d="M9 7h10" />
          <circle cx="5" cy="12" r="1.4" />
          <path d="M9 12h10" />
          <circle cx="5" cy="17" r="1.4" />
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* ordered */}
      <button type="button" title="1. 列表" aria-label="1. 列表" className={activeList === "ordered" ? "active" : ""} style={{ color: activeList === "ordered" ? "#2563eb" : undefined }} onClick={() => onMenuList("ordered")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="3" y="9" fontSize="7" fill="currentColor">1</text>
          <path d="M9 7h10" />
          <text x="3" y="14" fontSize="7" fill="currentColor">2</text>
          <path d="M9 12h10" />
          <text x="3" y="19" fontSize="7" fill="currentColor">3</text>
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* code-block */}
      <button type="button" title="代码块" aria-label="代码块" className={activeCodeBlock ? "active" : ""} style={{ color: activeCodeBlock ? "#2563eb" : undefined }} onClick={onMenuCode}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16l-4-4 4-4" />
          <path d="M16 8l4 4-4 4" />
          <path d="M14 4l-4 16" />
        </svg>
      </button>
      {/* bold */}
      <button type="button" title="B" aria-label="B" className={activeInline.bold ? "active" : ""} style={{ color: activeInline.bold ? "#2563eb" : undefined }} onClick={() => onMenuInline("bold")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 5h6a3 3 0 0 1 0 6H7z" />
          <path d="M7 11h7a3 3 0 0 1 0 6H7z" />
        </svg>
      </button>
      {/* italic */}
      <button type="button" title="I" aria-label="I" className={activeInline.italic ? "active" : ""} style={{ color: activeInline.italic ? "#2563eb" : undefined }} onClick={() => onMenuInline("italic")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      {/* underline */}
      <button type="button" title="U" aria-label="U" className={activeInline.underline ? "active" : ""} style={{ color: activeInline.underline ? "#2563eb" : undefined }} onClick={() => onMenuInline("underline")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v7a6 6 0 0 0 12 0V4" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      </button>
      {/* strike */}
      <button type="button" title="S" aria-label="S" className={activeInline.strike ? "active" : ""} style={{ color: activeInline.strike ? "#2563eb" : undefined }} onClick={() => onMenuInline("strike")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <path d="M6 7a4 4 0 0 1 2-3h8" />
          <path d="M18 17a4 4 0 0 1-2 3H8" />
        </svg>
      </button>
      {/* clear inline */}
      <button type="button" title="清除" aria-label="清除行内格式" onClick={onMenuClearInline}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M8 4h10l-6 8" />
        </svg>
      </button>
    </>
  );
}

// 小方块工具栏的下拉菜单内容，抽出为独立组件，降低嵌套缩进复杂度
export function InlineMenu(props: {
  activeHeader: number;
  activeList: string | null;
  activeCodeBlock: boolean;
  activeAlign: "left" | "center" | "right" | "justify";
  activeInline: { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean };
  onMenuParagraph: () => void;
  onMenuHeader: (lvl: 1 | 2 | 3) => void;
  onMenuList: (type: "bullet" | "ordered") => void;
  onMenuCode: () => void;
  onMenuAlign: (val: "left" | "center" | "right" | "justify") => void;
  onMenuInline: (type: "bold" | "italic" | "underline" | "strike") => void;
  onMenuClearInline: () => void;
}) {
  const { activeHeader, activeList, activeCodeBlock, activeAlign, activeInline, onMenuParagraph, onMenuHeader, onMenuList, onMenuCode, onMenuAlign, onMenuInline, onMenuClearInline } = props;
  return (
    <>
      {/* 段落（T） */}
      <button
        type="button"
        role="menuitem"
        title="正文"
        aria-label="正文"
        className={activeHeader === 0 && !activeList && !activeCodeBlock ? "active" : ""}
        style={{ color: activeHeader === 0 && !activeList && !activeCodeBlock ? "#2563eb" : undefined }}
        onClick={onMenuParagraph}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M12 6v12" />
        </svg>
      </button>
      {/* 对齐：左 */}
      <button
        type="button"
        role="menuitem"
        title="左对齐"
        aria-label="左对齐"
        className={activeAlign === "left" ? "active" : ""}
        style={{ color: activeAlign === "left" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("left")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h12" />
          <path d="M4 14h16" />
          <path d="M4 18h10" />
        </svg>
      </button>
      {/* 对齐：居中 */}
      <button
        type="button"
        role="menuitem"
        title="居中对齐"
        aria-label="居中对齐"
        className={activeAlign === "center" ? "active" : ""}
        style={{ color: activeAlign === "center" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("center")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M6 10h12" />
          <path d="M4 14h16" />
          <path d="M7 18h10" />
        </svg>
      </button>
      {/* 对齐：右 */}
      <button
        type="button"
        role="menuitem"
        title="右对齐"
        aria-label="右对齐"
        className={activeAlign === "right" ? "active" : ""}
        style={{ color: activeAlign === "right" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("right")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M8 10h12" />
          <path d="M4 14h16" />
          <path d="M10 18h10" />
        </svg>
      </button>
      {/* 对齐：两端 */}
      <button
        type="button"
        role="menuitem"
        title="两端对齐"
        aria-label="两端对齐"
        className={activeAlign === "justify" ? "active" : ""}
        style={{ color: activeAlign === "justify" ? "#2563eb" : undefined }}
        onClick={() => onMenuAlign("justify")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 10h16" />
          <path d="M4 14h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      {/* H1 */}
      <button
        type="button"
        role="menuitem"
        title="标题1"
        aria-label="标题1"
        className={activeHeader === 1 ? "active" : ""}
        style={{ color: activeHeader === 1 ? "#2563eb" : undefined }}
        onClick={() => onMenuHeader(1)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="10" fill="currentColor">1</text>
        </svg>
      </button>
      {/* H2 */}
      <button
        type="button"
        role="menuitem"
        title="标题2"
        aria-label="标题2"
        className={activeHeader === 2 ? "active" : ""}
        style={{ color: activeHeader === 2 ? "#2563eb" : undefined }}
        onClick={() => onMenuHeader(2)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="10" fill="currentColor">2</text>
        </svg>
      </button>
      {/* H3 */}
      <button
        type="button"
        role="menuitem"
        title="标题3"
        aria-label="标题3"
        className={activeHeader === 3 ? "active" : ""}
        style={{ color: activeHeader === 3 ? "#2563eb" : undefined }}
        onClick={() => onMenuHeader(3)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6v12" />
          <path d="M12 6v12" />
          <path d="M4 12h8" />
          <text x="16" y="16" fontSize="10" fill="currentColor">3</text>
        </svg>
      </button>
      {/* 无序列表 */}
      <button
        type="button"
        role="menuitem"
        title="无序列表"
        aria-label="无序列表"
        className={activeList === "bullet" ? "active" : ""}
        style={{ color: activeList === "bullet" ? "#2563eb" : undefined }}
        onClick={() => onMenuList("bullet")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="7" r="1.5" />
          <path d="M9 7h10" />
          <circle cx="5" cy="12" r="1.5" />
          <path d="M9 12h10" />
          <circle cx="5" cy="17" r="1.5" />
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* 有序列表 */}
      <button
        type="button"
        role="menuitem"
        title="有序列表"
        aria-label="有序列表"
        className={activeList === "ordered" ? "active" : ""}
        style={{ color: activeList === "ordered" ? "#2563eb" : undefined }}
        onClick={() => onMenuList("ordered")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <text x="3" y="9" fontSize="8" fill="currentColor">1</text>
          <path d="M9 7h10" />
          <text x="3" y="14" fontSize="8" fill="currentColor">2</text>
          <path d="M9 12h10" />
          <text x="3" y="19" fontSize="8" fill="currentColor">3</text>
          <path d="M9 17h10" />
        </svg>
      </button>
      {/* 代码块 */}
      <button
        type="button"
        role="menuitem"
        title="代码块"
        aria-label="代码块"
        className={activeCodeBlock ? "active" : ""}
        style={{ color: activeCodeBlock ? "#2563eb" : undefined }}
        onClick={onMenuCode}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 16l-4-4 4-4" />
          <path d="M16 8l4 4-4 4" />
          <path d="M14 4l-4 16" />
        </svg>
      </button>
      {/* 加粗 */}
      <button
        type="button"
        role="menuitem"
        title="加粗"
        aria-label="加粗"
        className={activeInline.bold ? "active" : ""}
        style={{ color: activeInline.bold ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("bold")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 5h6a3 3 0 0 1 0 6H7z" />
          <path d="M7 11h7a3 3 0 0 1 0 6H7z" />
        </svg>
      </button>
      {/* 斜体 */}
      <button
        type="button"
        role="menuitem"
        title="斜体"
        aria-label="斜体"
        className={activeInline.italic ? "active" : ""}
        style={{ color: activeInline.italic ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("italic")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
      </button>
      {/* 下划线 */}
      <button
        type="button"
        role="menuitem"
        title="下划线"
        aria-label="下划线"
        className={activeInline.underline ? "active" : ""}
        style={{ color: activeInline.underline ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("underline")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v7a6 6 0 0 0 12 0V4" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      </button>
      {/* 删除线 */}
      <button
        type="button"
        role="menuitem"
        title="删除线"
        aria-label="删除线"
        className={activeInline.strike ? "active" : ""}
        style={{ color: activeInline.strike ? "#2563eb" : undefined }}
        onClick={() => onMenuInline("strike")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="12" x2="20" y2="12" />
          <path d="M6 7a4 4 0 0 1 2-3h8" />
          <path d="M18 17a4 4 0 0 1-2 3H8" />
        </svg>
      </button>
      {/* 清除行内格式 */}
      <button type="button" role="menuitem" title="清除行内格式" aria-label="清除行内格式" onClick={onMenuClearInline}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M8 4h10l-6 8" />
        </svg>
      </button>
    </>
  );
}
