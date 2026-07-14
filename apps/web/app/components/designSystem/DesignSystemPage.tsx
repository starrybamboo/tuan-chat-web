import type { ReactNode } from "react";

import {
  ArrowRightIcon,
  CheckIcon,
  DotsThreeIcon,
  FloppyDiskIcon,
  PaletteIcon,
  TrashIcon,
  UserIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { ControlGroup } from "@/components/common/ControlGroup";
import { Surface, Text, textLinkClassName } from "@/components/common/DesignLanguage";
import { DialogActions, DialogFrame } from "@/components/common/DialogFrame";
import { Disclosure } from "@/components/common/Disclosure";
import {
  Checkbox,
  ChoiceField,
  ColorInput,
  FileInput,
  FormField,
  Radio,
  RangeInput,
  SelectInput,
  Switch,
  TextArea,
  TextInput,
} from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
import { DropdownMenu, MenuItem } from "@/components/common/MenuPopover";
import { StateView } from "@/components/common/StateView";
import {
  Badge,
  CountBadge,
  InlineAlert,
  LoadingIndicator,
  ProgressBar,
  Skeleton,
  StatusIndicator,
  Tag,
} from "@/components/common/StatusPrimitives";
import { Tabs } from "@/components/common/Tabs";
import {
  COLOR_TOKEN_GROUPS,
  DENSITY_SPECIMENS,
  DESIGN_SYSTEM_SECTIONS,
  MOTION_SPECIMENS,
  TYPOGRAPHY_SPECIMENS,
} from "@/components/designSystem/designSystemCatalog";

type PreviewTab = "components" | "tokens" | "a11y";

const PREVIEW_TABS = [
  { value: "components", label: "组件" },
  { value: "tokens", label: "Token" },
  { value: "a11y", label: "可访问性", disabled: true },
] as const;

function TokenCode({ children }: { children: ReactNode }) {
  return <code className="font-mono text-supporting text-base-content/55">{children}</code>;
}

function SectionHeading({ id, title, eyebrow }: { id: string; title: string; eyebrow: string }) {
  return (
    <div className="mb-5 flex scroll-mt-32 items-end justify-between gap-4" id={id}>
      <div>
        <Text as="div" variant="data" className="mb-1 uppercase tracking-[0.16em] text-info">{eyebrow}</Text>
        <Text as="h2" variant="sectionTitle" id={`${id}-heading`}>{title}</Text>
      </div>
      <TokenCode>#{id}</TokenCode>
    </div>
  );
}

function SpecimenSection({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="py-10 sm:py-14" aria-labelledby={`${id}-heading`}>
      <SectionHeading id={id} title={title} eyebrow={eyebrow} />
      <div className="border-t border-base-300">{children}</div>
    </section>
  );
}

function SpecimenRow({
  label,
  token,
  children,
}: {
  label: string;
  token?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-base-300 py-5 md:grid-cols-[minmax(9rem,0.28fr)_1fr] md:gap-8">
      <div className="flex items-baseline justify-between gap-3 md:block">
        <Text as="h3" variant="componentTitle">{label}</Text>
        {token ? <TokenCode>{token}</TokenCode> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ColorSpecimens() {
  return (
    <SpecimenSection id="colors" title="语义颜色" eyebrow="01 · COLOR CONTRACT">
      {COLOR_TOKEN_GROUPS.map(group => (
        <SpecimenRow key={group.label} label={group.label}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {group.tokens.map(token => (
              <figure key={token.variable} className="min-w-0">
                <div
                  className="flex h-24 items-end rounded-md border border-base-content/10 p-3"
                  style={{ backgroundColor: `var(${token.variable})`, color: `var(${token.foreground})` }}
                >
                  <figcaption className="text-sm font-semibold">{token.label}</figcaption>
                </div>
                <TokenCode>
                  {token.variable}
                  {"alias" in token ? ` → ${token.alias}` : null}
                </TokenCode>
              </figure>
            ))}
          </div>
        </SpecimenRow>
      ))}
    </SpecimenSection>
  );
}

function FoundationSpecimens() {
  return (
    <SpecimenSection id="foundations" title="密度、圆角与动效" eyebrow="02 · FOUNDATION">
      <SpecimenRow label="控件与热区" token="compact / default">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {DENSITY_SPECIMENS.map(item => (
            <div key={item.token} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className={`${item.className} flex items-center rounded-md bg-info/10 px-3 text-sm text-info`}>
                {item.label}
              </div>
              <TokenCode>{item.value}</TokenCode>
            </div>
          ))}
        </div>
      </SpecimenRow>
      <SpecimenRow label="图标尺度" token="icon-compact / icon-default">
        <div className="flex flex-wrap items-end gap-8">
          <div className="space-y-2 text-center">
            <CheckIcon className="mx-auto size-icon-compact text-info" weight="bold" />
            <TokenCode>1rem</TokenCode>
          </div>
          <div className="space-y-2 text-center">
            <CheckIcon className="mx-auto size-icon-default text-info" weight="bold" />
            <TokenCode>1.25rem</TokenCode>
          </div>
        </div>
      </SpecimenRow>
      <SpecimenRow label="圆角" token="rounded-*">
        <div className="flex flex-wrap gap-5">
          {[
            ["none", "rounded-none"],
            ["sm", "rounded-sm"],
            ["md", "rounded-md"],
            ["lg", "rounded-lg"],
            ["full", "rounded-full"],
          ].map(([label, className]) => (
            <div key={label} className="space-y-2 text-center">
              <div className={`size-16 border border-info/30 bg-info/10 ${className}`} />
              <TokenCode>{label}</TokenCode>
            </div>
          ))}
        </div>
      </SpecimenRow>
      <SpecimenRow label="层级" token="shadow-*">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["内容", "shadow-none"],
            ["抬升", "shadow-md"],
            ["浮层", "shadow-xl"],
          ].map(([label, className]) => (
            <Surface key={label} level="content" className={`flex h-24 items-center justify-center ${className}`}>
              <Text variant="label">{label}</Text>
            </Surface>
          ))}
        </div>
      </SpecimenRow>
      <SpecimenRow label="动效时长" token="duration + ease-emphasized">
        <div className="grid gap-3 sm:grid-cols-2">
          {MOTION_SPECIMENS.map(item => (
            <div key={item.token} className="group flex items-center gap-3 rounded-md border border-base-300 p-3">
              <span className={`size-3 rounded-full bg-info transition-transform ease-emphasized group-hover:translate-x-5 ${item.className}`} />
              <span className="min-w-14 text-sm font-medium">{item.label}</span>
              <TokenCode>{item.value}</TokenCode>
            </div>
          ))}
        </div>
      </SpecimenRow>
    </SpecimenSection>
  );
}

function SurfaceAndTypeSpecimens() {
  return (
    <SpecimenSection id="surfaces" title="表面与文字角色" eyebrow="03 · HIERARCHY">
      <SpecimenRow label="表面层级" token="Surface">
        <Surface level="canvas" className="grid gap-4 p-4 sm:grid-cols-3">
          <Surface level="content" className="flex min-h-28 items-center justify-center p-4">
            <Text variant="label">Content</Text>
          </Surface>
          <Surface level="inset" className="flex min-h-28 items-center justify-center p-4">
            <Text variant="label">Inset</Text>
          </Surface>
          <Surface level="floating" className="flex min-h-28 items-center justify-center p-4">
            <Text variant="label">Floating</Text>
          </Surface>
        </Surface>
      </SpecimenRow>
      <SpecimenRow label="文字角色" token="Text">
        <div className="divide-y divide-base-300">
          {TYPOGRAPHY_SPECIMENS.map(item => (
            <div key={item.role} className="grid gap-2 py-4 sm:grid-cols-[8rem_1fr_auto] sm:items-baseline">
              <Text variant="supporting">{item.label}</Text>
              <Text variant={item.role}>{item.sample}</Text>
              <TokenCode>{item.token}</TokenCode>
            </div>
          ))}
        </div>
      </SpecimenRow>
    </SpecimenSection>
  );
}

function ActionSpecimens() {
  return (
    <SpecimenSection id="actions" title="动作层级" eyebrow="04 · ACTION">
      <SpecimenRow label="按钮语义" token="Button / variant">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon={<FloppyDiskIcon weight="regular" />}>保存更改</Button>
          <Button variant="outline">次级操作</Button>
          <Button variant="ghost">轻量操作</Button>
          <Button variant="success">确认完成</Button>
          <Button variant="warning">检查风险</Button>
          <Button variant="error" icon={<TrashIcon weight="regular" />}>删除</Button>
          <Button variant="errorOutline">危险次级</Button>
        </div>
      </SpecimenRow>
      <SpecimenRow label="密度与形状" token="compact / default">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline">紧凑</Button>
          <Button size="md" variant="outline">默认</Button>
          <IconButton size="sm" icon={<DotsThreeIcon weight="bold" />} label="更多操作" variant="outline" />
          <IconButton icon={<ArrowRightIcon weight="bold" />} label="下一步" variant="primary" />
        </div>
      </SpecimenRow>
      <SpecimenRow label="系统状态" token="loading / disabled">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" loading>正在保存</Button>
          <Button variant="outline" disabled>暂不可用</Button>
          <ControlGroup>
            <Button variant="outline">左侧</Button>
            <Button variant="outline">中间</Button>
            <Button variant="outline">右侧</Button>
          </ControlGroup>
        </div>
      </SpecimenRow>
    </SpecimenSection>
  );
}

function FormSpecimens() {
  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("public");
  const [enabled, setEnabled] = useState(true);
  const [rangeValue, setRangeValue] = useState(64);

  return (
    <SpecimenSection id="forms" title="输入与选择" eyebrow="05 · FORM">
      <SpecimenRow label="文本字段" token="FormField">
        <div className="grid gap-5 lg:grid-cols-2">
          <FormField id="ds-title" label="角色名称" description="1–24 个字符" required>
            {controlProps => <TextInput {...controlProps} defaultValue="阿斯特拉" />}
          </FormField>
          <FormField id="ds-invalid" label="规则标识" error="标识已被使用">
            {controlProps => <TextInput {...controlProps} defaultValue="astra" />}
          </FormField>
          <FormField id="ds-summary" label="角色简介" labelAdornment="120 字以内">
            {controlProps => <TextArea {...controlProps} defaultValue="来自雾港的记录者。" />}
          </FormField>
        </div>
      </SpecimenRow>
      <SpecimenRow label="浮层选择" token="SelectInput / Listbox">
        <div className="max-w-sm">
          <FormField id="ds-select" label="可见范围">
            {controlProps => (
              <SelectInput {...controlProps} defaultValue="space">
                <option value="private">仅自己</option>
                <option value="space">当前空间</option>
                <option value="public">公开</option>
              </SelectInput>
            )}
          </FormField>
        </div>
      </SpecimenRow>
      <SpecimenRow label="布尔与单选" token="ChoiceField">
        <div className="grid gap-3 lg:grid-cols-3">
          <ChoiceField id="ds-checkbox" label="接受协作编辑" description="复选框">
            {controlProps => (
              <Checkbox
                {...controlProps}
                checked={checked}
                onChange={event => setChecked(event.currentTarget.checked)}
              />
            )}
          </ChoiceField>
          <div>
            <ChoiceField id="ds-radio-public" label="公开" description="单选框">
              {controlProps => (
                <Radio
                  {...controlProps}
                  name="ds-visibility"
                  value="public"
                  checked={radioValue === "public"}
                  onChange={event => setRadioValue(event.currentTarget.value)}
                />
              )}
            </ChoiceField>
            <ChoiceField id="ds-radio-private" label="私密">
              {controlProps => (
                <Radio
                  {...controlProps}
                  name="ds-visibility"
                  value="private"
                  checked={radioValue === "private"}
                  onChange={event => setRadioValue(event.currentTarget.value)}
                />
              )}
            </ChoiceField>
          </div>
          <ChoiceField id="ds-switch" label="自动保存" description="开关">
            {controlProps => (
              <Switch
                {...controlProps}
                checked={enabled}
                onChange={event => setEnabled(event.currentTarget.checked)}
              />
            )}
          </ChoiceField>
        </div>
      </SpecimenRow>
      <SpecimenRow label="范围与文件" token="RangeInput / FileInput">
        <div className="grid gap-6 lg:grid-cols-2">
          <FormField id="ds-range" label="界面密度" labelAdornment={`${rangeValue}%`}>
            {controlProps => (
              <RangeInput
                {...controlProps}
                min={0}
                max={100}
                value={rangeValue}
                onChange={event => setRangeValue(event.currentTarget.valueAsNumber)}
              />
            )}
          </FormField>
          <FormField id="ds-file" label="角色立绘">
            {controlProps => <FileInput {...controlProps} accept="image/*" />}
          </FormField>
          <FormField id="ds-color" label="地图网格色">
            {controlProps => <ColorInput {...controlProps} defaultValue="#2979ff" />}
          </FormField>
          <FormField id="ds-disabled" label="只读状态">
            {controlProps => <TextInput {...controlProps} value="系统生成" readOnly />}
          </FormField>
        </div>
      </SpecimenRow>
    </SpecimenSection>
  );
}

function FeedbackSpecimens() {
  const [hasCreatedItem, setHasCreatedItem] = useState(false);

  return (
    <SpecimenSection id="feedback" title="状态与反馈" eyebrow="06 · FEEDBACK">
      <SpecimenRow label="状态标记" token="Badge / CountBadge / Tag">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>中性</Badge>
          <Badge tone="info">信息</Badge>
          <Badge tone="success">成功</Badge>
          <Badge tone="warning">警告</Badge>
          <Badge tone="error">错误</Badge>
          <Badge tone="info" appearance="outline">描边</Badge>
          <Badge tone="success" appearance="ghost">轻量</Badge>
          <CountBadge>12</CountBadge>
          <Tag>线索</Tag>
          <Tag selected>已选标签</Tag>
        </div>
      </SpecimenRow>
      <SpecimenRow label="就地反馈" token="InlineAlert">
        <div className="grid gap-3 lg:grid-cols-2">
          <InlineAlert tone="info" icon={<PaletteIcon className="size-icon-default" />}>颜色与动作语义保持稳定。</InlineAlert>
          <InlineAlert tone="success" icon={<CheckIcon className="size-icon-default" />}>更改已保存。</InlineAlert>
          <InlineAlert tone="warning" icon={<WarningCircleIcon className="size-icon-default" />}>当前内容仍有未发布修改。</InlineAlert>
          <InlineAlert tone="error" icon={<WarningCircleIcon className="size-icon-default" />}>保存失败，请检查网络状态。</InlineAlert>
        </div>
      </SpecimenRow>
      <SpecimenRow label="进度与加载" token="ProgressBar / LoadingIndicator">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <ProgressBar value={72} label="信息进度" />
            <ProgressBar value={72} tone="success" label="成功进度" />
            <ProgressBar value={72} tone="warning" label="警告进度" />
            <ProgressBar value={72} tone="error" label="错误进度" />
          </div>
          <div className="flex items-center gap-6">
            <LoadingIndicator size="compact" />
            <LoadingIndicator />
            <LoadingIndicator size="large" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </SpecimenRow>
      <SpecimenRow label="区域状态" token="StateView">
        <Surface level="inset">
          {hasCreatedItem
            ? (
                <StateView
                  kind="custom"
                  tone="success"
                  compact
                  icon={<CheckIcon className="size-8" weight="regular" />}
                  title="剧目已创建"
                />
              )
            : (
                <StateView
                  kind="empty"
                  compact
                  title="暂无剧目"
                  description="创建剧目后会显示在这里。"
                  actionLabel="创建剧目"
                  onAction={() => setHasCreatedItem(true)}
                />
              )}
        </Surface>
      </SpecimenRow>
    </SpecimenSection>
  );
}

function NavigationSpecimens() {
  const [tab, setTab] = useState<PreviewTab>("components");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SpecimenSection id="navigation" title="对象、导航与浮层" eyebrow="07 · COMPOSITION">
      <SpecimenRow label="对象身份" token="Avatar / StatusIndicator">
        <div className="flex flex-wrap items-center gap-6">
          <Avatar size={8}><span className="flex size-full items-center justify-center bg-info/10 text-sm font-semibold text-info">星</span></Avatar>
          <Avatar size={12} rounded={false}><span className="flex size-full items-center justify-center bg-success/10 text-success"><UserIcon className="size-icon-default" /></span></Avatar>
          <StatusIndicator indicator={<CountBadge>3</CountBadge>}>
            <Avatar size={14}><span className="flex size-full items-center justify-center bg-warning/10 font-semibold text-warning">团</span></Avatar>
          </StatusIndicator>
        </div>
      </SpecimenRow>
      <SpecimenRow label="页签" token="Tabs">
        <div className="space-y-4">
          <Tabs value={tab} options={PREVIEW_TABS} onValueChange={setTab} ariaLabel="Design System 示例页签" />
          <Text variant="supporting">当前页签：{tab}</Text>
        </div>
      </SpecimenRow>
      <SpecimenRow label="操作菜单" token="DropdownMenu">
        <DropdownMenu
          ariaLabel="示例操作"
          trigger={<Button variant="outline" icon={<DotsThreeIcon weight="bold" />}>打开菜单</Button>}
        >
          <MenuItem icon={<CheckIcon />}>设为当前项</MenuItem>
          <MenuItem icon={<TrashIcon />} tone="danger">删除项目</MenuItem>
        </DropdownMenu>
      </SpecimenRow>
      <SpecimenRow label="折叠区域" token="Disclosure">
        <Disclosure title="高级选项" className="max-w-xl">
          <Text variant="body">这里承载与当前表单上下文连续的高级配置。</Text>
        </Disclosure>
      </SpecimenRow>
      <SpecimenRow label="对话框" token="DialogFrame">
        <Button variant="primary" onClick={() => setDialogOpen(true)}>打开对话框</Button>
        <DialogFrame open={dialogOpen} onClose={() => setDialogOpen(false)} ariaLabel="原语预览对话框">
          <Text as="h2" variant="sectionTitle">确认发布</Text>
          <Text as="p" variant="body" className="mt-3 text-base-content/70">发布后，当前空间的成员都能看到这次更新。</Text>
          <DialogActions className="mt-6">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>确认发布</Button>
          </DialogActions>
        </DialogFrame>
      </SpecimenRow>
    </SpecimenSection>
  );
}

/** 开发环境的 Web 端 token 与公共原语视觉合约页。 */
export function DesignSystemPage() {
  return (
    <main
      data-design-system-page="true"
      className="min-h-full bg-base-200 text-base-content"
    >
      <div className="grid h-1.5 grid-cols-4" aria-hidden="true">
        <span className="bg-info" />
        <span className="bg-success" />
        <span className="bg-warning" />
        <span className="bg-error" />
      </div>
      <header className="sticky top-0 z-20 border-b border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="info" appearance="outline">DEV</Badge>
              <Text variant="data">WEB · VISUAL CONTRACT</Text>
            </div>
            <Text as="h1" variant="pageTitle" className="truncate">Design System</Text>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8" aria-label="页面区块">
          {DESIGN_SYSTEM_SECTIONS.map(section => (
            <a key={section.id} href={`#${section.id}`} className={textLinkClassName("shrink-0 text-sm font-medium")}>
              {section.label}
            </a>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ColorSpecimens />
        <FoundationSpecimens />
        <SurfaceAndTypeSpecimens />
        <ActionSpecimens />
        <FormSpecimens />
        <FeedbackSpecimens />
        <NavigationSpecimens />
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-base-300 py-8">
          <Text variant="supporting">Source · app.css + components/common</Text>
          <TokenCode>DEV ONLY</TokenCode>
        </footer>
      </div>
    </main>
  );
}
