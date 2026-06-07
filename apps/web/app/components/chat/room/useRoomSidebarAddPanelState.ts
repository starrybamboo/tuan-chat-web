import { useCallback, useState } from "react";

type UseRoomSidebarAddPanelStateResult = {
  addPanelCategoryId: string | null;
  pendingAddRoomId: number | null;
  pendingAddDocId: string;
  setAddPanelCategoryId: (next: string | null) => void;
  setPendingAddRoomId: (next: number | null) => void;
  setPendingAddDocId: (next: string) => void;
  toggleAddPanel: (categoryId: string) => void;
  resetPendingAdds: () => void;
};

export default function useRoomSidebarAddPanelState(): UseRoomSidebarAddPanelStateResult {
  const [addPanelCategoryId, setAddPanelCategoryId] = useState<string | null>(null);
  const [pendingAddRoomId, setPendingAddRoomId] = useState<number | null>(null);
  const [pendingAddDocId, setPendingAddDocId] = useState<string>("");

  const resetPendingAdds = useCallback(() => {
    setPendingAddRoomId(null);
    setPendingAddDocId("");
  }, []);

  const toggleAddPanel = useCallback((categoryId: string) => {
    setAddPanelCategoryId(prev => (prev === categoryId ? null : categoryId));
    resetPendingAdds();
  }, [resetPendingAdds]);

  return {
    addPanelCategoryId,
    pendingAddRoomId,
    pendingAddDocId,
    setAddPanelCategoryId,
    setPendingAddRoomId,
    setPendingAddDocId,
    toggleAddPanel,
    resetPendingAdds,
  };
}
