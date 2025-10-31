/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
import type { StageEntityResponse } from "api";
import type quill from "quill";
import { useModuleContext } from "@/components/create/workPlace/context/_moduleContext";
import { BaselineAutoAwesomeMotion } from "@/icons";
import { useQueryEntitiesQuery } from "api/hooks/moduleQueryHooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // ordered: useMemo before useState (project rule)
import { convertHtmlTagIfAny, logHtmlTagIfAny } from "./htmlTagWysiwyg";
import { htmlToMarkdown } from "./htmlToMarkdown";
import { backendContentToQuillHtml, markdownToHtmlWithEntities } from "./markdownToHtml";
import MentionPreview from "./MentionPreview";
import { restoreRawHtml } from "./restoreRawHtml";
import { InlineMenu, SelectionMenu } from "./toolbar";
import {
  detectAlignment,
  detectInlineFormats,
  detectMarkdown,
  removeBlockFormatIfEmpty,
} from "./wysiwygFuc";
// Quill 样式与本地覆盖
import "quill/dist/quill.snow.css";
import "./quill-overrides.css";

interface vditorProps {
  id: string;
  placeholder: string; // 仅用于首次挂载时的初始内容
  onchange: (value: string) => void;
  onSpecialKey?: (key: StageEntityResponse[]) => void; // 用于捕获 @
  onDeleteSpecialKey?: (key: StageEntityResponse) => void; // 用于捕获 Backspace 删除 @
  /**
   * （可选）启用选区/光标位置持久化。
   * 传入唯一 key（建议包含业务 ID），将自动把最近一次有效的选区写入 localStorage，
   * 并在组件重新挂载且 editor 就绪后恢复该位置。
   * 仅需要在特定场景（例如 模组 README 编辑）开启，避免其它实例的额外存取开销。
   */
  persistSelectionKey?: string;
  /**
   * 外部激活标记：当从 false -> true 过渡时（例如切换 Tab 回到该编辑器），
   * 若尚未恢复过或需要再次确保定位，则尝试读取 persistSelectionKey 存储的选区并定位。
   * 不传则不进行“激活触发”恢复，仅依赖首次挂载恢复。
   */
  active?: boolean;
  /**
   * 与 active 联动：仅在本次 active 从 false->true 的过渡阶段执行一次 focus + ensureVisible。
   * 不会持续监听，防止频繁抢占用户光标。
   */
  focusOnActive?: boolean;
  /**
   * 调试：输出选区持久化 / 恢复 / 聚焦 / 滚动相关日志。
   */
  debugSelection?: boolean;
}

// 顶层预加载句柄，避免重复导入
let vditorPromise: Promise<any> | null = null;
// 全局标记避免重复注册
let mentionBlotRegistered = false;
let hrBlotRegistered = false;

function registerMentionBlot(Q: any) {
  if (Q && !mentionBlotRegistered) {
    try {
      const Embed = Q.import("blots/embed");
      class MentionBlot extends Embed {
        static blotName = "mention-span";
        static tagName = "span";
        static className = "ql-mention-span";

        static create(value: any) {
          const node = super.create();
          node.setAttribute("data-label", value?.label || "");
          node.setAttribute("data-category", value?.category || "");
          node.textContent = value?.label || "";
          const cat = value?.category || "";
          const colorMap: Record<string, { bg: string; color: string }> = {
            人物: { bg: "#fef3c7", color: "#92400e" },
            地点: { bg: "#d1fae5", color: "#065f46" },
            物品: { bg: "#e0f2fe", color: "#075985" },
          };
          let bg = "#eef2ff";
          let fg = "#4338ca";
          if (cat && colorMap[cat]) {
            bg = colorMap[cat].bg;
            fg = colorMap[cat].color;
          }
          (node as HTMLElement).style.background = bg;
          (node as HTMLElement).style.padding = "0 4px";
          (node as HTMLElement).style.borderRadius = "4px";
          (node as HTMLElement).style.color = fg;
          (node as HTMLElement).style.fontSize = "0.85em";
          (node as HTMLElement).style.userSelect = "none";
          return node;
        }

        static value(node: HTMLElement) {
          return {
            label: node.getAttribute("data-label") || node.textContent || "",
            category: node.getAttribute("data-category") || "",
          };
        }
      }
      Q.register(MentionBlot);
      mentionBlotRegistered = true;
    }
    catch { /* ignore */ }
  }
  if (Q && !hrBlotRegistered) {
    try {
      const BlockEmbed = Q.import("blots/block/embed");
      class HrBlot extends BlockEmbed {
        static blotName = "hr";
        static tagName = "hr";
        static className = "ql-hr";
        static create() {
          const node = super.create();
          (node as HTMLElement).setAttribute("contenteditable", "false");
          return node;
        }
      }
      Q.register(HrBlot);
      hrBlotRegistered = true;
    }
    catch { /* ignore */ }
  }
}

function preloadVeditor() {
  if (typeof window === "undefined")
    return null;
  if (!vditorPromise) {
    vditorPromise = import("quill").then((mod) => {
      const Q = (mod as any)?.default ?? mod;
      registerMentionBlot(Q);
      return mod;
    });
  }
  return vditorPromise;
}

// 顶层预热：模块加载后尽快预热（空闲时），减少首次打开编辑器的等待
if (typeof window !== "undefined") {
  const ric: ((cb: () => void) => void) | undefined = (window as any).requestIdleCallback;
  if (ric) {
    ric(() => preloadVeditor());
  }
  else {
    // 退化到微小延迟的预加载
    setTimeout(() => preloadVeditor(), 0);
  }
}

