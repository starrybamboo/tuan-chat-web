import type { ToastWindowProps } from "@/components/common/toastWindow/ToastWindowComponent";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";

export type PopWindowProps = ToastWindowProps;

export function PopWindow(props: PopWindowProps) {
  return <ToastWindow {...props} />;
}
