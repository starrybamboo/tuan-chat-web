import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { StoredWorkspaceSelection } from "./workspaceStorageUtils";

import { sanitizeStoredWorkspaceSelection } from "./workspaceStorageUtils";

const WORKSPACE_SELECTION_STORAGE_KEY = "tuanchat.mobile.workspace.selection";
export { sanitizeStoredWorkspaceSelection };
export type { StoredWorkspaceSelection };

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readWorkspaceSelectionRaw() {
  if (isWebStorageAvailable()) {
    return window.localStorage.getItem(WORKSPACE_SELECTION_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(WORKSPACE_SELECTION_STORAGE_KEY);
}

async function writeWorkspaceSelectionRaw(value: string) {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(WORKSPACE_SELECTION_STORAGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(WORKSPACE_SELECTION_STORAGE_KEY, value);
}

export async function readStoredWorkspaceSelection(): Promise<StoredWorkspaceSelection | null> {
  const raw = await readWorkspaceSelectionRaw();
  if (!raw) {
    return null;
  }

  try {
    return sanitizeStoredWorkspaceSelection(JSON.parse(raw));
  }
  catch {
    return null;
  }
}

export async function writeStoredWorkspaceSelection(selection: StoredWorkspaceSelection) {
  const sanitized = sanitizeStoredWorkspaceSelection(selection);
  if (!sanitized) {
    await clearStoredWorkspaceSelection();
    return;
  }

  await writeWorkspaceSelectionRaw(JSON.stringify(sanitized));
}

export async function clearStoredWorkspaceSelection() {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(WORKSPACE_SELECTION_STORAGE_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(WORKSPACE_SELECTION_STORAGE_KEY);
}