// 粗略判断文本是否像 Markdown
function isLikelyMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }
  if (/```/.test(text)) {
    return true;
  }
  if (/^#{1,3}[ \t]+/m.test(text)) {
    return true;
  }
  if (/^[ \t]*[-*][ \t]+/m.test(text)) {
    return true;
  }
  if (/^[ \t]*\d+\.[ \t]+/m.test(text)) {
    return true;
  }
  if (/(\*\*|__|~~).+\1/.test(text)) {
    return true;
  }
  if (/(?:^|\s)_(?!_)\S.*\S_(?:\s|$)/m.test(text)) {
    return true;
  }
  if (/(?:^|\s)\*(?!\*)\S.*\S\*(?:\s|$)/m.test(text)) {
    return true;
  }
  return false;
}

// 使用原生 Selection/Range 计算当前折叠光标相对 wrapper 的位置，用于在 Quill getBounds 不更新时的后备
function computeNativeCaretPos(wrapper: HTMLElement | null, root: HTMLElement | null): { top: number; left: number } | null {
  try {
    if (!wrapper || !root) {
      return null;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return null;
    }
    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      return null;
    }
    let marker: HTMLSpanElement | null = null;
    if (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.childNodes.length === 0) {
      marker = document.createElement("span");
      marker.textContent = "\u200B"; // ZERO WIDTH SPACE (大写转义满足 lint)
      range.insertNode(marker);
      range.setStartAfter(marker);
      range.collapse(true);
    }
    const rect = range.getBoundingClientRect();
    if (marker && marker.parentNode) {
      try {
        marker.parentNode.removeChild(marker);
      }
      catch {
        // ignore

      }
    }
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      return null;
    }
    const wrapRect = wrapper.getBoundingClientRect();
    const top = rect.top - wrapRect.top;
    const left = rect.left - wrapRect.left;
    if (Number.isNaN(top) || Number.isNaN(left)) {
      return null;
    }
    return { top, left: Math.max(0, left) };
  }
  catch {
    return null;
  }
}

export default function QuillEditor({ id, placeholder, onchange, onSpecialKey, onDeleteSpecialKey, persistSelectionKey, active, focusOnActive, debugSelection }: vditorProps) {
  const quillRef = useRef<quill | null>(null);
  // 旧自定义行宽实现已移除（改为 Visual Line Pack）
  // 从上下文获取 stageId 来拉取实体
  let stageIdCtx: number | null = null;
  try {
    const ctx = useModuleContext();
    stageIdCtx = (ctx?.stageId as any) ?? null;
  }
  catch {
    // ignore
  }
  const stageIdNum = typeof stageIdCtx === "number" ? stageIdCtx : null;
  const { data: allEntitiesResp } = useQueryEntitiesQuery(stageIdNum || 0);
  const allEntities = allEntitiesResp?.data || [];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const floatingTbRef = useRef<HTMLDivElement | null>(null);
  // 提供稳定引用，供事件处理器中调用，避免依赖项警告
  const scheduleToolbarUpdateRef = useRef<() => void>(() => { });
  const [tbVisible, setTbVisible] = useState(false);
  const [tbTop, setTbTop] = useState(0);
  const [tbLeft, setTbLeft] = useState(0);
  // 编辑器实例是否已就绪（用于在就绪后再绑定滚动/尺寸监听）
  const [editorReady, setEditorReady] = useState(false);
  // 供组件内任意位置调用的工具栏位置更新函数
  const updateToolbarPosRef = useRef<((idx: number) => void) | null>(null);
  // 用于在下一帧刷新工具栏位置（避免读取到旧的布局）
  const raf1Ref = useRef<number | null>(null);
  const raf2Ref = useRef<number | null>(null);
  // 用于触发函数
  const onChangeRef = useRef(onchange);
  const onDeleteSpecialRef = useRef(onDeleteSpecialKey);
  const initialPlaceholderRef = useRef(placeholder);
  const lastAppliedMarkdownRef = useRef<string | null>(null);
  const applyingExternalRef = useRef(false);
  // 检测是否格式化
  const isFormattedRef = useRef(false);
  // 防重入：在 text-change 中删除空格时避免递归触发
  const handlingSpaceRef = useRef(false);
  // 取消边界即时检测：仅在输入空格时触发行内格式转换
  // 记录监听器，便于卸载
  const textChangeHandlerRef = useRef<((delta: any, oldDelta: any, source: any) => void) | null>(null);
  const selectionChangeHandlerRef = useRef<((range: any) => void) | null>(null);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  // 缓存最新选区，避免在其它逻辑中反复调用 editor.getSelection() 触发滚动
  const lastRangeRef = useRef<any | null>(null);
  // 标记首次挂载恢复是否执行
  const restoredSelectionRef = useRef(false);
  // 安全获取当前选区（不使用 true 强制聚焦），并更新缓存；避免滚动跳跃但保证 WYSIWYG 逻辑拿到最新光标
  const getSafeSelection = useCallback(() => {
    try {
      const editor = quillRef.current as any;
      if (!editor)
        return lastRangeRef.current;
      const sel = editor.getSelection?.(); // 不传 true，避免 ensureCursorVisible
      if (sel && typeof sel.index === "number") {
        lastRangeRef.current = { index: sel.index, length: sel.length || 0 };
      }
      return lastRangeRef.current;
    }
    catch {
      return lastRangeRef.current;
    }
  }, []);
  // 记录鼠标按下前的滚动位置，用于防止点击导致的自动滚动跳跃
  const mouseDownScrollTopRef = useRef<number | null>(null);
  const mouseClickSelectingRef = useRef(false);
  // 硬性滚动锁：一次点击内禁止编辑器把目标行“贴底”或强制滚动
  const lockScrollRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // 选中文本时的横向工具栏（与光标态小方块互斥）
  const selectionTbRef = useRef<HTMLDivElement | null>(null);
  const [selTbVisible, setSelTbVisible] = useState(false);
  const [selTbTop, setSelTbTop] = useState(0);
  const [selTbLeft, setSelTbLeft] = useState(0);
  // 当前格式高亮状态
  const [activeHeader, setActiveHeader] = useState<0 | 1 | 2 | 3>(0);
  const [activeList, setActiveList] = useState<"" | "bullet" | "ordered">("");
  const [activeCodeBlock, setActiveCodeBlock] = useState(false);
  const [activeAlign, setActiveAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [activeInline, setActiveInline] = useState({ bold: false, italic: false, underline: false, strike: false });
  // ===== Mention Hover Preview =====
  const [mentionPreviewVisible, setMentionPreviewVisible] = useState(false);
  const [mentionPreviewData, setMentionPreviewData] = useState<{ category: string; name: string; description?: string; tips?: string } | null>(null);
  const [mentionPreviewPos, setMentionPreviewPos] = useState<{ leftVw: number; topVw: number }>({ leftVw: 0, topVw: 0 });
  const mentionPreviewLockRef = useRef(false);
  // 后续可在 popup UI 中使用这些状态。
  const [mentionActive, setMentionActive] = useState(false); // 是否已进入 mention 模式
  const [mentionStart, setMentionStart] = useState<number | null>(null); // 记录 @ 所在的文档 index
  // ===== Slash Alignment Commands (/center /right /left /justify) =====
  const [slashActive, setSlashActive] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const [slashHighlight, setSlashHighlight] = useState(0);
  const slashStartRef = useRef<number | null>(null); // 记录 '/' 开始位置
  const slashActiveRef = useRef(false);
  // 引入 ref 以便在原生 keydown 捕获阶段使用最新值（避免闭包拿到旧状态）
  const mentionActiveRef = useRef(false);
  const mentionStartRef = useRef<number | null>(null);
  useEffect(() => {
    mentionActiveRef.current = mentionActive;
  }, [mentionActive]);
  useEffect(() => {
    slashActiveRef.current = slashActive;
  }, [slashActive]);
  useEffect(() => {
    mentionStartRef.current = mentionStart;
  }, [mentionStart]);
  // (移除调试) 原 logSlash 已删除
  // 查询字符串（暂未用于 UI，前缀下划线避免未使用 lint 报错）
  const [_mentionQuery, setMentionQuery] = useState(""); // @ 之后的查询字符串（到光标）
  const mentionStageRef = useRef<"category" | "entity" | null>(null); // 分阶段：category -> entity
  const mentionAtInsertedRef = useRef(false); // 本轮 delta 中是否插入了新的 @ （避免重复激活）
  const [mentionPos, setMentionPos] = useState<{ top: number; left: number } | null>(null); // popup 位置
  const [mentionStage, setMentionStage] = useState<"category" | "entity">("category");
  const [mentionHighlight, setMentionHighlight] = useState(0); // 当前高亮候选索引
  // 记录“进入实体阶段后是否输入过字符”，用于判定 Backspace 是否允许回退到分类
  const entityTypedRef = useRef(false);
  // 后端实体映射：根据 entityType 分类
  // 假设: 1=物品? 2=角色(人物) 3=场景(可视作地点) / 4=地点 / 5=其他 —— 依据项目其它文件的使用情况推测
  // 为稳定性：地点优先使用 entityType === 4，如果没有则备用 entityType === 3
  const roleNames = useMemo(() => allEntities.filter((e: any) => e.entityType === 2).map((e: any) => e.name).filter(Boolean), [allEntities]);
  const locationPrimary = useMemo(() => allEntities.filter((e: any) => e.entityType === 4).map((e: any) => e.name).filter(Boolean), [allEntities]);
  const itemNames = useMemo(() => allEntities.filter((e: any) => e.entityType === 1).map((e: any) => e.name).filter(Boolean), [allEntities]);
  const locationNames = locationPrimary;
  const categoriesRef = useRef<string[]>(["人物", "地点", "物品"]); // 保持顺序
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const entitiesRef = useRef<Record<string, string[]>>({
    人物: [] as string[],
    地点: [] as string[],
    物品: [] as string[],
  });
  // 悬停预览：独立 effect
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper)
      return;
    const pxToVw = (px: number) => (px / 1680) * 100;
    const typeMap: Record<string, number> = { 物品: 1, 人物: 2, 地点: 4 };
    const findDescription = (category: string, name: string): string | undefined => {
      const t = typeMap[category];
      if (!t)
        return undefined;
      const found = allEntities.find((e: any) => e?.entityType === t && e?.name === name);
      return found?.entityInfo?.description || found?.entityInfo?.tip || found?.entityInfo?.desc;
    };
    const findTips = (category: string, name: string): string | undefined => {
      const t = typeMap[category];
      if (!t)
        return undefined;
      const found = allEntities.find((e: any) => e?.entityType === t && e?.name === name);
      if (category !== "人物") {
        return found?.entityInfo?.tips;
      }
      else {
        return found?.entityInfo?.act?.kp;
      }
    };
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target)
        return;
      const span = target.closest("span.ql-mention-span") as HTMLElement | null;
      if (!span)
        return;
      const name = span.getAttribute("data-label") || span.textContent || "";
      const category = span.getAttribute("data-category") || "";
      if (!name || !category)
        return;
      const rect = span.getBoundingClientRect();
      const desiredWidthPx = 300;
      const desiredHeightPx = 300;
      const viewportW = window.innerWidth || 0;
      const margin = 8;
      let topPx = rect.top - desiredHeightPx - margin;
      if (topPx < margin)
        topPx = rect.bottom + margin;
      let leftPx = rect.left;
      if (leftPx + desiredWidthPx > viewportW - margin) {
        leftPx = Math.max(margin, viewportW - desiredWidthPx - margin);
      }
      setMentionPreviewPos({ leftVw: pxToVw(leftPx), topVw: pxToVw(topPx) });
      setMentionPreviewData({ category, name, description: findDescription(category, name), tips: findTips(category, name) });
      setMentionPreviewVisible(true);
    };
    const onOut = (e: MouseEvent) => {
      const rel = e.relatedTarget as HTMLElement | null;
      if (rel && rel.closest && rel.closest(".mention-preview")) {
        mentionPreviewLockRef.current = true;
        return;
      }
      if (!mentionPreviewLockRef.current)
        setMentionPreviewVisible(false);
    };
    const onScrollHide = (ev?: Event) => {
      try {
        // 若鼠标当前位于预览框或最近一次进入了预览框（锁定），则忽略滚动关闭
        if (mentionPreviewLockRef.current) {
          return;
        }
        const t = (ev?.target || null) as any;
        const el: Element | null = (t && t instanceof Element) ? (t as Element) : null;
        if (el && el.closest && el.closest(".mention-preview")) {
          return;
        }
      }
      catch { /* ignore */ }
      setMentionPreviewVisible(false);
    };
    wrapper.addEventListener("mouseover", onOver);
    wrapper.addEventListener("mouseout", onOut);
    window.addEventListener("scroll", onScrollHide, true);
    return () => {
      wrapper.removeEventListener("mouseover", onOver);
      wrapper.removeEventListener("mouseout", onOut);
      window.removeEventListener("scroll", onScrollHide, true);
    };
  }, [allEntities]);

  // 同步实体名称到引用（不触发重渲染）
  useEffect(() => {
    try {
      entitiesRef.current = { 人物: roleNames, 地点: locationNames, 物品: itemNames };
    }
    catch { /* ignore */ }
  }, [roleNames, locationNames, itemNames]);
  // 通过 useMemo 派生 filtered，避免在 effect 中 setState 触发 lint 报错
  const filtered = useMemo(() => {
    if (!mentionActive) {
      return [] as string[];
    }
    if (mentionStage === "category") {
      const q = _mentionQuery.trim();
      const cats = categoriesRef.current;
      return q ? cats.filter(c => c && c.includes(q)) : cats;
    }
    if (mentionStage === "entity" && currentCategory) {
      const list = entitiesRef.current[currentCategory] || [];
      const q = _mentionQuery.trim();
      if (!q) {
        return list;
      }
      return list.filter(i => i && i.includes(q));
    }
    return [] as string[];
  }, [mentionActive, mentionStage, currentCategory, _mentionQuery]);
  // filtered 每次变化时重置高亮
  useEffect(() => {
    if (!mentionActive) {
      return;
    }
    // 通过 rAF 延迟，绕过自定义 lint 对 effect 直接 setState 的限制
    const id = requestAnimationFrame(() => {
      try {
        setMentionHighlight(0);
      }
      catch {
        // ignore
      }
    });
    return () => {
      try {
        cancelAnimationFrame(id);
      }
      catch {
        // ignore
      }
    };
  }, [filtered, mentionActive]);

  // 自定义 mention blot：等待 Quill 实例就绪再注册，避免首次 effect 运行时实例未创建导致漏注册
  // 旧的按需注册逻辑已被顶层预加载中的 registerMentionBlot 取代
  useEffect(() => {
    if (editorReady) {
      try {
        const editor = quillRef.current as any;
        const Q = editor?.constructor || (window as any).Quill;
        registerMentionBlot(Q);
      }
      catch {
        // ignore
      }
    }
  }, [editorReady]);

  // 反查实体所属分类
  const getCategoryForEntity = useCallback((label: string): string | null => {
    try {
      const map = entitiesRef.current || {};
      for (const cat of Object.keys(map)) {
        const list = map[cat] || [];
        if (list.includes(label)) {
          return cat;
        }
      }
      return null;
    }
    catch { return null; }
  }, []);

  const insertMentionEntity = useCallback((label: string, categoryOverride?: string | null) => {
    const editor = quillRef.current as any;
    if (!editor || mentionStart == null) {
      return;
    }
    try {
      const sel = lastRangeRef.current;
      if (!sel || typeof sel.index !== "number") {
        return;
      }
      const deleteLen = Math.max(0, sel.index - mentionStart);
      if (deleteLen > 0) {
        editor.deleteText(mentionStart, deleteLen, "user");
      }
      let insertedEmbed = false;
      if (onSpecialKey) {
        onSpecialKey(allEntities.filter((e: StageEntityResponse) => e.name === label));
      }
      try {
        const catForEmbed = (categoryOverride ?? currentCategory ?? "");
        editor.insertEmbed(mentionStart, "mention-span", { label, category: catForEmbed }, "user");
        insertedEmbed = true;
      }
      catch {
        // embed 失败（可能未注册），回退为纯文本 @label
        try {
          editor.insertText(mentionStart, `@${label}`, "user");
        }
        catch {
          // ignore
        }
      }
      try {
        // 无论 embed 还是纯文本，都追加一个空格
        const afterBase = mentionStart + (insertedEmbed ? 1 : (label.length + 1));
        editor.insertText(afterBase, " ", "user");
        editor.setSelection(afterBase + 1, 0, "silent");
      }
      catch {
        // ignore
      }
    }
    catch {
      // ignore
    }
    finally {
      setMentionActive(false);
      setMentionStart(null);
      setMentionQuery("");
      setMentionPos(null);
      setMentionStage("category");
      setCurrentCategory(null);
    }
  }, [mentionStart, currentCategory, getCategoryForEntity]);

  // 监听键盘上下/回车/ESC/Tab（在 mentionActive 时）
  useEffect(() => {
    if (!mentionActive) {
      return;
    }
    const editor = quillRef.current as any;
    const handler = (e: KeyboardEvent) => {
      if (!mentionActive) {
        return;
      }
      // 可回溯：实体阶段且查询为空时，Backspace 回退到“分类选择”，而不是删除 '@'
      if (e.key === "Backspace" && mentionStage === "entity" && ((_mentionQuery || "").length === 0)) {
        // 仅在“进入实体阶段后还未输入过任何字符”的首态允许回退到分类
        if (!entityTypedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setMentionStage("category");
          setCurrentCategory(null);
          setMentionHighlight(0);
          return;
        }
        // 已经输入过（即便后来删空），此时 Backspace 不跨阶段，交给编辑器自行处理
      }
      if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "ArrowDown") {
        setMentionHighlight(h => (filtered.length ? (h + 1) % filtered.length : 0));
      }
      else if (e.key === "ArrowUp") {
        setMentionHighlight(h => (filtered.length ? (h - 1 + filtered.length) % filtered.length : 0));
      }
      else if (e.key === "Escape") {
        setMentionActive(false);
        setMentionStart(null);
        setMentionQuery("");
        setMentionPos(null);
        setMentionStage("category");
        setCurrentCategory(null);
      }
      else if (e.key === "Enter" || e.key === "Tab") {
        if (!filtered.length) {
          return;
        }
        const target = filtered[Math.min(mentionHighlight, filtered.length - 1)];
        if (mentionStage === "category") {
          setCurrentCategory(target);
          setMentionStage("entity");
          setMentionHighlight(0);
          // 进入实体阶段后从空查询开始，便于直接输入实体名过滤
          try {
            setMentionQuery("");
          }
          catch {
            // ignore
          }
          entityTypedRef.current = false;
        }
        else {
          const cat = getCategoryForEntity(target);
          insertMentionEntity(target, cat);
        }
      }
    };
    // 监听编辑器 root
    try {
      editor?.root?.addEventListener("keydown", handler, true);
    }
    catch {
      // ignore
    }
    return () => {
      try {
        editor?.root?.removeEventListener("keydown", handler, true);
      }
      catch {
        // ignore
      }
    };
  }, [mentionActive, filtered, mentionHighlight, mentionStage, insertMentionEntity, _mentionQuery, getCategoryForEntity]);

  // 读取当前选区的格式并刷新高亮
  const refreshActiveFormats = useCallback((): void => {
    try {
      const editor = quillRef.current as any;
      if (!editor) {
        return;
      }
      const sel = lastRangeRef.current;
      if (!sel || typeof sel.index !== "number") {
        setActiveHeader(0);
        setActiveList("");
        setActiveCodeBlock(false);
        setActiveInline({ bold: false, italic: false, underline: false, strike: false });
        return;
      }
      const inlineFmt = editor.getFormat?.(sel.index, sel.length || 0) || {};
      setActiveInline({
        bold: !!inlineFmt.bold,
        italic: !!inlineFmt.italic,
        underline: !!inlineFmt.underline,
        strike: !!inlineFmt.strike,
      });
      const lineInfo = editor.getLine?.(sel.index);
      if (lineInfo && Array.isArray(lineInfo) && lineInfo.length >= 2) {
        const [_line, offset] = lineInfo as [any, number];
        const lineStart = Math.max(0, sel.index - offset);
        const blockFmt = editor.getFormat?.(lineStart, 1) || {};
        const headerLv = Number(blockFmt.header) || 0;
        const listKind = (blockFmt.list || "") as "" | "bullet" | "ordered";
        const inCode = "code-block" in blockFmt;
        setActiveHeader((headerLv === 1 || headerLv === 2 || headerLv === 3) ? headerLv : 0);
        setActiveList(listKind);
        setActiveCodeBlock(!!inCode);
        const alignVal = (blockFmt.align || "left") as "left" | "center" | "right" | "justify";
        setActiveAlign(alignVal || "left");
      }
      else {
        setActiveHeader(0);
        setActiveList("");
        setActiveCodeBlock(false);
      }
    }
    catch {
      // ignore
    }
  }, []);

  // 稳定引用：供 effect/回调中安全调用而不引入额外依赖
  const refreshActiveFormatsRef = useRef<() => void>(() => { });
  useEffect(() => {
    refreshActiveFormatsRef.current = refreshActiveFormats;
  }, [refreshActiveFormats]);

  // 始终保持最新的回调，但不触发实例的重建
  useEffect(() => {
    onChangeRef.current = onchange;
  }, [onchange]);
  useEffect(() => {
    onDeleteSpecialRef.current = onDeleteSpecialKey;
  }, [onDeleteSpecialKey]);

  // 外部点击时关闭菜单（点击菜单或工具栏内部不关闭）
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const menuEl = menuRef.current;
      const tbEl = floatingTbRef.current;
      const target = e.target as Node | null;
      const insideMenu = !!(menuEl && target && menuEl.contains(target));
      const insideToolbar = !!(tbEl && target && tbEl.contains(target));
      if (!insideMenu && !insideToolbar) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [menuOpen]);

  // 根据视口空间决定下拉或上拉，避免菜单显示不全（通过切换 DOM class 实现，避免额外状态更新）
  useEffect(() => {
    if (!menuOpen) {
      const m = menuRef.current;
      if (m) {
        m.classList.remove("drop-up");
      }
      return;
    }
    const compute = () => {
      try {
        const tb = floatingTbRef.current;
        const menu = menuRef.current;
        if (!tb || !menu) {
          return;
        }
        const tbRect = tb.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const spaceBelow = window.innerHeight - tbRect.bottom;
        const need = Math.max(menuRect.height, 0) + 8; // 额外留白
        const dropUp = spaceBelow < need;
        menu.classList.toggle("drop-up", dropUp);
      }
      catch {
        // ignore
      }
    };
    compute();
    const onWin = () => compute();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, { passive: true });
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin);
    };
  }, [menuOpen, tbTop]);

  // 调度在下一帧（或下一帧的下一帧）刷新工具栏位置，确保布局变更已生效
  const scheduleToolbarUpdate = useCallback(() => {
    try {
      if (raf1Ref.current) {
        cancelAnimationFrame(raf1Ref.current);
        raf1Ref.current = null;
      }
      if (raf2Ref.current) {
        cancelAnimationFrame(raf2Ref.current);
        raf2Ref.current = null;
      }
      const editor = quillRef.current as any;
      const el = editor?.root as HTMLElement | null;
      const wrapper = wrapperRef.current as HTMLDivElement | null;
      if (!editor || !el || !wrapper) {
        return;
      }
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          try {
            // 不使用 getSelection(true)，避免在 hover 时隐式聚焦导致页面滚动/跳转到光标位置
            const sel = lastRangeRef.current;
            if (lockScrollRef.current)
              return; // 硬锁期间不定位
            // 若当前并未聚焦且只是 hover，不强制显示定位，直接退出（防止滚动）
            try {
              const rootActive = document.activeElement === (editor as any).root;
              if (!rootActive && !focusRef.current && hoverRef.current && !sel) {
                return; // 悬停但未聚焦且无选区，不触发定位
              }
            }
            catch { /* ignore */ }
            if (sel && typeof sel.index === "number") {
              const rootRect = el.getBoundingClientRect();
              const wrapRect = wrapper.getBoundingClientRect();
              const fmt = editor.getFormat?.(sel.index, sel.length || 0) || {};
              const collapsed = !(sel.length && sel.length > 0);

              // 1) 光标态：小方块工具栏（仅当选区折叠时显示）
              if (collapsed) {
                const bCaret = editor.getBounds?.(sel.index, 0) || { top: 0 };
                // 处理连续退格导致内容高度骤减但 scrollTop 仍保留旧值的情况：
                // 这种情况下 caretTop 会被高估（甚至变为负数被 clamp），造成小方块位置看似不动。
                let effScrollTop = el.scrollTop;
                try {
                  const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
                  if (effScrollTop > maxScrollTop) {
                    el.scrollTop = maxScrollTop;
                    effScrollTop = maxScrollTop;
                  }
                  // 如果内容已不足一屏，强制归零，避免残留滚动偏移
                  if (el.scrollHeight <= el.clientHeight && effScrollTop !== 0) {
                    el.scrollTop = 0;
                    effScrollTop = 0;
                  }
                }
                catch {
                  // ignore
                }
                let caretTop = (rootRect.top + (bCaret.top || 0) - effScrollTop) - wrapRect.top;
                // fallback：如果 caretTop 与上次相同且 scroll 修正后仍未变化，尝试原生 selection
                try {
                  if ((caretTop < 0 || caretTop === tbTop) && wrapper && el) {
                    const nativePos = computeNativeCaretPos(wrapper, el);
                    if (nativePos && Math.abs(nativePos.top - caretTop) > 1) {
                      caretTop = nativePos.top;
                    }
                  }
                }
                catch {
                  // ignore
                }
                // caret position updated
                setTbTop(Math.max(0, caretTop));
                // 计算小方块左侧位置：放到编辑区左外侧
                try {
                  const tbEl = floatingTbRef.current as HTMLDivElement | null;
                  const tbW = tbEl?.offsetWidth || 34;
                  // 默认在容器左外：-width - 8px 间距
                  let nextLeft = -tbW - 8;
                  // 视口兜底：保证距离视口左侧 >= 8px
                  const viewportLeft = wrapRect.left + nextLeft;
                  if (viewportLeft < 8) {
                    nextLeft = Math.max(-tbW - 8, 8 - wrapRect.left);
                  }
                  setTbLeft(nextLeft);
                }
                catch {
                  // ignore
                }
                // 选中态工具栏隐藏
                setSelTbVisible(false);
              }
              // 2) 选中态：横向工具栏（排除代码块）
              else {
                const inCodeBlock = !!("code-block" in fmt);
                if (!inCodeBlock) {
                  const bSel = editor.getBounds?.(sel.index, sel.length) || { top: 0, left: 0, width: 0 };
                  const selTop = (rootRect.top + (bSel.top || 0) - el.scrollTop) - wrapRect.top;
                  const approxWidth = selectionTbRef.current?.offsetWidth || 260;
                  const approxHeight = selectionTbRef.current?.offsetHeight || 34;
                  let left = (rootRect.left + (bSel.left || 0) - wrapRect.left);
                  // 居中于选区
                  const centerShift = Math.max(0, ((bSel as any).width || 0) / 2 - approxWidth / 2);
                  left += centerShift;
                  // 约束在容器范围内
                  const maxLeft = Math.max(0, wrapper.clientWidth - approxWidth - 8);
                  left = Math.max(8, Math.min(left, maxLeft));
                  const top = Math.max(0, selTop - approxHeight - 8);
                  // selection toolbar position updated
                  setSelTbTop(top - 15);
                  setSelTbLeft(left);
                  setSelTbVisible(true);
                }
                else {
                  setSelTbVisible(false);
                }
              }
            }
            else {
              // 无有效选区，隐藏两个工具栏
              setTbVisible(false);
              setSelTbVisible(false);
            }
          }
          catch {
            // ignore
          }
        });
      });
    }
    catch {
      // ignore
    }
  }, []);

  // 将回调存入 ref，供事件回调用
  useEffect(() => {
    scheduleToolbarUpdateRef.current = scheduleToolbarUpdate;
  }, [scheduleToolbarUpdate]);

  // 组件卸载时清理 RAF
  useEffect(() => {
    return () => {
      try {
        if (raf1Ref.current) {
          cancelAnimationFrame(raf1Ref.current);
          raf1Ref.current = null;
        }
        if (raf2Ref.current) {
          cancelAnimationFrame(raf2Ref.current);
          raf2Ref.current = null;
        }
      }
      catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current; // 在 useEffect 内部保存 containerRef 的当前值
    let rootEl: HTMLElement | null = null;
    let onRootKeyDown: ((e: KeyboardEvent) => void) | null = null;
    let onRootKeyUp: ((e: KeyboardEvent) => void) | null = null;
    let onRootMouseUp: ((e: MouseEvent) => void) | null = null;
    let onRootMouseDown: ((e: MouseEvent) => void) | null = null;
    let onRootPaste: ((e: ClipboardEvent) => void) | null = null;
    let onRootCopy: ((e: ClipboardEvent) => void) | null = null;
    let onRootCut: ((e: ClipboardEvent) => void) | null = null;
    // 为可清理的 DOM 事件处理器预留引用（此处不需要 scroll 句柄，滚动监听在独立 effect 中）
    // Enter/换行后用于清理新行块级格式的定时器
    let lineFormatTimer: ReturnType<typeof setTimeout> | null = null;
    // 初次载入占位 Markdown 的复位定时器
    let initMdTimer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      // 动态加载 vditor 以避免首屏阻塞，并利用上方的预加载
      const mod = await preloadVeditor();
      const Q = (mod?.default ?? mod) as any;
      registerMentionBlot(Q);
      if (!Q || quillRef.current || !container) {
        return;
      }
      // 防御：若容器内已存在旧的 Quill DOM（例如严格模式下的首次装载后立即卸载再装载），先清空
      try {
        if (container.firstChild) {
          container.innerHTML = "";
        }
      }
      catch {
        // ignore
      }

      quillRef.current = new Q(container, {
        theme: "snow",
        modules: {
          toolbar: false,
          // 统一以 delta 处理，Clipboard 配置最小化；自定义粘贴在 root paste 事件中完成
          clipboard: {
            matchVisual: false,
          },
          // 启用 Quill 内置撤销/重做栈，避免浏览器原生撤销导致一次性清空
          // userOnly:true 表示仅记录用户触发(source === 'user')的变更，
          // 初始加载/外部导入使用 'api' / 'silent' 不会进入历史，从而 Ctrl+Z 不会回退到“空”状态
          history: {
            delay: 800,
            maxStack: 500,
            userOnly: true,
          },
        },
      });
      const editor = quillRef.current!;
      // 聚焦编辑器，确保键盘事件由编辑器接收
      editor.focus?.();

      // 根据当前选区更新悬浮工具栏位置
      const updateToolbarPosition = (idx: number) => {
        try {
          const root = (editor as any).root as HTMLElement;
          const wrapper = wrapperRef.current as HTMLDivElement | null;
          if (!root || !wrapper) {
            return;
          }
          const b = (editor as any).getBounds?.(idx, 0) || { top: 0 };
          const rootRect = root.getBoundingClientRect();
          const wrapRect = wrapper.getBoundingClientRect();
          const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top;
          // inline toolbar update position
          setTbTop(Math.max(0, top));
          // 计算小方块左侧位置：放到编辑区左外侧
          try {
            const tbEl = floatingTbRef.current as HTMLDivElement | null;
            const tbW = tbEl?.offsetWidth || 34;
            let nextLeft = -tbW - 8;
            const viewportLeft = wrapRect.left + nextLeft;
            if (viewportLeft < 8) {
              nextLeft = Math.max(-tbW - 8, 8 - wrapRect.left);
            }
            setTbLeft(nextLeft);
          }
          catch {
            // ignore
          }
        }
        catch {
          // ignore
        }
      };
      // 暴露给外层使用，便于在 silent setSelection 后手动刷新位置
      updateToolbarPosRef.current = updateToolbarPosition;

      // 载入初始 Markdown（来自 props.placeholder）
      try {
        const md = initialPlaceholderRef.current || "";
        if (md && typeof md === "string") {
          const html = markdownToHtmlWithEntities(md, entitiesRef.current);
          applyingExternalRef.current = true;
          lastAppliedMarkdownRef.current = md;
          // 清空现有内容并插入
          (editor as any).setText?.("");
          (editor as any).clipboard?.dangerouslyPasteHTML?.(0, html, "api");
          // 初始内容插入后清空历史：防止第一步撤销回到完全空白
          try {
            (editor as any).history?.clear?.();
          }
          catch {
            // ignore
          }
          initMdTimer = setTimeout(() => {
            applyingExternalRef.current = false;
          }, 0);
        }
      }
      catch {
        // ignore
      }

      // 文本变更：
      // 1) 同步 HTML 到外部
      // 2) 兜底：若刚插入的是空格，则再跑一遍 detectMarkdown（处理 IME/绑定失效场景）
      // 去抖：在一帧内多次 text-change 仅序列化一次，避免先输出未聚合的普通行、再输出带 ``` 的代码块 Markdown
      let pendingSerialize = false;
      const scheduleSerialize = () => {
        if (pendingSerialize)
          return;
        pendingSerialize = true;
        requestAnimationFrame(() => {
          pendingSerialize = false;
          try {
            const html = (editor as any).root?.innerHTML ?? "";
            // 先还原含 data-origin-raw 的标签源码，再走 html->markdown
            let restoredHtml = html;
            try {
              restoredHtml = restoreRawHtml(html);
            }
            catch { /* ignore restore errors */ }
            const md = htmlToMarkdown(restoredHtml);

            if (md !== lastAppliedMarkdownRef.current) {
              lastAppliedMarkdownRef.current = md;
              onChangeRef.current?.(md);
            }
          }
          catch {
            // ignore
          }
        });
      };

      const onTextChange = (delta: any, _old: any, source: any) => {
        // 在用户输入开始时尝试刷新一次缓存的选区，保证后续 markdown / mention 解析有最新 index
        if (source === "user") {
          getSafeSelection();
        }
        // 1) 同步：将 HTML 转为 Markdown，仅在用户操作时回传，避免外部设置导致回环
        if (!applyingExternalRef.current && source === "user")
          scheduleSerialize();
        // 2) 基于 delta 的 Markdown 检测：仅在用户输入、非重入时处理
        if (handlingSpaceRef.current || source !== "user") {
          return;
        }
        try {
          // 收集本次插入的文本（可能是单字符，也可能是批量，比如粘贴或 IME 上屏）
          let inserted = "";
          // 记录 inserted 字符串中最后一个 @ 的相对位置（用于行首 fallback）
          let lastAtRelative: number | null = null;
          // 记录 inserted 字符串中最后一个 '/' 的相对位置（用于行首 slash 快速检测）
          let lastSlashRelative: number | null = null;
          if (delta && Array.isArray(delta.ops)) {
            for (const op of delta.ops) {
              if (op && typeof op.insert === "string") {
                inserted += op.insert;
                if (op.insert.includes("@")) {
                  mentionAtInsertedRef.current = true;
                  // 记录该 op 内每个 @ 的位置（保留最后一个）
                  const idx = op.insert.lastIndexOf("@");
                  if (idx >= 0) {
                    // 现有 inserted 已包含本 op（含本 op 的文本），relative = inserted.length - (op.insert.length - idx)
                    const relative = inserted.length - (op.insert.length - idx);
                    lastAtRelative = relative;
                  }
                }
                if (op.insert.includes("/")) {
                  const idxS = op.insert.lastIndexOf("/");
                  if (idxS >= 0) {
                    const relativeS = inserted.length - (op.insert.length - idxS);
                    lastSlashRelative = relativeS;
                  }
                }
              }
            }
          }
          // ---- Minimal @ detection (Plan B) ----
          // 新增：检测本次 delta 是否删除了原始的 @ 位置；如果是则立即退出 mention 模式
          if (mentionActiveRef.current && mentionStartRef.current != null && delta && Array.isArray(delta.ops)) {
            try {
              let cursor = 0; // 游标表示当前文档扫描位置（基于 delta 应用前）
              let deletedAtMention = false;
              // mention delta ops removed
              for (const op of delta.ops) {
                if (!op) {
                  continue;
                }
                if (typeof op.retain === "number") {
                  cursor += op.retain;
                }
                if (typeof op.delete === "number") {
                  const delStart = cursor; // 删除段开始位置
                  const delEnd = cursor + op.delete; // (开区间右端)
                  if ((mentionStartRef.current as number) >= delStart && (mentionStartRef.current as number) < delEnd) {
                    deletedAtMention = true;
                  }
                  // delete 不前进 cursor（Quill Delta 语义）
                }
                if (typeof op.insert === "string") {
                  cursor += op.insert.length;
                }
              }
              if (deletedAtMention) {
                setMentionActive(false);
                setMentionStart(null);
                setMentionQuery("");
                mentionStageRef.current = null;
                setMentionPos(null);
                entityTypedRef.current = false;
              }
            }
            catch { /* ignore delta delete parse */ }
          }
          // 仅在本次 delta 新插入了 '@' 且当前未处于 mentionActive 时尝试激活
          if (!mentionActiveRef.current && mentionAtInsertedRef.current) {
            try {
              const selNow = lastRangeRef.current;
              if (selNow && typeof selNow.index === "number" && lastAtRelative != null) {
                // 修复: 去除原先多余的 -1，直接使 globalIdx 指向刚插入的 @ 字符
                let globalIdx = Math.max(0, selNow.index - (inserted.length - lastAtRelative));
                // 校验该位置是否真的是 @；若不是而后一个是 @（IME 合并 / 换行分割），尝试向后纠正
                let ch = "";
                try {
                  ch = editor.getText?.(globalIdx, 1) || "";
                }
                catch { /* ignore */ }
                if (ch !== "@") {
                  try {
                    const nextCh = editor.getText?.(globalIdx + 1, 1) || "";
                    if (nextCh === "@") {
                      globalIdx = globalIdx + 1;
                      ch = "@";
                    }
                  }
                  catch { /* ignore */ }
                }
                // 进一步防御：如果还是不是 @，尝试向前回溯一个（极端合并场景）
                if (ch !== "@" && globalIdx > 0) {
                  try {
                    const prevCh = editor.getText?.(globalIdx - 1, 1) || "";
                    if (prevCh === "@") {
                      globalIdx = globalIdx - 1;
                      ch = "@";
                    }
                  }
                  catch { /* ignore */ }
                }
                if (ch === "@") {
                  try {
                    const b = editor.getBounds?.(globalIdx, 0) || { top: 0, left: 0, height: 0 };
                    const root = (editor as any).root as HTMLElement;
                    const wrap = wrapperRef.current as HTMLDivElement | null;
                    if (root && wrap) {
                      const rootRect = root.getBoundingClientRect();
                      const wrapRect = wrap.getBoundingClientRect();
                      const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top + (b.height || 16);
                      const left = (rootRect.left + (b.left || 0) - wrapRect.left);
                      setMentionPos({ top, left });
                    }
                  }
                  catch { /* ignore */ }
                  setMentionActive(true);
                  mentionStageRef.current = "category";
                  setMentionStage("category");
                  setMentionStart(globalIdx);
                  setMentionQuery("");
                }
              }
            }
            catch { /* ignore overall */ }
            finally {
              mentionAtInsertedRef.current = false;
            }
          }
          else {
            mentionAtInsertedRef.current = false; // 未使用也要复位
          }
          // 若已激活 mention，实时更新 query；若用户退格到 @ 之前或换行，则退出
          if (mentionActiveRef.current) {
            try {
              const selNow = lastRangeRef.current;
              if (!selNow || typeof selNow.index !== "number") {
                setMentionActive(false);
                setMentionStart(null);
                setMentionQuery("");
                mentionStageRef.current = null;
                setMentionPos(null);
                entityTypedRef.current = false;
              }
              else if (mentionStartRef.current != null) {
                if (selNow.index <= (mentionStartRef.current as number)) {
                  // 光标回到了 @ 之前，结束
                  setMentionActive(false);
                  setMentionStart(null);
                  setMentionQuery("");
                  mentionStageRef.current = null;
                  setMentionPos(null);
                  entityTypedRef.current = false;
                }
                else {
                  // 获取 @ 到当前光标之间的文本，不包含 @
                  const slice = editor.getText?.(mentionStartRef.current as number, selNow.index - (mentionStartRef.current as number)) || "";
                  // 若包含换行，说明跨行或换行结束
                  if (/\n/.test(slice)) {
                    setMentionActive(false);
                    setMentionStart(null);
                    setMentionQuery("");
                    mentionStageRef.current = null;
                    setMentionPos(null);
                    entityTypedRef.current = false;
                  }
                  else {
                    const newQ = slice.slice(1);
                    setMentionQuery(newQ); // 去掉开头的 @
                    // 一旦在实体阶段出现非空输入，标记“已输入过”
                    try {
                      if (mentionStageRef.current === "entity" && newQ.length > 0) {
                        entityTypedRef.current = true;
                      }
                    }
                    catch { /* ignore */ }
                    // 更新位置（随 caret 移动）
                    try {
                      const b2 = editor.getBounds?.(selNow.index, 0) || { top: 0, left: 0, height: 0 };
                      const root2 = (editor as any).root as HTMLElement;
                      const wrap2 = wrapperRef.current as HTMLDivElement | null;
                      if (root2 && wrap2) {
                        const rootRect2 = root2.getBoundingClientRect();
                        const wrapRect2 = wrap2.getBoundingClientRect();
                        const top2 = (rootRect2.top + (b2.top || 0) - root2.scrollTop) - wrapRect2.top + (b2.height || 16);
                        const left2 = (rootRect2.left + (b2.left || 0) - wrapRect2.left);
                        setMentionPos({ top: top2, left: left2 });
                      }
                    }
                    catch { /* ignore */ }
                  }
                }
              }
            }
            catch {
              // ignore
            }
          }
          // ---- End minimal @ detection ----
          // 2.a 处理换行：确保新行是普通段落（清除 header/list/code-block）
          if (inserted.includes("\n")) {
            if (lineFormatTimer) {
              clearTimeout(lineFormatTimer);
            }
            lineFormatTimer = setTimeout(() => {
              try {
                // 新增：强制获取最新选区，防止 lastRangeRef 仍指向换行前位置
                try {
                  const freshSel = editor.getSelection?.();
                  if (freshSel && typeof freshSel.index === "number") {
                    lastRangeRef.current = { index: freshSel.index, length: freshSel.length || 0 };
                  }
                }
                catch { /* ignore fresh selection */ }
                const selAfter = lastRangeRef.current;
                if (!selAfter || typeof selAfter.index !== "number") {
                  return;
                }
                const newLineInfo = editor.getLine?.(selAfter.index);
                if (!newLineInfo || !Array.isArray(newLineInfo) || newLineInfo.length < 2) {
                  return;
                }
                const [_nLine, nOffset] = newLineInfo as [any, number];
                const newLineStart = selAfter.index - nOffset;
                // 获取上一行（换行符之前）的格式
                const prevLineTuple = editor.getLine?.(Math.max(0, selAfter.index - 1));
                let prevLineStart = Math.max(0, selAfter.index - 1);
                if (prevLineTuple && Array.isArray(prevLineTuple) && prevLineTuple.length >= 2) {
                  const [_pLine, pOffset] = prevLineTuple as [any, number];
                  prevLineStart = Math.max(0, selAfter.index - 1 - pOffset);
                }
                const prevFormats = editor.getFormat?.(prevLineStart, 1) ?? {};
                const prevInCodeBlock = !!("code-block" in prevFormats);
                if (prevInCodeBlock) {
                  editor.formatLine(newLineStart, 1, "code-block", true, "user");
                }
                else {
                  // 仅作用于新行；不触碰上一行的 header/list 格式，避免误清除
                  editor.formatLine(newLineStart, 1, "header", false, "user");
                  editor.formatLine(newLineStart, 1, "list", false, "user");
                  editor.formatLine(newLineStart, 1, "code-block", false, "user");
                }
                updateToolbarPosRef.current?.(selAfter.index);
              }
              catch {
                // ignore
              }
            }, 0);
          }
          // --- 水平线检测：不需要空格。条件：本次 inserted 含 '-' 且光标所在行（去末尾换行）恰好为 '---'
          if (inserted.includes("-")) {
            try {
              const selLocal = lastRangeRef.current;
              if (selLocal && typeof selLocal.index === "number") {
                const editorInstance = quillRef.current as any;
                const lineInfo = editorInstance.getLine?.(Math.max(0, selLocal.index - 1));
                if (lineInfo && Array.isArray(lineInfo)) {
                  const line = lineInfo[0];
                  const offset = lineInfo[1];
                  const lineStart = (selLocal.index - 1) - offset;
                  const lineText = editorInstance.getText?.(lineStart, line.length()) || "";
                  const pure = lineText.replace(/\n$/, ""); // 去掉行尾换行
                  const fmt = editorInstance.getFormat?.(lineStart, 1) || {};
                  const inCode = !!fmt["code-block"];
                  if (!inCode && pure === "---") {
                    handlingSpaceRef.current = true;
                    try {
                      editorInstance.deleteText(lineStart, line.length(), "user");
                      editorInstance.insertEmbed(lineStart, "hr", true, "user");
                      editorInstance.insertText(lineStart + 1, "\n", "user");
                      editorInstance.setSelection(lineStart + 2, 0, "silent");
                    }
                    finally {
                      handlingSpaceRef.current = false;
                    }
                    refreshActiveFormatsRef.current();
                    scheduleToolbarUpdateRef.current();
                    return; // hr 已处理
                  }
                }
              }
            }
            catch { /* ignore hr detection */ }
          }

          // ---- Slash Command Detection（含基于 delta 的行首快速检测） ----
          try {
            if (!mentionActive) {
              const selNow = lastRangeRef.current;
              if (selNow && typeof selNow.index === "number") {
                const caret = selNow.index;
                // A) 基于 delta 的快速检测：若刚刚插入的 '/' 左侧是行首或换行，则立即弹窗
                if (!slashActiveRef.current && lastSlashRelative != null && inserted.includes("/")) {
                  try {
                    let globalSlashIdx = Math.max(0, selNow.index - (inserted.length - lastSlashRelative));
                    // 验证确实是 '/'
                    let chNow = "";
                    try {
                      chNow = editor.getText?.(globalSlashIdx, 1) || "";
                    }
                    catch {
                      // ignore
                    }
                    if (chNow !== "/" && globalSlashIdx > 0) {
                      // 极端合并场景，尝试校正 +/- 1
                      try {
                        const prevCh2 = editor.getText?.(globalSlashIdx - 1, 1) || "";
                        if (prevCh2 === "/") {
                          globalSlashIdx = globalSlashIdx - 1;
                        }
                      }
                      catch {
                        // ignore
                      }
                    }
                    if (globalSlashIdx >= 0) {
                      const prevC = globalSlashIdx === 0 ? "\n" : (editor.getText?.(globalSlashIdx - 1, 1) || "");
                      if (globalSlashIdx === 0 || prevC === "\n") {
                        slashStartRef.current = globalSlashIdx;
                        setSlashQuery("");
                        const b = editor.getBounds?.(caret, 0) || { top: 0, left: 0, height: 0 };
                        const root = (editor as any).root as HTMLElement;
                        const wrap = wrapperRef.current;
                        if (root && wrap) {
                          const rootRect = root.getBoundingClientRect();
                          const wrapRect = wrap.getBoundingClientRect();
                          const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top + (b.height || 16);
                          const left = (rootRect.left + (b.left || 0) - wrapRect.left);
                          setSlashPos({ top, left });
                        }
                        setSlashHighlight(0);
                        setSlashActive(true);
                      }
                    }
                  }
                  catch { /* ignore slash delta quick */ }
                }
                // 1) 即时触发：检测本次 inserted 中的新 '/'
                if (inserted.includes("/")) {
                  const prevIdx = caret - 1;
                  if (prevIdx >= 0) {
                    const ch = editor.getText?.(prevIdx, 1) || "";
                    if (ch === "/") {
                      const leftChar = prevIdx - 1 >= 0 ? (editor.getText?.(prevIdx - 1, 1) || "") : "";
                      if (prevIdx === 0 || leftChar === "\n" || /\s/.test(leftChar) || /[^0-9a-z]/i.test(leftChar)) {
                        slashStartRef.current = prevIdx;
                        setSlashQuery("");
                        const b = editor.getBounds?.(caret, 0) || { top: 0, left: 0, height: 0 };
                        const root = (editor as any).root as HTMLElement;
                        const wrap = wrapperRef.current;
                        if (root && wrap) {
                          const rootRect = root.getBoundingClientRect();
                          const wrapRect = wrap.getBoundingClientRect();
                          const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top + (b.height || 16);
                          const left = (rootRect.left + (b.left || 0) - wrapRect.left);
                          setSlashPos({ top, left });
                        }
                        setSlashHighlight(0);
                        setSlashActive(true);
                        // immediate slash activation (debug logs removed)
                      }
                    }
                  }
                }
                // 2) 行前缀兜底扫描（用于删除或移动光标后仍保留 '/...'）
                let scanStart = Math.max(0, caret - 1);
                const maxBack = 300;
                let steps = 0;
                while (scanStart > 0 && steps < maxBack) {
                  const ch = editor.getText?.(scanStart - 1, 1) || "";
                  if (ch === "\n") {
                    break;
                  }
                  scanStart -= 1;
                  steps += 1;
                }
                const leftLen = caret - scanStart;
                const lineLeft = editor.getText?.(scanStart, leftLen) || "";
                // 放宽规则：定位到“最后一个且其前一字符不是字母数字”的 '/'
                let slashRel = -1;
                for (let i = lineLeft.length - 1; i >= 0; i -= 1) {
                  if (lineLeft[i] === "/") {
                    const prev = i - 1 >= 0 ? lineLeft[i - 1] : "\n";
                    if (!/[0-9a-z]/i.test(prev)) {
                      slashRel = i;
                      break;
                    }
                  }
                }
                if (slashRel >= 0) {
                  const after = lineLeft.slice(slashRel + 1);
                  const globalSlash = scanStart + slashRel;
                  // 若当前还未记录 start 或 start 改变（例如用户在行中间删除重新形成）更新之
                  if (slashStartRef.current !== globalSlash) {
                    slashStartRef.current = globalSlash;
                    if (!slashActiveRef.current) {
                      setSlashActive(true);
                      setSlashHighlight(0);
                      // fallback slash activation (debug logs removed)
                    }
                  }
                  // 更新 query
                  const qLower = after.toLowerCase();
                  if (qLower !== slashQuery) {
                    setSlashQuery(qLower);
                    // slash query update (debug logs removed)
                  }
                  // 更新位置
                  try {
                    const b = editor.getBounds?.(caret, 0) || { top: 0, left: 0, height: 0 };
                    const root = (editor as any).root as HTMLElement;
                    const wrap = wrapperRef.current;
                    if (root && wrap) {
                      const rootRect = root.getBoundingClientRect();
                      const wrapRect = wrap.getBoundingClientRect();
                      const top = (rootRect.top + (b.top || 0) - root.scrollTop) - wrapRect.top + (b.height || 16);
                      const left = (rootRect.left + (b.left || 0) - wrapRect.left);
                      setSlashPos({ top, left });
                    }
                  }
                  catch { /* ignore */ }
                }
                else if (slashActiveRef.current) {
                  // 找不到合格的 '/'
                  // close slash popup: fallback pattern miss
                  setSlashActive(false);
                  setSlashQuery("");
                  setSlashPos(null);
                  slashStartRef.current = null;
                }
                // 3) 细化关闭：segment 结构破坏或光标回退
                if (slashActiveRef.current && slashStartRef.current != null) {
                  const startIdx = slashStartRef.current;
                  if (caret <= startIdx) {
                    // close slash popup: caret moved before '/'
                    setSlashActive(false);
                    setSlashQuery("");
                    setSlashPos(null);
                    slashStartRef.current = null;
                  }
                  else {
                    const seg = editor.getText?.(startIdx, caret - startIdx) || "";
                    if (!/^\/[a-z]*$/i.test(seg)) {
                      // close slash popup: segment invalid
                      setSlashActive(false);
                      setSlashQuery("");
                      setSlashPos(null);
                      slashStartRef.current = null;
                    }
                  }
                }
              }
            }
          }
          catch { /* ignore hybrid slash */ }

          // 以下仍然保留原逻辑：仅在输入空格时尝试行内/块级检测
          const endsWithSpace = /[\u0020\u00A0\u2007\u3000]$/.test(inserted);
          if (!endsWithSpace) {
            return;
          }

          const sel = lastRangeRef.current;
          if (!sel || typeof sel.index !== "number") {
            return;
          }
          // 刚插入的空格位于 sel.index - 1
          if (sel.index <= 0) {
            return;
          }
          const lastChar = editor.getText?.(sel.index - 1, 1);
          // 同时兼容普通空格、NBSP、不间断空格、全角空格
          if (lastChar !== " " && lastChar !== "\u00A0" && lastChar !== "\u2007" && lastChar !== "\u3000") {
            return;
          }
          // 构造一个位于空格位置的 range，供 detectMarkdown 识别前缀
          const fakeRange = { index: sel.index - 1, length: 0 } as any;
          // 先尝试 HTML 标签转换（优先级高于 Markdown），以免被其它规则干扰
          try {
            // 手动向左回溯到上一行起点，避免 getLine 偶发不一致
            let scanStart = sel.index - 1; // 空格位置（刚输入的空格字符）
            const maxBack = 500; // 安全限制，避免极长行性能问题
            let steps = 0;
            while (scanStart > 0 && steps < maxBack) {
              const ch = editor.getText?.(scanStart - 1, 1) || "";
              if (ch === "\n") {
                break;
              }
              scanStart -= 1;
              steps += 1;
            }
            const leftLen = (sel.index - 1) - scanStart; // 不含当前空格
            const lineLeft = leftLen > 0 ? (editor.getText?.(scanStart, leftLen) || "") : "";
            let convertedEarly = convertHtmlTagIfAny(editor, lineLeft, sel.index - 1);
            // 增强2：若未转换且检测到是部分标签（缺少 >），尝试自动补一个 '>' 再转换
            if (!convertedEarly) {
              try {
                // 简化：检测行末是否存在未闭合的 <tag ... 结构（不含 >），不需要捕获内容
                const partial = /<[a-z0-9][^>]*$/i.test(lineLeft);
                if (partial && !lineLeft.endsWith(">")) {
                  // 临时补一个 '>' 进行一次假检测；不直接改文档，只改本地副本
                  const simulated = `${lineLeft}>`;
                  convertedEarly = convertHtmlTagIfAny(editor, simulated, sel.index - 1);
                  if (convertedEarly) {
                    // 如果实际转换成功，说明原来用户少输一个 '>'，我们需要把刚才真实文档中的那一个空格左侧缺失的 '>' 插入再删除，
                    // 但 convertHtmlTagIfAny 内部是基于 simulated raw 定位，会定位失败（因为缺少 '>')。
                    // 解决方式：若发现 simulated 成功而真实失败，再真正往文档补一个 '>' 再重试一次真实转换。
                    // 为避免双重转换，这里判断：如果刚才成功其实已经完成（因为实现中只使用 lineLeft 重构 raw，不依赖真实文档的 '>' 字符），则不动作。
                    // 若未来需要严格一致，可在此补救： editor.insertText(sel.index - 1, '>', 'silent'); 再次调用。
                  }
                }
              }
              catch { /* ignore auto close attempt */ }
            }
            if (convertedEarly) {
              // 重新获取选区并刷新工具栏；然后直接退出后续 Markdown/inline 处理
              try {
                const afterHtmlSel = lastRangeRef.current;
                if (afterHtmlSel && typeof afterHtmlSel.index === "number") {
                  updateToolbarPosRef.current?.(afterHtmlSel.index);
                }
              }
              catch { /* ignore */ }
              refreshActiveFormatsRef.current();
              scheduleToolbarUpdateRef.current();
              return;
            }
            else {
              // 未转换仍打印调试（可移除）
              logHtmlTagIfAny(lineLeft);
            }
          }
          catch { /* ignore html early convert */ }
          // 先尝试块级（行首前缀）
          const blockHandled = detectMarkdown(editor, fakeRange);
          // 再尝试对齐
          const alignmentHandled = !blockHandled && detectAlignment(editor, fakeRange);
          // 若不是块级或对齐，再尝试行内 **/__ /~~ 模式
          const inlineHandled = !blockHandled && !alignmentHandled && detectInlineFormats(editor, sel);

          if (blockHandled || inlineHandled || alignmentHandled) {
            handlingSpaceRef.current = true;
            try {
              // 对块级或对齐触发：删除触发用的空格；对行内触发：保留空格（更符合连续输入）
              if (blockHandled || alignmentHandled) {
                editor.deleteText(sel.index - 1, 1, "user");
              }
              isFormattedRef.current = true;
            }
            finally {
              handlingSpaceRef.current = false;
            }
            // silent 选区变动后手动刷新工具栏位置
            try {
              const afterSel = lastRangeRef.current;
              if (afterSel && typeof afterSel.index === "number") {
                updateToolbarPosRef.current?.(afterSel.index);
              }
            }
            catch {
              // ignore
            }
          }
        }
        catch {
          // ignore
        }

        // 最后：刷新高亮并在本次用户变更后调度一次位置刷新
        refreshActiveFormatsRef.current();
        scheduleToolbarUpdateRef.current();
      };
      editor.on?.("text-change", onTextChange);
      textChangeHandlerRef.current = onTextChange;

      // 选择区变化：仅折叠时显示小方块；有选区时显示横向（非代码块）
      const onSelChange = (range: any) => {
        const root = (editor as any).root as HTMLElement;
        const hasFocus = !!range && document.activeElement === root;
        focusRef.current = hasFocus;
        lastRangeRef.current = range ? { index: range.index, length: range.length || 0 } : null;
        // 持久化：仅存储有效选区（折叠或非折叠都允许）。使用 try 捕获以防隐私模式等报错
        if (persistSelectionKey && range && typeof range.index === "number" && typeof window !== "undefined") {
          try {
            window.localStorage.setItem(persistSelectionKey, JSON.stringify({ i: range.index, l: range.length || 0 }));
          }
          catch { /* ignore */ }
        }
        if (!range) {
          setTbVisible(false);
          setSelTbVisible(false);
          return;
        }
        const collapsed = !(range.length && range.length > 0);
        // 若这是一次鼠标点击触发的折叠选区，并且自动滚动导致 root.scrollTop 大幅变化，则恢复之前的滚动位置，避免“跳到底部”体验
        if (collapsed && mouseClickSelectingRef.current) {
          try {
            const prev = mouseDownScrollTopRef.current;
            if (prev != null) {
              const now = root.scrollTop;
              const diff = Math.abs(now - prev);
              // 只要发生任何非用户滚动（diff>0），立即硬恢复
              if (diff > 0) {
                lockScrollRef.current = true; // 锁定，阻止后续定位参与滚动
                root.scrollTop = prev;
                // 下一帧释放锁
                requestAnimationFrame(() => {
                  lockScrollRef.current = false;
                });
              }
            }
          }
          catch { /* ignore */ }
          finally {
            mouseClickSelectingRef.current = false;
            mouseDownScrollTopRef.current = null;
          }
        }
        // 折叠：仅在 hover 或 focus 时显示小方块；隐藏横向
        setTbVisible(collapsed && (hoverRef.current || hasFocus));
        if (collapsed) {
          if (typeof range.index === "number") {
            updateToolbarPosition(range.index);
          }
          setSelTbVisible(false);
        }
        else {
          // 非折叠：交给统一调度计算横向工具栏位置（并在代码块中隐藏）
          // 先进行一次“同步”定位，立即可见，随后再用 RAF 精修位置
          try {
            const fmt = editor.getFormat?.(range.index, range.length || 0) || {};
            const inCodeBlock = !!("code-block" in fmt);
            if (!inCodeBlock) {
              // 立即计算一次位置（无 RAF）
              const el = (editor as any).root as HTMLElement;
              const wrapper = wrapperRef.current as HTMLDivElement | null;
              if (el && wrapper) {
                const bSel = editor.getBounds?.(range.index, range.length) || { top: 0, left: 0, width: 0 };
                const rootRect = el.getBoundingClientRect();
                const wrapRect = wrapper.getBoundingClientRect();
                let effScrollTop = el.scrollTop;
                try {
                  const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
                  if (effScrollTop > maxScrollTop) {
                    el.scrollTop = maxScrollTop;
                    effScrollTop = maxScrollTop;
                  }
                  if (el.scrollHeight <= el.clientHeight && effScrollTop !== 0) {
                    el.scrollTop = 0;
                    effScrollTop = 0;
                  }
                }
                catch {
                  // ignore
                }
                const selTop = (rootRect.top + (bSel.top || 0) - effScrollTop) - wrapRect.top;
                const approxWidth = selectionTbRef.current?.offsetWidth || 260;
                const approxHeight = selectionTbRef.current?.offsetHeight || 34;
                let left = (rootRect.left + (bSel.left || 0) - wrapRect.left);
                const centerShift = Math.max(0, ((bSel as any).width || 0) / 2 - approxWidth / 2);
                left += centerShift;
                const maxLeft = Math.max(0, wrapper.clientWidth - approxWidth - 8);
                left = Math.max(8, Math.min(left, maxLeft));
                const top = Math.max(0, selTop - approxHeight - 8);
                setSelTbTop(top - 15);
                setSelTbLeft(left);
                setSelTbVisible(true);
              }
            }
            else {
              setSelTbVisible(false);
            }
          }
          catch {
            // ignore
          }
          // RAF 调度进一步稳定位置
          scheduleToolbarUpdateRef.current?.();
        }
        refreshActiveFormatsRef.current();
      };
      editor.on?.("selection-change", onSelChange);
      selectionChangeHandlerRef.current = onSelChange;
      // 不再依赖 space/enter 的键盘绑定，统一在 delta 中识别（稳定于 IME 与不同浏览器事件序）

      // Backspace：统一处理空标题行/空列表项，退化为段落
      editor.keyboard.addBinding(
        { key: "backspace" },
        { collapsed: true, offset: 0 },
        (range: any, context: any) => {
          const removed = removeBlockFormatIfEmpty(editor, range);
          if (removed) {
            try {
              context?.event?.preventDefault?.();
            }
            catch {
              // ignore
            }
            isFormattedRef.current = false;
            // Backspace 触发后调度刷新位置
            scheduleToolbarUpdateRef.current();
            return false;
          }
          return true;
        },
      );
      // 不再使用 Enter 键绑定，改为在 delta 中识别 "\n" 并清除新行格式（见 onTextChange 内）
      // 兜底：在编辑器根节点捕获 Backspace，处理 mention / embed 删除与空块格式清除
      rootEl = editor.root as HTMLElement;
      onRootKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Backspace") {
          return;
        }
        const sel = getSafeSelection();
        if (!sel || sel.length !== 0 || typeof sel.index !== "number") {
          return;
        }

        // 1) mention 起始 @ 被删除 -> 退出 mention 模式
        try {
          const mActive = mentionActiveRef.current;
          const mStart = mentionStartRef.current;
          if (mActive && mStart != null) {
            const deletingIdx = sel.index - 1;
            if (deletingIdx === mStart) {
              const ch = deletingIdx >= 0 ? (editor.getText?.(deletingIdx, 1) || "") : "";
              if (ch === "@") {
                setMentionActive(false);
                setMentionStart(null);
                setMentionQuery("");
                mentionStageRef.current = null;
                setMentionPos(null);
              }
            }
            else {
              const stillAt = editor.getText?.(mStart, 1) || "";
              if (stillAt !== "@") {
                setMentionActive(false);
                setMentionStart(null);
                setMentionQuery("");
                mentionStageRef.current = null;
                setMentionPos(null);
              }
            }
          }
        }
        catch { /* ignore mention backspace */ }

        // 2) 删除紧前的 mention-span embed
        try {
          if (sel.index > 0) {
            const prevIndex = sel.index - 1;
            const leafInfo = (editor as any).getLeaf?.(prevIndex);
            const leaf = leafInfo && leafInfo[0];
            const leafNode: HTMLElement | null = leaf ? leaf.domNode : null;
            if (leafNode && leafNode.classList?.contains("ql-mention-span")) {
              const label = leafNode.getAttribute("data-label") || leafNode.textContent || "";
              const category = leafNode.getAttribute("data-category") || "";
              if (label && onDeleteSpecialRef.current) {
                let type = 0;
                if (category === "物品") {
                  type = 1;
                }
                else if (category === "人物") {
                  type = 2;
                }
                else if (category === "地点") {
                  type = 4;
                }
                const matched = allEntities.find((e: StageEntityResponse) => e.name === label && (type === 0 || e.entityType === type));
                if (matched) {
                  onDeleteSpecialRef.current(matched as StageEntityResponse);
                }
              }
              try {
                editor.deleteText(prevIndex, 1, "user");
                e.preventDefault();
                scheduleToolbarUpdateRef.current?.();
                refreshActiveFormatsRef.current();
                return; // 处理完 embed
              }
              catch { /* ignore delete embed */ }
            }
          }
        }
        catch { /* ignore embed backspace */ }

        // 3) 空块格式清除（标题/列表退化）
        try {
          const removed = removeBlockFormatIfEmpty(editor, sel);
          if (removed) {
            e.preventDefault();
            isFormattedRef.current = false;
            scheduleToolbarUpdateRef.current();
          }
        }
        catch { /* ignore block format */ }
      };
      rootEl?.addEventListener("keydown", onRootKeyDown, true);

      // 鼠标结束选择（mouseup）与键盘选择（keyup）时，立即显示和定位横向工具栏
      onRootMouseUp = () => {
        try {
          const sel = getSafeSelection();
          if (sel && sel.length && sel.length > 0) {
            onSelChange(sel);
          }
        }
        catch {
          // ignore
        }
      };
      rootEl?.addEventListener("mouseup", onRootMouseUp, true);
      onRootMouseDown = () => {
        try {
          const root = (editor as any).root as HTMLElement;
          mouseDownScrollTopRef.current = root?.scrollTop ?? null;
          mouseClickSelectingRef.current = true;
        }
        catch {
          mouseDownScrollTopRef.current = null;
          mouseClickSelectingRef.current = false;
        }
      };
      rootEl?.addEventListener("mousedown", onRootMouseDown, true);

      onRootKeyUp = (_e: KeyboardEvent) => {
        try {
          // 确保拿到最新光标（Quill 对连续输入有时不会触发 selection-change）
          const editor = quillRef.current as any;
          if (editor && editor.getSelection) {
            const curSel = editor.getSelection();
            if (curSel && typeof curSel.index === "number") {
              lastRangeRef.current = { index: curSel.index, length: curSel.length || 0 };
            }
          }
          const lr = getSafeSelection();
          if (!lr)
            return;
          if (lr.length && lr.length > 0) {
            scheduleToolbarUpdateRef.current?.();
            return;
          }
          const wrapper = wrapperRef.current;
          const root = editor.root as HTMLElement;
          const native = computeNativeCaretPos(wrapper, root);
          if (native)
            setTbTop(Math.max(0, native.top));
          scheduleToolbarUpdateRef.current?.();
        }
        catch { /* ignore */ }
      };
      rootEl?.addEventListener("keyup", onRootKeyUp, true);

      // 粘贴：1) 简单 HTML 片段 (<a>/<img>/<span>/<div>) 转为所见即所得并标记 data-origin-raw
      //       2) 若是 Markdown 文本则转为所见即所得
      onRootPaste = (e: ClipboardEvent) => {
        try {
          const htmlRaw = e.clipboardData?.getData("text/html") || "";
          // 优先处理“简单且需要保留超链接/图片”的 HTML 片段：
          // 注意：从 PDF 粘贴往往是 <div><span>文本</span></div> 的层级包装，
          // 如果我们把 span/div 也当做可解析节点，会在父子节点上各取一次 textContent，导致插入两份。
          // 因此这里只在存在 <a> 或 <img> 时走自定义 HTML 分支，其它仅包含 span/div 的情况交给后面的纯文本/Markdown 逻辑处理。
          if (htmlRaw && /<\s*(?:a|img)\b/i.test(htmlRaw) && !/<(?:script|table|tr|td|th|blockquote|h[1-6]|ul|ol|li)\b/i.test(htmlRaw)) {
            const tmp = document.createElement("div");
            tmp.innerHTML = htmlRaw;
            // 仅保留 <a> 与 <img>，避免 span/div 造成父子重复插入
            const allowed = Array.from(tmp.querySelectorAll("a,img"));
            if (allowed.length && allowed.length <= 12) {
              // const editorRoot = (editor as any).root as HTMLElement; // 未使用，保留注释防止再度添加
              const sel = lastRangeRef.current;
              // 覆盖粘贴：若当前存在非折叠选区，先删除选中文本，再在原起点插入
              let insertIndex = sel && typeof sel.index === "number" ? sel.index : (editor.getLength?.() ?? 0);
              if (sel && typeof sel.index === "number" && sel.length && sel.length > 0) {
                try {
                  editor.deleteText(sel.index, sel.length, "user");
                  insertIndex = sel.index; // 删除后插入点仍为原起点
                  editor.setSelection(sel.index, 0, "silent");
                }
                catch { /* ignore deleteText errors */ }
              }
              e.preventDefault();
              // 逐节点插入：a -> 文本+link, img -> image blot
              let cursor = insertIndex;
              const walkInsert = (node: HTMLElement) => {
                const tag = node.tagName.toLowerCase();
                if (tag === "a") {
                  const href = node.getAttribute("href") || "";
                  const text = node.textContent || href || "";
                  if (text) {
                    if (href) {
                      editor.insertText(cursor, text, { link: href }, "user");
                    }
                    else {
                      editor.insertText(cursor, text, {}, "user");
                    }
                    // 标记 data-origin-raw：在刚插入的叶节点上找 <a>
                    try {
                      const leaf = editor.getLeaf?.(cursor);
                      const leafNode = leaf && leaf[0] && leaf[0].domNode as HTMLElement | undefined;
                      let aEl: HTMLElement | null = leafNode || null;
                      if (aEl && aEl.tagName !== "A") {
                        aEl = aEl.closest("a");
                      }
                      if (aEl) {
                        aEl.setAttribute("data-origin-raw", node.outerHTML);
                      }
                    }
                    catch { /* ignore */ }
                    cursor += text.length;
                  }
                }
                else if (tag === "img") {
                  const src = node.getAttribute("src") || "";
                  if (src) {
                    editor.insertEmbed(cursor, "image", src, "user");
                    try {
                      const leaf = editor.getLeaf?.(cursor);
                      const leafNode = leaf && leaf[0] && leaf[0].domNode as HTMLElement | undefined;
                      if (leafNode && leafNode.tagName === "IMG" && !leafNode.getAttribute("data-origin-raw")) {
                        leafNode.setAttribute("data-origin-raw", node.outerHTML);
                      }
                    }
                    catch { /* ignore */ }
                    cursor += 1; // image blot 占位 1
                  }
                }
              };
              allowed.forEach(n => walkInsert(n as HTMLElement));
              // 粘贴结束后将光标放到末尾
              try {
                editor.setSelection(cursor, 0, "silent");
              }
              catch { /* ignore */ }
              scheduleSerialize();
              return;
            }
          }
          // 在代码块中不做 Markdown 转换，保持原样
          const sel = lastRangeRef.current;
          if (sel && typeof sel.index === "number") {
            const fmt = editor.getFormat?.(Math.max(0, sel.index - 1), 1) ?? {};
            if ("code-block" in fmt) {
              return;
            }
          }

          // 优先使用 text/plain；若为空则尝试 text/markdown；再退化为从 text/html 提取纯文本
          let text = e.clipboardData?.getData("text/plain") ?? "";
          if (!text) {
            text = e.clipboardData?.getData("text/markdown") ?? "";
          }
          if (!text) {
            const htmlData = e.clipboardData?.getData("text/html") ?? "";
            if (htmlData) {
              try {
                const tmp = document.createElement("div");
                tmp.innerHTML = htmlData;
                text = tmp.textContent || "";
              }
              catch {
                // ignore html parse errors
              }
            }
          }

          if (!text) {
            return; // 无法解析纯文本，交由默认流程
          }

          // 规范化换行，去除尾部行末空白，但保留行首的 tab（用于 Markdown 代码块等语义）
          // 注意：不要使用 trim()，它会移除开头的 tab，从而破坏缩进/代码块检测。
          const normalized = text.replace(/\r\n/g, "\n").replace(/[\u00A0\u2007\u3000]/g, " ").replace(/[ \t]+$/gm, "");

          // 如果文本包含 tab 并且不是被判断为 Markdown，我们认为用户希望在富文本中保留可见的缩进。
          // HTML 中常规文本会折叠空白，所以在此将 tab 转为若干个不间断空格以保留视觉缩进。
          if (normalized.includes("\t") && !isLikelyMarkdown(normalized)) {
            try {
              const selection = lastRangeRef.current;
              let insertIndex = selection && typeof selection.index === "number" ? selection.index : (editor.getLength?.() ?? 0);
              if (selection && typeof selection.index === "number" && selection.length && selection.length > 0) {
                try {
                  editor.deleteText(selection.index, selection.length, "user");
                  insertIndex = selection.index;
                  editor.setSelection(selection.index, 0, "silent");
                }
                catch { /* ignore delete errors */ }
              }
              e.preventDefault();
              // 将每个 tab 转为 4 个不间断空格，确保在 HTML 渲染中保留
              const replaced = normalized.replace(/\t/g, "\u00A0\u00A0\u00A0\u00A0");
              // 使用 insertText 插入（避免直接 dangerouslyPasteHTML）
              editor.insertText?.(insertIndex, replaced, "user");
              try {
                editor.setSelection(insertIndex + replaced.length, 0, "silent");
              }
              catch {
                /* ignore */
              }
              scheduleSerialize();
              return;
            }
            catch {
              // fallback to default if anything fails
            }
          }

          // 如果看起来像 Markdown，则把 tab 转为 4 个空格再进行 Markdown -> HTML 的转换
          if (!isLikelyMarkdown(normalized)) {
            return; // 交由默认流程处理
          }

          e.preventDefault();
          const mdForConvert = normalized.replace(/\t/g, "    ");
          const html = markdownToHtmlWithEntities(mdForConvert, entitiesRef.current);
          const selection = lastRangeRef.current;
          let insertIndex = selection && typeof selection.index === "number"
            ? selection.index
            : (editor.getLength?.() ?? 0);
          // 覆盖粘贴：如果有选中内容，先删除再插入
          if (selection && typeof selection.index === "number" && selection.length && selection.length > 0) {
            try {
              editor.deleteText(selection.index, selection.length, "user");
              insertIndex = selection.index;
              editor.setSelection(selection.index, 0, "silent");
            }
            catch { /* ignore delete errors */ }
          }
          // 使用 Quill 内置粘贴 HTML（带 index），保证生成正确 Delta 并插入到光标处
          (editor as any).clipboard?.dangerouslyPasteHTML?.(insertIndex, html, "user");
        }
        catch {
          // ignore, fallback to default
        }
      };
      rootEl?.addEventListener("paste", onRootPaste, true);
      // 自定义复制/剪切：将当前选区序列化为带 /t 与 \n 占位的纯文本，保留 HTML
      onRootCopy = (e: ClipboardEvent) => {
        try {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            return; // 让默认行为处理（无选区或空选区）
          }
          const range = sel.getRangeAt(0);
          // 仅处理复制来源于编辑器 root 内部的
          const root = (editor as any).root as HTMLElement;
          if (!root || !root.contains(range.commonAncestorContainer)) {
            return;
          }
          const frag = range.cloneContents();
          const tmp = document.createElement("div");
          tmp.appendChild(frag);
          // 将 fragment 内部每个块级行转为一行文本
          const lines: string[] = [];
          const blockSelector = "p,div,li,pre,h1,h2,h3,h4,h5,h6";
          const blocks = tmp.querySelectorAll(blockSelector);

          const pxToUnits = (px: number) => {
            if (Number.isNaN(px) || px <= 0) {
              return 0;
            }
            return Math.max(0, Math.floor(px / 32)); // 32px ≈ 1 /t 单位
          };
          const detectIndentUnits = (el: HTMLElement): number => {
            // 1) ql-indent-N 类
            let clsUnits = 0;
            el.classList.forEach((c) => {
              const m = c.match(/^ql-indent-(\d+)$/u);
              if (m) {
                const v = Number.parseInt(m[1], 10);
                if (!Number.isNaN(v) && v > clsUnits) {
                  clsUnits = v;
                }
              }
            });
            if (clsUnits > 0) {
              return clsUnits;
            }
            // 2) style text-indent / padding-left / margin-left
            const style = window.getComputedStyle(el);
            const cand = [style.textIndent, style.paddingLeft, style.marginLeft];
            for (const v of cand) {
              if (!v) {
                continue;
              }
              const num = Number.parseFloat(v);
              if (!Number.isNaN(num) && num > 0) {
                const u = pxToUnits(num);
                if (u > 0) {
                  return u;
                }
              }
            }
            // 3) 前导 &nbsp; 统计 (每 4 个视为 1 单位)
            const html = el.innerHTML || "";
            const m = html.match(/^(&nbsp;)+/u);
            if (m) {
              const count = (m[0].match(/&nbsp;/g) || []).length;
              return Math.max(0, Math.floor(count / 4));
            }
            return 0;
          };
          const isCode = (el: HTMLElement) => el.closest("pre, .ql-code-block-container, .ql-code-block") != null || el.classList.contains("ql-code-block");

          if (blocks.length === 0) {
            // 选区可能只是单行文本节点
            const textRaw = tmp.textContent || "";
            if (textRaw) {
              e.preventDefault();
              e.clipboardData?.setData("text/plain", textRaw);
            }
            return;
          }
          blocks.forEach((bEl) => {
            const el = bEl as HTMLElement;
            // 识别空行 <p><br></p>
            // 简化空行检测：允许若干空白与可选的单个 <br> 结构（含属性）-- 避免复杂回溯
            const inner = el.innerHTML || "";
            const isBlank = inner === "" || inner === "<br>" || /^(?:<br\s*\/?>)?$/i.test(inner.trim());
            if (isBlank) {
              lines.push("\\n");
              return;
            }
            let lineText = "";
            if (isCode(el)) {
              // 代码块原样保留 (包含缩进空格)
              lineText = (el.textContent || "").replace(/\r?\n$/, "");
            }
            else {
              const units = detectIndentUnits(el);
              const baseText = (el.textContent || "").replace(/\r?\n/g, "");
              lineText = (units > 0 ? ("/t".repeat(units)) : "") + baseText;
            }
            lines.push(lineText);
          });
          const plain = lines.join("\n");
          // 生成 HTML 片段（保持原复制的结构）
          const htmlOut = tmp.innerHTML;
          e.preventDefault();
          // text/plain: 含 /t 与 \n
          e.clipboardData?.setData("text/plain", plain);
          // text/markdown 可与 plain 同步（下游粘贴时我们已有解析逻辑）
          e.clipboardData?.setData("text/markdown", plain);
          // 保留 HTML 供富文本粘贴
          e.clipboardData?.setData("text/html", htmlOut);
        }
        catch {
          // ignore copy errors
        }
      };
      onRootCut = (e: ClipboardEvent) => {
        if (onRootCopy) {
          onRootCopy(e);
        }
        // 让剪切行为继续删除选区内容（保持默认），所以不 preventDefault 这里
      };
      rootEl?.addEventListener("copy", onRootCopy, true);
      rootEl?.addEventListener("cut", onRootCut, true);
      // 滚动监听改为独立 effect 绑定，见组件底部 useEffect

      // 悬停控制显示
      // 悬停控制由 JSX 上的 onMouseEnter/onMouseLeave 负责
      // 标记编辑器已就绪，触发依赖 editor 的副作用（如 ResizeObserver 绑定）
      setEditorReady(true);
      // 初次刷新一次格式高亮
      refreshActiveFormatsRef.current();
    })();

    // 清理事件监听，避免重复绑定
    return () => {
      // 1) 移除根节点事件
      if (rootEl && onRootKeyDown) {
        try {
          rootEl.removeEventListener("keydown", onRootKeyDown, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootMouseUp) {
        try {
          rootEl.removeEventListener("mouseup", onRootMouseUp, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootMouseDown) {
        try {
          rootEl.removeEventListener("mousedown", onRootMouseDown, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootKeyUp) {
        try {
          rootEl.removeEventListener("keyup", onRootKeyUp, true);
        }
        catch {
          // ignore
        }
      }
      if (rootEl && onRootPaste) {
        try {
          rootEl.removeEventListener("paste", onRootPaste, true);
        }
        catch {
          // ignore
        }
      }
      try {
        if (rootEl && onRootCopy) {
          rootEl.removeEventListener("copy", onRootCopy, true);
        }
      }
      catch { /* ignore */ }
      try {
        if (rootEl && onRootCut) {
          rootEl.removeEventListener("cut", onRootCut, true);
        }
      }
      catch { /* ignore */ }
      // 2) 移除 Quill 事件
      const editor = quillRef.current as any;
      if (editor && textChangeHandlerRef.current) {
        try {
          editor.off?.("text-change", textChangeHandlerRef.current);
        }
        catch {
          // ignore
        }
        textChangeHandlerRef.current = null;
      }
      if (editor && selectionChangeHandlerRef.current) {
        try {
          editor.off?.("selection-change", selectionChangeHandlerRef.current);
        }
        catch {
          // ignore
        }
        selectionChangeHandlerRef.current = null;
      }
      // 清理新行格式定时器
      try {
        if (lineFormatTimer) {
          clearTimeout(lineFormatTimer);
          lineFormatTimer = null;
        }
      }
      catch {
        // ignore
      }
      // 3) 清空容器，避免严格模式下重复装载导致的重复工具栏/DOM
      if (container) {
        try {
          container.innerHTML = "";
        }
        catch {
          // ignore
        }
      }
      // 4) 释放实例引用
      quillRef.current = null;
      // 6) 其他清理
      try {
        // no-op
      }
      catch {
        // ignore
      }
      // 5) 清理初始占位定时器
      try {
        if (initMdTimer) {
          clearTimeout(initMdTimer);
          initMdTimer = null;
        }
      }
      catch {
        // ignore
      }
      // 重置就绪标记
      setEditorReady(false);
    };
  }, []);

  // 独立滚动监听：编辑器滚动时更新工具栏位置
  useEffect(() => {
    const editor = quillRef.current as any;
    const el = editor?.root as HTMLElement | null;
    if (!editor || !el) {
      return;
    }
    const onScroll = () => {
      try {
        scheduleToolbarUpdateRef.current?.();
      }
      catch {
        // ignore
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => {
      try {
        el.removeEventListener("scroll", onScroll);
      }
      catch {
        // ignore
      }
    };
  }, []);

  // 根元素尺寸变化时（例如 Backspace 导致内容高度变化），刷新工具栏位置
  useEffect(() => {
    const editor = quillRef.current as any;
    const el = editor?.root as HTMLElement | null;
    if (!editor || !el || typeof (window as any).ResizeObserver === "undefined") {
      return;
    }
    const ro = new (window as any).ResizeObserver(() => {
      try {
        scheduleToolbarUpdateRef.current?.();
      }
      catch {
        // ignore
      }
    });
    ro.observe(el);
    return () => {
      try {
        ro.disconnect();
      }
      catch {
        // ignore
      }
    };
  }, [editorReady]);

  // 当 placeholder（后端传来的 Markdown）变化时，重置编辑器内容
  useEffect(() => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const md = placeholder || "";
    if (md === lastAppliedMarkdownRef.current) {
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const html = markdownToHtmlWithEntities(md, entitiesRef.current);
      applyingExternalRef.current = true;
      lastAppliedMarkdownRef.current = md;
      editor.setText?.("");
      editor.clipboard?.dangerouslyPasteHTML?.(0, html, "api");
      timeoutId = setTimeout(() => {
        applyingExternalRef.current = false;
      }, 0);
    }
    catch {
      // ignore
    }
    return () => {
      try {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
      catch {
        // ignore
      }
    };
  }, [placeholder]);

  // 封装统一恢复函数
  const attemptRestoreSelection = useCallback(
    (source: string, { focus = false, ensureVisible = false, force = false }: { focus?: boolean; ensureVisible?: boolean; force?: boolean } = {}) => {
      if (!persistSelectionKey || typeof window === "undefined") {
        if (debugSelection) {
          console.log("[QuillDebug] restore-skip", { source, reason: "no-key-or-window" });
        }
        return false;
      }
      const editor = quillRef.current as any;
      if (!editor) {
        if (debugSelection) {
          console.log("[QuillDebug] restore-skip", { source, reason: "no-editor" });
        }
        return false;
      }
      const len = editor.getLength?.() ?? 0;
      if (len <= 1) {
        if (debugSelection) {
          console.log("[QuillDebug] restore-skip", { source, reason: "content-too-short", len });
        }
        return false;
      }
      const existing = editor.getSelection?.();
      if (!force && existing && typeof existing.index === "number") {
        if (debugSelection) {
          console.log("[QuillDebug] restore-skip", { source, reason: "has-selection", existing });
        }
        if (focus) {
          try {
            editor.focus?.();
          }
          catch {
            /* ignore */
          }
        }
        if (ensureVisible && existing) {
          try {
            const b = editor.getBounds?.(existing.index, 0) || { top: 0, height: 24 };
            const root = editor.root as HTMLElement;
            const caretTop = b.top;
            const caretBottom = caretTop + (b.height || 24);
            const viewTop = root.scrollTop;
            const viewBottom = viewTop + root.clientHeight;
            if (caretTop < viewTop) {
              root.scrollTop = Math.max(0, caretTop - 20);
            }
            else if (caretBottom > viewBottom) {
              root.scrollTop = Math.max(0, caretBottom - root.clientHeight + 20);
            }
          }
          catch { /* ignore */ }
        }
        return false;
      }
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(persistSelectionKey);
      }
      catch {
        raw = null;
      }
      if (!raw) {
        if (debugSelection) {
          console.log("[QuillDebug] restore-skip", { source, reason: "no-raw" });
        }
        return false;
      }
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      }
      catch {
        parsed = null;
      }
      if (!parsed || typeof parsed.i !== "number") {
        if (debugSelection) {
          console.log("[QuillDebug] restore-skip", { source, reason: "invalid-parsed", raw });
        }
        return false;
      }
      const idx = Math.min(Math.max(0, parsed.i), Math.max(0, len - 1));
      const selLen = (typeof parsed.l === "number" && parsed.l > 0) ? Math.min(parsed.l, Math.max(0, len - 1 - idx)) : 0;
      try {
        editor.setSelection?.(idx, selLen, "silent");
        lastRangeRef.current = { index: idx, length: selLen };
        if (debugSelection) {
          console.log("[QuillDebug] restore-applied", { source, idx, selLen, len });
        }
      }
      catch {
        if (debugSelection) {
          console.log("[QuillDebug] restore-error-setSelection", { source });
        }
      }
      if (focus) {
        try {
          editor.focus?.();
        }
        catch {
          /* ignore */
        }
      }
      if (ensureVisible) {
        try {
          const b = editor.getBounds?.(idx, 0) || { top: 0, height: 24 };
          const root = editor.root as HTMLElement;
          const caretTop = b.top;
          const caretBottom = caretTop + (b.height || 24);
          const viewTop = root.scrollTop;
          const viewBottom = viewTop + root.clientHeight;
          if (caretTop < viewTop) {
            root.scrollTop = Math.max(0, caretTop - 20);
          }
          else if (caretBottom > viewBottom) {
            root.scrollTop = Math.max(0, caretBottom - root.clientHeight + 20);
          }
        }
        catch { /* ignore */ }
      }
      scheduleToolbarUpdateRef.current?.();
      return true;
    },
    [persistSelectionKey, debugSelection],
  );

  // 首次 editorReady 尝试强制恢复
  useEffect(() => {
    if (!editorReady || restoredSelectionRef.current) {
      return;
    }
    const ok = attemptRestoreSelection("editorReady", { focus: true, ensureVisible: true, force: true });
    if (ok) {
      restoredSelectionRef.current = true;
    }
  }, [editorReady, attemptRestoreSelection]);

  // 每次 active=true 都尝试（不 force，若已有选区仅确保可见 & 聚焦）
  useEffect(() => {
    if (!editorReady || !active) {
      return;
    }
    attemptRestoreSelection("active", { focus: !!focusOnActive, ensureVisible: !!focusOnActive, force: false });
  }, [active, editorReady, focusOnActive, attemptRestoreSelection]);

  // 组件卸载前兜底写入最后一次缓存的选区
  useEffect(() => {
    return () => {
      if (!persistSelectionKey || typeof window === "undefined") {
        return;
      }
      const r = lastRangeRef.current;
      if (r && typeof r.index === "number") {
        try {
          window.localStorage.setItem(persistSelectionKey, JSON.stringify({ i: r.index, l: r.length || 0 }));
          if (debugSelection) {
            console.log("[QuillDebug] unmount save selection", { key: persistSelectionKey, r });
          }
        }
        catch {
          // ignore
        }
      }
    };
  }, [persistSelectionKey, debugSelection]);

  // 覆盖导入（对外使用 window.__QUILL_IMPORT__ 或可通过再封装的 ref 暴露）
  const importBackendContentRef = useRef<((content: string, format?: "markdown" | "html" | "text") => void) | null>(null);
  useEffect(() => {
    importBackendContentRef.current = (content: string, format: "markdown" | "html" | "text" = "html") => {
      const editor = quillRef.current as any;
      if (!editor || !content)
        return;
      const debug = (_msg: string, _extra?: any) => {
        try {
          // import debug removed
        }
        catch { /* ignore */ }
      };
      try {
        debug("start import", { format, rawLength: content.length });
        const html = backendContentToQuillHtml(content, format);
        debug("converted html", { htmlSnippet: html.slice(0, 120) });
        applyingExternalRef.current = true;
        lastAppliedMarkdownRef.current = format === "markdown" ? content : null;
        editor.setText("");
        editor.clipboard?.dangerouslyPasteHTML?.(0, html, "api");
        // 导入外部内容后清空历史，避免一次 Ctrl+Z 清空全部
        try {
          editor.history?.clear?.();
        }
        catch {
          // ignore
        }
        debug("html pasted", { editorLength: editor.getLength?.() });
        const root = editor.root as HTMLElement;
        const spans = Array.from(root.querySelectorAll("span.ql-mention-span[data-label][data-category]"));
        debug("span collected", { spanCount: spans.length });
        spans.forEach((sp, idx) => {
          const label = sp.getAttribute("data-label") || sp.textContent || "";
          const category = sp.getAttribute("data-category") || "";
          if (!label || !category) {
            debug("skip span missing attr", { idx });
            return;
          }
          try {
            // 方式一：直接通过 Quill.getIndex 需要 leaf; 这里用 selection hack 获取 index
            const range = document.createRange();
            range.selectNode(sp);
            const selNative = window.getSelection();
            selNative?.removeAllRanges();
            selNative?.addRange(range);
            const cur = getSafeSelection();
            const index = typeof cur?.index === "number" ? cur.index : null;
            const existingBlot = (window as any).Quill?.find?.(sp);
            if (existingBlot) {
              debug("span already associated with blot?", { idx, label, category });
              return;
            }
            if (index == null) {
              debug("cannot compute index", { idx, label, category });
              return;
            }
            const len = sp.textContent?.length || 0;
            debug("replace span -> blot", { idx, label, category, index, textLen: len });
            editor.deleteText(index, len, "api");
            editor.insertEmbed(index, "mention-span", { label, category }, "api");
          }
          catch (e) {
            debug("replace failed", { idx, label, category, err: (e as any)?.message });
          }
        });
        try {
          editor.setSelection(editor.getLength?.() - 1, 0, "silent");
          debug("setSelection end", { len: editor.getLength?.() });
        }
        catch { /* ignore */ }
      }
      catch { /* ignore overall */ }
      finally {
        // eslint-disable-next-line react-web-api/no-leaked-timeout
        setTimeout(() => {
          applyingExternalRef.current = false;
          debug("import complete", {});
        }, 0);
      }
    };
    if (typeof window !== "undefined") {
      (window as any).__QUILL_IMPORT__ = importBackendContentRef.current;
    }
  }, []);

  // 工具栏动作：块级与行内
  const applyHeader = (level: 1 | 2 | 3) => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = lastRangeRef.current;
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const current = formats.header;
    const target: any = current === level ? false : level;
    editor.formatLine?.(lineStart, 1, "header", target, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
  };

  const toggleList = (kind: "bullet" | "ordered") => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = lastRangeRef.current;
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const current = formats.list;
    const target: any = current === kind ? false : kind;
    editor.formatLine?.(lineStart, 1, "list", target, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
  };

  const toggleInline = (attr: "bold" | "italic" | "underline" | "strike") => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = lastRangeRef.current;
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const fmt = editor.getFormat?.(sel.index, sel.length || 0) ?? {};
    const isOn = !!fmt[attr];
    if (sel.length && sel.length > 0) {
      editor.formatText?.(sel.index, sel.length, attr, !isOn, "user");
    }
    else {
      editor.format?.(attr, !isOn, "user");
    }
    editor.focus?.();
    const cur = lastRangeRef.current;
    if (cur && typeof cur.index === "number") {
      updateToolbarPosRef.current?.(cur.index);
    }
    scheduleToolbarUpdateRef.current();
  };

  const toggleCodeBlock = () => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = lastRangeRef.current;
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const toEnable = !("code-block" in formats);
    editor.formatLine?.(lineStart, 1, "code-block", toEnable, "user");
    if (toEnable) {
      try {
        const curLineInfo = editor.getLine?.(lineStart);
        const curLine = curLineInfo && Array.isArray(curLineInfo) ? curLineInfo[0] : null;
        const curLen = curLine && typeof curLine.length === "function" ? curLine.length() : 0;
        const afterLine = lineStart + Math.max(0, curLen);
        editor.insertText?.(afterLine, "\n", "api");
        editor.formatLine?.(afterLine, 1, "code-block", false, "api");
        editor.setSelection?.(lineStart, 0, "silent");
        updateToolbarPosRef.current?.(lineStart);
        scheduleToolbarUpdateRef.current();
      }
      catch {
        // ignore
      }
    }
    else {
      editor.setSelection?.(lineStart, 0, "silent");
      updateToolbarPosRef.current?.(lineStart);
      scheduleToolbarUpdateRef.current();
    }
  };

  // 对齐：左/中/右/两端（左视作清除 align）
  const setAlign = (val: "left" | "center" | "right" | "justify") => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = lastRangeRef.current;
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    const formats = editor.getFormat?.(lineStart, 1) ?? {};
    const target: any = (val === "left") ? false : val;
    // 在代码块中不应用对齐
    if ("code-block" in formats) {
      return;
    }
    editor.formatLine?.(lineStart, 1, "align", target, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
    refreshActiveFormats();
  };

  // 应用 slash 命令（删除 '/xxx' 并设置对齐）
  const applySlashCommand = useCallback((cmd: string) => {
    const editor = quillRef.current as any;
    const sel = lastRangeRef.current;
    const start = slashStartRef.current;
    if (!editor || !sel || typeof sel.index !== "number" || start == null) {
      return;
    }
    try {
      const deleteLen = Math.max(0, sel.index - start);
      if (deleteLen > 0) {
        editor.deleteText(start, deleteLen, "user");
        editor.setSelection(start, 0, "silent");
      }
      setAlign((cmd as any) === "left" ? "left" : (cmd as any));
    }
    catch { /* ignore */ }
    finally {
      setSlashActive(false);
      setSlashQuery("");
      setSlashPos(null);
      slashStartRef.current = null;
    }
  }, [setAlign]);

  // 键盘导航（与 mention 类似）
  useEffect(() => {
    if (!slashActive) {
      return;
    }
    const editor = quillRef.current as any;
    const options = ["center", "right", "left", "justify"].filter(o => o.startsWith(slashQuery.toLowerCase()));
    const onKey = (e: KeyboardEvent) => {
      if (!slashActiveRef.current) {
        return;
      }
      if (["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === "ArrowDown") {
        setSlashHighlight(h => (options.length ? (h + 1) % options.length : 0));
      }
      else if (e.key === "ArrowUp") {
        setSlashHighlight(h => (options.length ? (h - 1 + options.length) % options.length : 0));
      }
      else if (e.key === "Escape") {
        setSlashActive(false);
        setSlashQuery("");
        setSlashPos(null);
        slashStartRef.current = null;
      }
      else if (e.key === "Enter" || e.key === "Tab") {
        if (options.length) {
          const target = options[Math.min(slashHighlight, options.length - 1)];
          applySlashCommand(target);
        }
        else {
          setSlashActive(false);
          setSlashQuery("");
          setSlashPos(null);
          slashStartRef.current = null;
        }
      }
    };
    try {
      editor?.root?.addEventListener("keydown", onKey, true);
    }
    catch { /* ignore */ }
    return () => {
      try {
        editor?.root?.removeEventListener("keydown", onKey, true);
      }
      catch { /* ignore */ }
    };
  }, [slashActive, slashQuery, slashHighlight, applySlashCommand]);

  // 菜单点击封装，避免内联多语句导致 lint 警告
  const onMenuHeader = (lv: 1 | 2 | 3) => {
    applyHeader(lv);
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuList = (kind: "bullet" | "ordered") => {
    toggleList(kind);
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuCode = () => {
    toggleCodeBlock();
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuAlign = (val: "left" | "center" | "right" | "justify") => {
    setAlign(val);
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuInline = (attr: "bold" | "italic" | "underline" | "strike") => {
    toggleInline(attr);
    refreshActiveFormats();
    setMenuOpen(false);
  };

  // 段落（清除块级格式）与清除行内格式
  const onMenuParagraph = () => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = lastRangeRef.current;
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const lineInfo = editor.getLine?.(sel.index);
    if (!lineInfo || !Array.isArray(lineInfo) || lineInfo.length < 2) {
      return;
    }
    const [_line, offset] = lineInfo as [any, number];
    const lineStart = sel.index - offset;
    editor.formatLine?.(lineStart, 1, "header", false, "user");
    editor.formatLine?.(lineStart, 1, "list", false, "user");
    editor.formatLine?.(lineStart, 1, "code-block", false, "user");
    editor.setSelection?.(lineStart, 0, "silent");
    updateToolbarPosRef.current?.(lineStart);
    scheduleToolbarUpdateRef.current();
    refreshActiveFormats();
    setMenuOpen(false);
  };
  const onMenuClearInline = () => {
    const editor = quillRef.current as any;
    if (!editor) {
      return;
    }
    const sel = getSafeSelection();
    if (!sel || typeof sel.index !== "number") {
      return;
    }
    const len = sel.length || 0;
    if (len > 0) {
      editor.removeFormat?.(sel.index, len, "user");
    }
    const cur = getSafeSelection();
    if (cur && typeof cur.index === "number") {
      updateToolbarPosRef.current?.(cur.index);
    }
    scheduleToolbarUpdateRef.current();
    refreshActiveFormats();
    setMenuOpen(false);
  };

  return (
    <div
      ref={wrapperRef}
      className="ql-outer relative"
      style={{ overflow: "visible" }}
      onMouseEnter={() => {
        hoverRef.current = true;
        // 直接使用缓存的 lastRangeRef，不触发任何 selection 读取
        const lr = lastRangeRef.current;
        setTbVisible(!!lr && lr.length === 0 && (focusRef.current));
        scheduleToolbarUpdateRef.current?.();
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
        if (!focusRef.current) {
          setTbVisible(false);
        }
      }}
    >
      <div
        id={id}
        ref={containerRef}
        className="ql-wrapper text-base-content bg-base-100
        border border-gray-300 rounded-md shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      />
      {/* 光标态：小方块工具栏（始终挂载，按状态显示/隐藏） */}
      <div
        ref={floatingTbRef}
        className={`ql-inline-toolbar ${tbVisible ? "visible" : ""}`}
        style={{ position: "absolute", top: tbTop, left: tbLeft, zIndex: 1000, display: selTbVisible ? "none" : (tbVisible ? "block" : "none") }}
        onMouseDown={e => e.preventDefault()}
      >
        <button
          type="button"
          className="icon-btn"
          title="显示菜单"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          <BaselineAutoAwesomeMotion />
        </button>
        {/* 下拉菜单：位于图标下方（图标样式，网格布局） */}
        <div
          ref={menuRef}
          className={`ql-inline-menu ${menuOpen ? "open" : ""}`}
          role="menu"
          aria-label="插入与样式菜单"
        >
          <InlineMenu
            activeHeader={activeHeader}
            activeList={activeList || null}
            activeCodeBlock={activeCodeBlock}
            activeAlign={activeAlign}
            activeInline={activeInline}
            onMenuParagraph={onMenuParagraph}
            onMenuHeader={onMenuHeader}
            onMenuList={onMenuList}
            onMenuCode={onMenuCode}
            onMenuAlign={onMenuAlign}
            onMenuInline={onMenuInline}
            onMenuClearInline={onMenuClearInline}
          />
        </div>
      </div>

      {/* 选中态：横向工具栏（始终挂载，按状态显示/隐藏） */}
      <div
        ref={selectionTbRef}
        className="ql-selection-toolbar"
        style={{ position: "absolute", top: selTbTop, left: selTbLeft, zIndex: 1000, background: "#fff", border: "1px solid #d1d5db", borderRadius: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: "4px 6px", display: selTbVisible ? "flex" : "none", gap: 4, alignItems: "center" }}
        onMouseDown={e => e.preventDefault()}
      >
        <SelectionMenu
          activeHeader={activeHeader}
          activeList={activeList || null}
          activeCodeBlock={activeCodeBlock}
          activeAlign={activeAlign}
          activeInline={activeInline}
          onMenuParagraph={onMenuParagraph}
          onMenuHeader={onMenuHeader}
          onMenuList={onMenuList}
          onMenuCode={onMenuCode}
          onMenuAlign={onMenuAlign}
          onMenuInline={onMenuInline}
          onMenuClearInline={onMenuClearInline}
        />
      </div>
      {/* Minimal Mention Popup：使用 mentionPos 精确定位（无则回退 tbTop+28/left:8） */}
      {mentionActive && (
        <div
          style={{
            position: "absolute",
            zIndex: 1100,
            top: mentionPos ? mentionPos.top : (tbTop + 28),
            left: mentionPos ? mentionPos.left : 8,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 12,
            color: "#374151",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            minWidth: 140,
          }}
        >
          {/* Header */}
          <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>引用</span>
            {mentionStage === "entity" && currentCategory && (
              <span
                style={{
                  padding: "0 4px",
                  borderRadius: 4,
                  fontSize: 11,
                  background: currentCategory === "人物" ? "#fef3c7" : currentCategory === "地点" ? "#d1fae5" : currentCategory === "物品" ? "#e0f2fe" : "#f3f4f6",
                  color: currentCategory === "人物" ? "#92400e" : currentCategory === "地点" ? "#065f46" : currentCategory === "物品" ? "#075985" : "#374151",
                }}
              >
                {currentCategory}
              </span>
            )}
          </div>
          {/* Candidate list */}
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {mentionStage === "category" && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {filtered.map((cat, i) => {
                  const onEnter = () => {
                    try {
                      setMentionHighlight(i);
                    }
                    catch {
                      // ignore
                    }
                  };
                  const onDown = (e: React.MouseEvent) => {
                    e.preventDefault();
                    try {
                      setCurrentCategory(cat);
                      setMentionStage("entity");
                      setMentionHighlight(0);
                      // 点击选择分类后清空查询，开始实体过滤
                      setMentionQuery("");
                      entityTypedRef.current = false;
                    }
                    catch {
                      // ignore
                    }
                  };
                  return (
                    <li
                      key={cat}
                      onMouseEnter={onEnter}
                      onMouseDown={onDown}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 6px",
                        borderRadius: 4,
                        background: i === mentionHighlight ? (cat === "人物" ? "#fde68a" : cat === "地点" ? "#a7f3d0" : cat === "物品" ? "#bae6fd" : "#f3f4f6") : "transparent",
                        color: i === mentionHighlight ? "#111827" : "#374151",
                        fontWeight: i === mentionHighlight ? 600 : 400,
                        fontSize: 12,
                        transition: "background 80ms",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: cat === "人物" ? "#fbbf24" : cat === "地点" ? "#10b981" : cat === "物品" ? "#0ea5e9" : "#9ca3af",
                          flex: "0 0 auto",
                        }}
                      />
                      <span style={{ lineHeight: 1 }}>{cat}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {mentionStage === "entity" && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {filtered.length === 0 && (
                  <li style={{ padding: "4px 6px", opacity: 0.6 }}>无匹配</li>
                )}
                {filtered.map((ent, i) => {
                  const onEnter = () => {
                    try {
                      setMentionHighlight(i);
                    }
                    catch {
                      // ignore
                    }
                  };
                  const onDown = (e: React.MouseEvent) => {
                    e.preventDefault();
                    try {
                      insertMentionEntity(ent);
                    }
                    catch {
                      // ignore
                    }
                  };
                  return (
                    <li
                      key={ent}
                      onMouseEnter={onEnter}
                      onMouseDown={onDown}
                      style={{
                        cursor: "pointer",
                        padding: "4px 6px",
                        borderRadius: 4,
                        background: i === mentionHighlight ? (currentCategory === "人物" ? "#fde68a" : currentCategory === "地点" ? "#a7f3d0" : currentCategory === "物品" ? "#bae6fd" : "#f3f4f6") : "transparent",
                        color: i === mentionHighlight ? "#111827" : "#374151",
                        fontWeight: i === mentionHighlight ? 600 : 400,
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "background 80ms",
                      }}
                    >
                      <span style={{ flex: "1 1 auto" }}>{ent}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {/* Footer hint */}
          <div style={{ marginTop: 4, fontSize: 10, opacity: 0.5, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>↑↓ 选择</span>
            <span>{mentionStage === "category" ? "Enter 选分类" : "Enter 插入"}</span>
            <span>Esc 取消</span>
          </div>
        </div>
      )}
      {mentionPreviewVisible && mentionPreviewData && (
        <MentionPreview
          category={mentionPreviewData.category}
          name={mentionPreviewData.name}
          description={mentionPreviewData.description}
          tips={mentionPreviewData.tips}
          left={mentionPreviewPos.leftVw}
          top={mentionPreviewPos.topVw}
          onMouseEnter={() => { mentionPreviewLockRef.current = true; }}
          onMouseLeave={() => {
            mentionPreviewLockRef.current = false;
            setMentionPreviewVisible(false);
          }}
          entitiesMap={entitiesRef.current}
        />
      )}
      {/* Slash command popup */}
      {slashActive && !mentionActive && (
        <div
          style={{
            position: "absolute",
            zIndex: 1090,
            top: slashPos ? slashPos.top : (tbTop + 28),
            left: slashPos ? slashPos.left : 8,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 12,
            color: "#374151",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            minWidth: 140,
            maxHeight: 200,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>对齐</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 150, overflowY: "auto" }}>
            {["center", "right", "left", "justify"].filter(o => o.startsWith(slashQuery.toLowerCase())).map((cmd, i) => (
              <li
                key={cmd}
                onMouseEnter={() => setSlashHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySlashCommand(cmd);
                }}
                style={{
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 4,
                  background: i === slashHighlight ? "#dbeafe" : "transparent",
                  color: i === slashHighlight ? "#1e3a8a" : "#374151",
                  fontWeight: i === slashHighlight ? 600 : 400,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 80ms",
                }}
              >
                <span style={{ flex: "1 1 auto" }}>
                  /
                  {cmd}
                </span>
                <span style={{ opacity: 0.55, fontSize: 11 }}>{cmd === "left" ? "左对齐" : cmd === "center" ? "居中" : cmd === "right" ? "右对齐" : "两端对齐"}</span>
              </li>
            ))}
            {["center", "right", "left", "justify"].filter(o => o.startsWith(slashQuery.toLowerCase())).length === 0 && (
              <li style={{ padding: "4px 6px", opacity: 0.6 }}>无匹配命令</li>
            )}
          </ul>
          <div style={{ marginTop: 4, fontSize: 10, opacity: 0.5, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>↑↓ 选择</span>
            <span>Enter 应用</span>
            <span>Esc 取消</span>
          </div>
        </div>
      )}
    </div>
  );
}
