import { useCallback } from "react";
import { useNavigate } from "react-router";

export function useGoToWorkSpace() {
  const navigate = useNavigate();
  const goToWorkSpace = useCallback(() => {
    navigate("/create");
  }, [navigate]);

  return { goToWorkSpace };
}
