import { useCallback } from "react";
import { useAppNavigate as useNavigate } from "@/utils/navigation";

export function useGoToWorkSpace() {
  const navigate = useNavigate();
  const goToWorkSpace = useCallback(() => {
    navigate("/create");
  }, [navigate]);

  return { goToWorkSpace };
}
