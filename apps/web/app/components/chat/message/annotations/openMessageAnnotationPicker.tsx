import AnnotationPicker from "@/components/chat/message/annotations/AnnotationPicker";
import toastWindow from "@/components/common/toastWindow/toastWindow";

type OpenMessageAnnotationPickerParams = {
  initialSelected?: string[];
  messageType?: number | null;
  onChange?: (next: string[]) => void;
}

export function openMessageAnnotationPicker({
  initialSelected = [],
  messageType,
  onChange,
}: OpenMessageAnnotationPickerParams) {
  return toastWindow(
    close => (
      <AnnotationPicker
        initialSelected={initialSelected}
        messageType={messageType}
        onChange={onChange}
        onClose={close}
      />
    ),
    { disableScroll: true },
  );
}
