import "../../style.css";

import * as affineModel from "@blocksuite/affine-model";
import * as databaseBlocks from "@blocksuite/affine/blocks/database";
import * as noteBlocks from "@blocksuite/affine/blocks/note";
import * as globalUtils from "@blocksuite/affine/global/utils";
import * as services from "@blocksuite/affine/shared/services";
import * as blockStd from "@blocksuite/affine/std";
import * as store from "@blocksuite/affine/store";
import * as editor from "@blocksuite/integration-test";
import { effects as itEffects } from "@blocksuite/integration-test/effects";
import { getTestStoreManager } from "@blocksuite/integration-test/store";

import { setupEdgelessTemplate } from "../_common/setup.js";
import { effects as commentEffects } from "../comment/effects.js";
import {
  createStarterDocCollection,
  initStarterDocCollection,
} from "./utils/collection.js";
import { mountDefaultDocEditor } from "./utils/setup-playground";
import { prepareTestApp } from "./utils/test";

itEffects();
const storeManager = getTestStoreManager();
commentEffects();

// NOTE: In dev with Vite HMR + React route mounting, we can end up re-importing
// this module while `window.collection` still points to a collection created by
// a previous module instance. Mixing those instances can break DI tokens and
// even Yjs document structure assumptions.
// Tag collections and recreate if the tag mismatches.
const starterInstanceId = `starter-${Math.random().toString(16).slice(2, 10)}`;

let started = false;
let startPromise: Promise<void> | null = null;

let activeAbort: AbortController | null = null;
let activeCollection: any | null = null;

function cleanupPlaygroundDom() {
  // Remove panels appended to body by the playground app.
  const selectors = [
    "attachment-viewer-panel",
    "custom-outline-panel",
    "custom-outline-viewer",
    "custom-frame-panel",
    "left-side-panel",
    "starter-debug-menu",
    "custom-adapter-panel",
  ];
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach(el => el.remove());
  }

  // Clear the app root.
  const app = document.getElementById("app");
  if (app) {
    app.replaceChildren();
    const inspector = document.createElement("div");
    inspector.id = "inspector";
    app.appendChild(inspector);
  }
}

export async function startStarterPlayground() {
  // If a start is already in-flight, return it.
  if (startPromise)
    return startPromise;

  // Cancel any previous run (StrictMode unmount/mount can interleave).
  activeAbort?.abort();
  activeAbort = new AbortController();
  const { signal } = activeAbort;

  startPromise = (async () => {
  // Allow re-mount: clean previous DOM but reuse the existing collection if present.
    cleanupPlaygroundDom();

    if (signal.aborted)
      return;

    setupEdgelessTemplate();

    const params = new URLSearchParams(location.search);
    const bsRoom = params.get("bsRoom");
    const legacyRoom = params.get("room");
    const room
    = bsRoom
      ?? (legacyRoom?.startsWith("playwright") ? legacyRoom : null)
      ?? Math.random().toString(16).slice(2, 8);
    const isE2E = room.startsWith("playwright");

    // Always create a fresh collection per run.
    // In React dev StrictMode, effects are mounted/unmounted twice; reusing a
    // partially-initialized collection can corrupt Yjs state and DI tokens.
    const globalAny = window as any;
    const collection = createStarterDocCollection(storeManager);
    activeCollection = collection;
    (collection as any).__starterInstanceId = starterInstanceId;
    globalAny.collection = collection;

    if (signal.aborted)
      return;

    if (isE2E) {
      Object.defineProperty(window, "$blocksuite", {
        value: Object.freeze({
          store,
          blocks: {
            database: databaseBlocks,
            note: noteBlocks,
          },
          global: { utils: globalUtils },
          services,
          editor,
          blockStd,
          affineModel,
        }),
      });
      await prepareTestApp(collection);

      if (signal.aborted)
        return;

      started = true;
      return;
    }

    await initStarterDocCollection(collection);
    if (signal.aborted)
      return;
    await mountDefaultDocEditor(collection);
    if (signal.aborted)
      return;

    started = true;
  })()
    .catch((err) => {
      started = false;
      throw err;
    })
    .finally(() => {
      startPromise = null;
    });

  return startPromise;
}

export function stopStarterPlayground() {
  // Cancel in-flight initialization.
  activeAbort?.abort();
  activeAbort = null;

  started = false;
  cleanupPlaygroundDom();

  const globalAny = window as any;
  // Drop the global collection reference to avoid reuse across runs.
  if (globalAny.collection) {
    try {
      const c = activeCollection ?? globalAny.collection;
      if (c && typeof c.destroy === "function") {
        c.destroy();
      }
      else if (c && typeof c.stop === "function") {
        c.stop();
      }
    }
    catch {
      // best-effort cleanup
    }
    delete globalAny.collection;
  }
  activeCollection = null;
}
