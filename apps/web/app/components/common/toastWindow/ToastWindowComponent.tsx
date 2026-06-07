import type { ToastWindowStateProps } from "@/components/common/toastWindow/useToastWindow";
import { useToastWindow } from "@/components/common/toastWindow/useToastWindow";

export type ToastWindowProps = ToastWindowStateProps;

export function ToastWindow(props: ToastWindowProps) {
  useToastWindow(props);
  return null;
}
