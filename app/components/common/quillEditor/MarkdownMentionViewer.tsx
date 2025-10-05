/* eslint-disable react-dom/no-dangerously-set-innerhtml */
import { useEffect, useMemo, useRef, useState } from "react";
import { markdownToHtmlWithEntities } from "./markdownToHtml";
import MentionPreview from "./MentionPreview";

interface MarkdownMentionViewerProps {
  markdown: string;
  entitiesMap?: Record<string, string[]>; // { 人物: [...], 地点: [...], 物品: [...] }
  className?: string;
  // 控制预览面板是否启用
  enableHoverPreview?: boolean;
  // 可选：自定义提取实体详情（描述）的方法
  resolveDescription?: (category: string, name: string) => string | undefined;
}

/**
 * 只读模式：
 * - 将输入 markdown 渲染为 HTML（带实体校验的 mention span）
 * - 不提供编辑 / 所见即所得
 * - 支持鼠标悬停显示缩略 MentionPreview（与编辑器共用组件）
 */
export default function MarkdownMentionViewer(props: MarkdownMentionViewerProps) {
  const { markdown, entitiesMap = {}, className, enableHoverPreview = true, resolveDescription } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<{
    category: string;
    name: string;
    description?: string;
    leftVw: number;
    topVw: number;
  } | null>(null);
  const lockRef = useRef(false);

  // 预编译 HTML（最小化重算）
  const html = useMemo(() => {
    return markdownToHtmlWithEntities(markdown || "", entitiesMap || {});
  }, [markdown, entitiesMap]);

  // 悬停逻辑（与编辑器类似但更精简）
  useEffect(() => {
    if (!enableHoverPreview) {
      return;
    }
    const root = containerRef.current;
    if (!root) {
      return;
    }
    const onOver = (e: MouseEvent) => {
      if (lockRef.current) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const span = target.closest("span.ql-mention-span[data-label][data-category]") as HTMLElement | null;
      if (!span) {
        setPreview(null);
        return;
      }
      try {
        const name = span.getAttribute("data-label") || span.textContent || "";
        const category = span.getAttribute("data-category") || "";
        if (!name || !category) {
          setPreview(null);
          return;
        }
        // 仅当实体仍存在
        const list = entitiesMap[category] || [];
        if (!list.includes(name)) {
          setPreview(null);
          return;
        }
        const rect = span.getBoundingClientRect();
        const vw = Math.max(1, window.innerWidth || 1);
        // 位置：优先右侧，溢出则向左回退
        let left = rect.left / vw * 100;
        let top = rect.bottom / vw * 100; // 用同一 vw 比例即可，近似即可
        const panelW = 17.9; // 与 MentionPreview 保持一致
        if (left + panelW > 100) {
          left = Math.max(0, 100 - panelW - 1);
        }
        if (top + panelW > 100) {
          top = Math.max(0, (rect.top / vw * 100) - panelW - 1);
        }
        const desc = resolveDescription ? resolveDescription(category, name) : undefined;
        setPreview({ category, name, description: desc, leftVw: left, topVw: top });
      }
      catch {
        // ignore
      }
    };
    const onOut = (e: MouseEvent) => {
      if (lockRef.current) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const span = target?.closest("span.ql-mention-span[data-label][data-category]");
      if (span) {
        // 移出 span 但进入面板时保持
        // 直接等待 preview 面板自身的 onMouseEnter 处理锁
        // 这里不立即清除
      }
      else {
        setPreview(null);
      }
    };
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
    };
  }, [entitiesMap, enableHoverPreview, resolveDescription]);

  return (
    <div className={className} style={{ position: "relative" }}>
      <div
        ref={containerRef}
        className="markdown-mention-viewer prose max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {preview && enableHoverPreview && (
        <MentionPreview
          category={preview.category}
          name={preview.name}
          description={preview.description}
          left={preview.leftVw}
          top={preview.topVw}
          onMouseEnter={() => { lockRef.current = true; }}
          onMouseLeave={() => {
            lockRef.current = false;
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
