import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

export function useGoToWorkSpace() {
  const router = useRouter();
  const goToWorkSpace = useCallback(() => {
    router.history.push("/create");
  }, [router]);

  return { goToWorkSpace };
}
