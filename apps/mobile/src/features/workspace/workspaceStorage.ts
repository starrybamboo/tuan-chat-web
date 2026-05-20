import { Platform } from "react-native";

import type { StoredWorkspaceSelection } from "./workspaceStorageUtils";

import { readMobileKeyValue, removeMobileKeyValue, writeMobileKeyValue } from "../../lib/mobile-key-value-storage";
import { sanitizeStoredWorkspaceSelection } from "./workspaceStorageUtils";

const WORKSPACE_SELECTION_STORAGE_KEY = "tuanchat.mobile.workspace.selection";
export { sanitizeStoredWorkspaceSelection };
export type { StoredWorkspaceSelection };

function isWebStorageAvailable() {
  return Platform.OS === "web" && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

async function readWorkspaceSelectionRaw(): Promise<StoredWorkspaceSelection | null> {
  if (isWebStorageAvailable()) {
    const raw = window.localStorage.getItem(WORKSPACE_SELECTION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredWorkspaceSelection;
    }
    catch {
      return null;
    }
  }

  const entry = await readMobileKeyValue<StoredWorkspaceSelection>(WORKSPACE_SELECTION_STORAGE_KEY);
  return entry?.value ?? null;
}

async function writeWorkspaceSelectionRaw(value: StoredWorkspaceSelection) {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(WORKSPACE_SELECTION_STORAGE_KEY, JSON.stringify(value));
    return;
  }

  await writeMobileKeyValue(WORKSPACE_SELECTION_STORAGE_KEY, value);
}

export async function readStoredWorkspaceSelection(): Promise<StoredWorkspaceSelection | null> {
  return sanitizeStoredWorkspaceSelection(await readWorkspaceSelectionRaw());
}

export async function writeStoredWorkspaceSelection(selection: StoredWorkspaceSelection) {
  const sanitized = sanitizeStoredWorkspaceSelection(selection);
  if (!sanitized) {
    await clearStoredWorkspaceSelection();
    return;
  }

  await writeWorkspaceSelectionRaw(sanitized);
}

export async function clearStoredWorkspaceSelection() {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(WORKSPACE_SELECTION_STORAGE_KEY);
    return;
  }

  await removeMobileKeyValue(WORKSPACE_SELECTION_STORAGE_KEY);
}
