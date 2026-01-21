export function invokeSaveWithTinyRetry(
  save: () => void,
  options?: {
    retries?: number;
    delayMs?: number;
  },
) {
  const retries = options?.retries ?? 3;
  const delayMs = options?.delayMs ?? 30;

  let attempt = 0;

  const run = () => {
    try {
      save();
    }
    catch (err) {
      attempt += 1;
      if (attempt > retries) {
        throw err;
      }
      setTimeout(run, delayMs);
    }
  };

  run();
}
