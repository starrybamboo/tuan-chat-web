import type { TextRole } from "@/components/common/DesignLanguage";

export const DESIGN_SYSTEM_SECTIONS = [
  { id: "colors", label: "颜色" },
  { id: "foundations", label: "基础尺度" },
  { id: "surfaces", label: "表面与文字" },
  { id: "actions", label: "动作" },
  { id: "forms", label: "表单" },
  { id: "feedback", label: "状态反馈" },
  { id: "navigation", label: "对象与导航" },
] as const;

export const COLOR_TOKEN_GROUPS = [
  {
    label: "Surface",
    tokens: [
      { label: "内容表面", variable: "--color-base-100", foreground: "--color-base-content" },
      { label: "画布表面", variable: "--color-base-200", foreground: "--color-base-content" },
      { label: "分隔表面", variable: "--color-base-300", foreground: "--color-base-content" },
      { label: "正文", variable: "--color-base-content", foreground: "--color-base-100" },
    ],
  },
  {
    label: "Action",
    tokens: [
      { label: "主要动作", variable: "--color-primary", foreground: "--color-primary-content" },
      { label: "次级动作", variable: "--color-secondary", foreground: "--color-secondary-content" },
      {
        label: "强调",
        variable: "--color-accent",
        foreground: "--color-accent-content",
        alias: "--color-success",
      },
      { label: "中性", variable: "--color-neutral", foreground: "--color-neutral-content" },
    ],
  },
  {
    label: "Status",
    tokens: [
      { label: "信息 / 选中", variable: "--color-info", foreground: "--color-info-content" },
      { label: "成功", variable: "--color-success", foreground: "--color-success-content" },
      { label: "警告", variable: "--color-warning", foreground: "--color-warning-content" },
      { label: "危险 / 错误", variable: "--color-error", foreground: "--color-error-content" },
    ],
  },
] as const;

export const TYPOGRAPHY_SPECIMENS: ReadonlyArray<{
  label: string;
  role: TextRole;
  token: string;
  sample: string;
}> = [
  { label: "页面标题", role: "pageTitle", token: "--text-page-title", sample: "角色档案与团剧工作台" },
  { label: "区块标题", role: "sectionTitle", token: "--text-section-title", sample: "最近更新的剧目" },
  { label: "组件标题", role: "componentTitle", token: "--text-component-title", sample: "场景设置" },
  { label: "正文", role: "body", token: "--text-body", sample: "在共享空间里整理角色、线索与演出记录。" },
  { label: "标签", role: "label", token: "text-body / medium", sample: "公开范围" },
  { label: "辅助文字", role: "supporting", token: "--text-supporting", sample: "最后保存于 14:32" },
  { label: "数据", role: "data", token: "text-supporting / tabular", sample: "12,480 / 18,000" },
  { label: "代码", role: "code", token: "font-mono / supporting", sample: "--color-info" },
];

export const DENSITY_SPECIMENS = [
  { label: "紧凑控件", token: "--spacing-control-compact", value: "2rem", className: "h-control-compact" },
  { label: "默认控件", token: "--spacing-control-default", value: "2.5rem", className: "h-control-default" },
  { label: "紧凑热区", token: "--spacing-hit-compact", value: "2rem", className: "h-hit-compact" },
  { label: "默认热区", token: "--spacing-hit-default", value: "2.75rem", className: "h-hit-default" },
] as const;

export const MOTION_SPECIMENS = [
  { label: "Fast", token: "--duration-fast", value: "150ms", className: "duration-150" },
  { label: "Base", token: "--duration-base", value: "200ms", className: "duration-200" },
  { label: "Slow", token: "--duration-slow", value: "300ms", className: "duration-300" },
  { label: "Slower", token: "--duration-slower", value: "500ms", className: "duration-500" },
] as const;
