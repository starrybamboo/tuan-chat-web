import { loadChatHistoryDb } from "@/components/chat/infra/localDb/chatHistoryDbLoader";

import type { GalPatchProposal, GalPatchProposalSummary } from "./authoringTypes";

const DB_NAME = "tuanChatGalPatchProposalDB";
const STORE_NAME = "proposals";
const PROPOSAL_KEY_PREFIX = "gal-patch-proposal:";
const ACTIVE_KEY_PREFIX = "tc:gal-patch-proposal:active:";
const CLIENT_BLOCKING_VALIDATION_ERROR_CODES = new Set([
  "message_not_found",
  "missing_move_anchor",
]);

export type GalPatchProposalStore = {
  save: (proposal: GalPatchProposal) => Promise<void>;
  get: (proposalId: string) => Promise<GalPatchProposal | null>;
  setActive: (roomId: string, proposalId: string | null) => Promise<void>;
  getActive: (roomId: string) => Promise<GalPatchProposal | null>;
  updateStatus: (proposalId: string, status: GalPatchProposal["status"]) => Promise<GalPatchProposal | null>;
  delete: (proposalId: string) => Promise<void>;
};

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function makeProposalKey(proposalId: string): string {
  return `${PROPOSAL_KEY_PREFIX}${proposalId}`;
}

function makeActiveKey(roomId: string): string {
  return `${ACTIVE_KEY_PREFIX}${roomId}`;
}

function openLegacyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "proposalId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withLegacyStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openLegacyDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = fn(store);
      let settled = false;
      if (request) {
        request.onsuccess = () => {
          settled = true;
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      }
      transaction.oncomplete = () => {
        if (!settled) {
          resolve(undefined);
        }
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
  finally {
    db.close();
  }
}

async function getLegacyProposal(proposalId: string): Promise<GalPatchProposal | null> {
  if (!canUseIndexedDb()) {
    return null;
  }
  const proposal = await withLegacyStore<GalPatchProposal>("readonly", store => store.get(proposalId));
  return proposal ?? null;
}

async function removeLegacyProposal(proposalId: string): Promise<void> {
  if (!canUseIndexedDb()) {
    return;
  }
  await withLegacyStore("readwrite", store => store.delete(proposalId));
}

function getLegacyActiveProposalId(roomId: string): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }
  return window.localStorage.getItem(makeActiveKey(roomId));
}

function removeLegacyActiveProposalId(roomId: string): void {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(makeActiveKey(roomId));
  }
}

function summarizeProposal(proposal: GalPatchProposal): GalPatchProposalSummary {
  return {
    proposalId: proposal.proposalId,
    status: proposal.status,
    ...proposal.summary,
  };
}

export function normalizePersistedGalPatchProposal(proposal: GalPatchProposal): GalPatchProposal {
  const validationErrors = proposal.validationErrors.filter(error =>
    CLIENT_BLOCKING_VALIDATION_ERROR_CODES.has(error.code),
  );
  if (validationErrors.length === proposal.validationErrors.length) {
    return proposal;
  }
  return {
    ...proposal,
    validationErrors,
  };
}

export class SqliteGalPatchProposalStore implements GalPatchProposalStore {
  async save(proposal: GalPatchProposal): Promise<void> {
    const db = await loadChatHistoryDb();
    await db.setLocalValue(makeProposalKey(proposal.proposalId), proposal);
    await removeLegacyProposal(proposal.proposalId);
  }

  async get(proposalId: string): Promise<GalPatchProposal | null> {
    const db = await loadChatHistoryDb();
    const proposal = await db.getLocalValue<GalPatchProposal>(makeProposalKey(proposalId));
    if (proposal) {
      return normalizePersistedGalPatchProposal(proposal);
    }

    const legacyProposal = await getLegacyProposal(proposalId);
    if (!legacyProposal) {
      return null;
    }
    const normalizedProposal = normalizePersistedGalPatchProposal(legacyProposal);
    await this.save(normalizedProposal);
    return normalizedProposal;
  }

  async setActive(roomId: string, proposalId: string | null): Promise<void> {
    const db = await loadChatHistoryDb();
    if (proposalId) {
      await db.setLocalValue(makeActiveKey(roomId), proposalId);
    }
    else {
      await db.removeLocalValue(makeActiveKey(roomId));
    }
    removeLegacyActiveProposalId(roomId);
  }

  async getActive(roomId: string): Promise<GalPatchProposal | null> {
    const db = await loadChatHistoryDb();
    const activeKey = makeActiveKey(roomId);
    const proposalId = await db.getLocalValue<string>(activeKey) ?? getLegacyActiveProposalId(roomId);
    if (!proposalId) {
      return null;
    }
    await db.setLocalValue(activeKey, proposalId);
    removeLegacyActiveProposalId(roomId);
    return this.get(proposalId);
  }

  async updateStatus(proposalId: string, status: GalPatchProposal["status"]): Promise<GalPatchProposal | null> {
    const proposal = await this.get(proposalId);
    if (!proposal) {
      return null;
    }
    const next = {
      ...proposal,
      status,
      updateTime: new Date().toISOString(),
    };
    await this.save(next);
    return next;
  }

  async delete(proposalId: string): Promise<void> {
    const db = await loadChatHistoryDb();
    await db.removeLocalValue(makeProposalKey(proposalId));
    await removeLegacyProposal(proposalId);
  }
}

export class MemoryGalPatchProposalStore implements GalPatchProposalStore {
  private readonly proposals = new Map<string, GalPatchProposal>();
  private readonly activeByRoom = new Map<string, string>();

  async save(proposal: GalPatchProposal): Promise<void> {
    this.proposals.set(proposal.proposalId, proposal);
  }

  async get(proposalId: string): Promise<GalPatchProposal | null> {
    const proposal = this.proposals.get(proposalId);
    return proposal ? normalizePersistedGalPatchProposal(proposal) : null;
  }

  async setActive(roomId: string, proposalId: string | null): Promise<void> {
    if (proposalId) {
      this.activeByRoom.set(roomId, proposalId);
    }
    else {
      this.activeByRoom.delete(roomId);
    }
  }

  async getActive(roomId: string): Promise<GalPatchProposal | null> {
    const proposalId = this.activeByRoom.get(roomId);
    return proposalId ? this.get(proposalId) : null;
  }

  async updateStatus(proposalId: string, status: GalPatchProposal["status"]): Promise<GalPatchProposal | null> {
    const proposal = await this.get(proposalId);
    if (!proposal) {
      return null;
    }
    const next = {
      ...proposal,
      status,
      updateTime: new Date().toISOString(),
    };
    this.proposals.set(proposalId, next);
    return next;
  }

  async delete(proposalId: string): Promise<void> {
    this.proposals.delete(proposalId);
    for (const [roomId, activeProposalId] of this.activeByRoom.entries()) {
      if (activeProposalId === proposalId) {
        this.activeByRoom.delete(roomId);
      }
    }
  }
}

export function createGalPatchProposalSummary(proposal: GalPatchProposal): GalPatchProposalSummary {
  return summarizeProposal(proposal);
}

export const galPatchProposalStore: GalPatchProposalStore = new SqliteGalPatchProposalStore();
