export function handleAtMentionInputMouseDown({
  closeDialog,
  showDialog,
}: {
  closeDialog: () => void;
  showDialog: boolean;
}): boolean {
  if (showDialog) {
    closeDialog();
  }
  return false;
}
