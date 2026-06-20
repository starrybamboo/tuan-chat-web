import AnnotationPicker from "@/components/chat/message/annotations/AnnotationPicker";
import toastWindow from "@/components/common/toastWindow/toastWindow";

type OpenMessageAnnotationPickerParams = {
  initialSelected?: string[];
  onChange?: (next: string[]) => void;
}

export function openMessageAnnotationPicker({
  initialSelected = [],
  onChange,
}: OpenMessageAnnotationPickerParams) {
  return toastWindow(
    close => (
      <AnnotationPicker
        initialSelected={initialSelected}
        onChange={onChange}
        onClose={close}
      />
    ),
    { disableScroll: true },
  );
}
