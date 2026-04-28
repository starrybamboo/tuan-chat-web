import type { GalPatchProposal, GalPatchProposalSummary } from "./authoringTypes";

const DB_NAME = "tuanChatGalPatchProposalDB";
const STORE_NAME = "proposals";
const ACTIVE_KEY_PREFIX = "tc:gal-patch-proposal:active:";

export type GalPatchProposalStore = {
  save(proposal: GalPatchProposal): Promise<void>;
  get(proposalId: string): Promise<GalPatchProposal | null>;
  setActive(roomId: string, proposalId: string | null): Promise<void>;
  getActive(roomId: string): Promise<GalPatchProposal | null>;
  updateStatus(proposalId: string, status: GalPatchProposal["status"]): Promise<GalPatchProposal | null>;
  delete(proposalId: string): Promise<void>;
};

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
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

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
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

function summarizeProposal(proposal: GalPatchProposal): GalPatchProposalSummary {
  return {
    proposalId: proposal.proposalId,
    status: proposal.status,
    ...proposal.summary,
  };
}

export class IndexedDbGalPatchProposalStore implements GalPatchProposalStore {
  async save(proposal: GalPatchProposal): Promise<void> {
    if (!canUseIndexedDb()) {
      throw new Error("IndexedDB is not available");
    }
    await withStore("readwrite", store => store.put(proposal));
  }

  async get(proposalId: string): Promise<GalPatchProposal | null> {
    if (!canUseIndexedDb()) {
      return null;
    }
    const proposal = await withStore<GalPatchProposal>("readonly", store => store.get(proposalId));
    return proposal ?? null;
  }

  async setActive(roomId: string, proposalId: string | null): Promise<void> {
    if (!canUseLocalStorage()) {
      return;
    }
    const key = `${ACTIVE_KEY_PREFIX}${roomId}`;
    if (proposalId) {
      window.localStorage.setItem(key, proposalId);
    }
    else {
      window.localStorage.removeItem(key);
    }
  }

  async getActive(roomId: string): Promise<GalPatchProposal | null> {
    if (!canUseLocalStorage()) {
      return null;
    }
    const proposalId = window.localStorage.getItem(`${ACTIVE_KEY_PREFIX}${roomId}`);
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
    await this.save(next);
    return next;
  }

  async delete(proposalId: string): Promise<void> {
    if (!canUseIndexedDb()) {
      return;
    }
    await withStore("readwrite", store => store.delete(proposalId));
  }
}

export class MemoryGalPatchProposalStore implements GalPatchProposalStore {
  private readonly proposals = new Map<string, GalPatchProposal>();
  private readonly activeByRoom = new Map<string, string>();

  async save(proposal: GalPatchProposal): Promise<void> {
    this.proposals.set(proposal.proposalId, proposal);
  }

  async get(proposalId: string): Promise<GalPatchProposal | null> {
    return this.proposals.get(proposalId) ?? null;
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
    const proposal = this.proposals.get(proposalId);
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
