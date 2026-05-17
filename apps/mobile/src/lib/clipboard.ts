import { Platform } from "react-native";

export async function setStringAsync(text: string): Promise<boolean> {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // On native without expo-clipboard, silently fail
  return false;
}
