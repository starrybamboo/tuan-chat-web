export function isBlocksuiteDebugEnabled(): boolean {
  if (!(import.meta as any)?.env?.DEV)
    return false;

  try {
    const g = globalThis as any;
    if (g?.__TC_BLOCKSUITE_DEBUG === true)
      return true;
  }
  catch {
    // ignore
  }

  try {
    if (typeof localStorage === "undefined")
      return false;
    return localStorage.getItem("tc:blocksuite:debug") === "1";
  }
  catch {
    return false;
  }
}

