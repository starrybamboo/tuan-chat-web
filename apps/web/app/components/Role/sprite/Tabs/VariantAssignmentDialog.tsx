import type { RoleAvatarVariant } from "api";

import { ArrowLeftIcon, CheckIcon, FolderOpenIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/common/Button";
import { selectionClassName, Text } from "@/components/common/DesignLanguage";
import { DialogActions, DialogFrame } from "@/components/common/DialogFrame";
import { FieldGroup, FieldLabel, TextInput } from "@/components/common/FormField";
import { Badge } from "@/components/common/StatusPrimitives";

type VariantAssignmentDialogProps = {
  open: boolean;
  mode: "select" | "create";
  selectedCount: number;
  variants: RoleAvatarVariant[];
  selectedVariantId: number | null;
  allowUnassigned?: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelectVariant: (variantId: number | null) => void;
  onConfirmSelection?: () => void;
  confirmSelectionLabel?: string;
  cancelSelectionLabel?: string;
  onCancelSelection?: () => void;
  onRequestCreate?: () => void;
  onBackToSelection?: () => void;
  initialVariantName?: string;
  onConfirmCreate?: (name: string) => void;
};

function normalizeVariantId(value: unknown): number | null {
  const raw = typeof value === "number" ? value : Number(value);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
}

export function getVariantAssignmentLabel(variant: RoleAvatarVariant) {
  const variantId = normalizeVariantId(variant.variantId);
  return String(variant.name ?? "").trim() || `立绘组 ${variantId ?? ""}`;
}

export function VariantAssignmentDialog({
  open,
  mode,
  selectedCount,
  variants,
  selectedVariantId,
  allowUnassigned = true,
  isPending = false,
  onClose,
  onSelectVariant,
  onConfirmSelection,
  confirmSelectionLabel = "确认",
  cancelSelectionLabel = "取消",
  onCancelSelection = onClose,
  onRequestCreate,
  onBackToSelection,
  initialVariantName = "",
  onConfirmCreate,
}: VariantAssignmentDialogProps) {
  const [draftName, setDraftName] = useState(initialVariantName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedCountLabel = `${selectedCount} 张头像`;
  const trimmedDraftName = draftName.trim();

  useEffect(() => {
    if (mode === "create") {
      setDraftName(initialVariantName);
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [initialVariantName, mode]);

  const handleConfirmCreate = () => {
    if (trimmedDraftName && !isPending) {
      onConfirmCreate?.(trimmedDraftName);
    }
  };

  const dialog = (
    <DialogFrame
      open={open}
      mode="inline"
      onClose={onClose}
      ariaLabel={mode === "create" ? "新建立绘组" : "选择立绘组"}
      closeButtonLabel="关闭立绘组选择"
      rootClassName="z-1300"
      panelClassName="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-base-300 bg-base-100 p-0 text-base-content shadow-xl"
    >
      <div className="flex min-h-control-default items-center gap-3 border-b border-base-300 px-4 py-3 sm:px-5">
        {mode === "create"
          ? <PlusIcon className="size-icon-default shrink-0 text-base-content/60" aria-hidden="true" />
          : <FolderOpenIcon className="size-icon-default shrink-0 text-base-content/60" aria-hidden="true" />}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Text as="h2" variant="componentTitle" wrap="truncate">
            {mode === "create" ? "新建立绘组" : "选择立绘组"}
          </Text>
          <Badge tone="neutral" appearance="soft" className="shrink-0">
            {selectedCountLabel}
          </Badge>
        </div>
        {mode === "select" && onRequestCreate && (
          <Button
            tone="neutral"
            appearance="ghost"
            size="sm"
            className="shrink-0"
            icon={<PlusIcon className="size-icon-compact" weight="bold" aria-hidden="true" />}
            onClick={onRequestCreate}
            disabled={isPending}
            title="新建立绘组"
          >
            新建
          </Button>
        )}
      </div>

      {mode === "create"
        ? (
            <div className="p-4 sm:p-5">
              <FieldGroup className="w-full">
                <FieldLabel htmlFor="sprite-variant-name">立绘组名称</FieldLabel>
                <TextInput
                  id="sprite-variant-name"
                  ref={inputRef}
                  name="sprite_variant_name"
                  value={draftName}
                  autoComplete="off"
                  maxLength={40}
                  placeholder="例如：常服、战斗服"
                  disabled={isPending}
                  onChange={event => setDraftName(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (!event.nativeEvent.isComposing && event.key === "Enter") {
                      event.preventDefault();
                      handleConfirmCreate();
                    }
                  }}
                />
              </FieldGroup>
              <DialogActions
                bordered
                className={`-mx-4 -mb-4 mt-5 px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5 ${onBackToSelection ? "justify-between" : ""}`}
              >
                {onBackToSelection && (
                  <Button
                    tone="neutral"
                    appearance="ghost"
                    size="sm"
                    icon={<ArrowLeftIcon className="size-icon-compact" aria-hidden="true" />}
                    onClick={onBackToSelection}
                    disabled={isPending}
                  >
                    返回选择
                  </Button>
                )}
                <Button
                  tone="primary"
                  appearance="solid"
                  size="sm"
                  loading={isPending}
                  onClick={handleConfirmCreate}
                  disabled={!trimmedDraftName}
                >
                  继续裁剪
                </Button>
              </DialogActions>
            </div>
          )
        : (
            <div>
              <div
                role="group"
                aria-label="选择立绘组"
                aria-busy={isPending || undefined}
                className="max-h-72 space-y-1 overflow-y-auto p-2 sm:p-3"
              >
                {allowUnassigned && (
                  <VariantOption
                    label="未分组"
                    selected={selectedVariantId == null}
                    disabled={isPending}
                    onClick={() => onSelectVariant(null)}
                  />
                )}
                {variants.map((variant) => {
                  const variantId = normalizeVariantId(variant.variantId);
                  if (variantId == null) {
                    return null;
                  }
                  return (
                    <VariantOption
                      key={variantId}
                      label={getVariantAssignmentLabel(variant)}
                      selected={variantId === selectedVariantId}
                      disabled={isPending}
                      onClick={() => onSelectVariant(variantId)}
                    />
                  );
                })}
              </div>
              {onConfirmSelection && (
                <DialogActions bordered className="px-4 py-3 sm:px-5">
                  <Button
                    tone="neutral"
                    appearance="ghost"
                    size="sm"
                    onClick={onCancelSelection}
                    disabled={isPending}
                  >
                    {cancelSelectionLabel}
                  </Button>
                  <Button
                    tone="primary"
                    appearance="solid"
                    size="sm"
                    loading={isPending}
                    onClick={onConfirmSelection}
                  >
                    {confirmSelectionLabel}
                  </Button>
                </DialogActions>
              )}
            </div>
          )}
    </DialogFrame>
  );

  if (typeof document === "undefined") {
    return dialog;
  }

  return createPortal(dialog, document.getElementById("modal-root") ?? document.body);
}

type VariantOptionProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

const selectedVariantOptionClassName = selectionClassName({
  level: "strong",
  className: "hover:bg-info/20",
});

function VariantOption({ label, selected, disabled, onClick }: VariantOptionProps) {
  return (
    <button
      type="button"
      className={`
        flex min-h-hit-default w-full min-w-0 items-center gap-3 rounded-md
        border border-transparent px-3 py-2 text-left
        transition-colors duration-150 motion-reduce:transition-none
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/20
        disabled:pointer-events-none disabled:opacity-45
        ${selected
          ? selectedVariantOptionClassName
          : "text-base-content hover:bg-base-200"}
      `}
      onClick={() => {
        if (!selected) {
          onClick();
        }
      }}
      disabled={disabled}
      aria-pressed={selected}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center ${selected ? "text-info" : "text-base-content/50"}`}>
        <FolderOpenIcon className="size-icon-compact" aria-hidden="true" />
      </span>
      <Text variant="body" wrap="truncate" className="min-w-0 flex-1">
        {label}
      </Text>
      {selected && <CheckIcon className="size-icon-compact shrink-0 text-info" weight="bold" aria-hidden="true" />}
    </button>
  );
}
