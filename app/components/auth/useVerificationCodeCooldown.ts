import { useEffect, useState } from "react";

const DEFAULT_COOLDOWN_SECONDS = 60;

export function useVerificationCodeCooldown(initialSeconds = DEFAULT_COOLDOWN_SECONDS) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRemainingSeconds(prev => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  const startCooldown = () => {
    setRemainingSeconds(initialSeconds);
  };

  return {
    remainingSeconds,
    isCoolingDown: remainingSeconds > 0,
    startCooldown,
  };
}
