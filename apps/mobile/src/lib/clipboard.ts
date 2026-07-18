import * as ExpoClipboard from "expo-clipboard";
import { Platform } from "react-native";

function fallbackCopyText(text: string) {
  if (typeof document === "undefined" || !document.body) {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  }
  finally {
    document.body.removeChild(textarea);
  }
}

export async function setStringAsync(text: string): Promise<boolean> {
  if (Platform.OS !== "web") {
    try {
      await ExpoClipboard.setStringAsync(text);
      return true;
    }
    catch {
      return false;
    }
  }
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    }
    catch {
      return fallbackCopyText(text);
    }
  }
  return fallbackCopyText(text);
}
