import { dbService } from './supabase';
import type { RecordType } from '../types';

export interface PendingPunch {
  idempotency_key: string;
  operation_id?: string;
  employee_id: string;
  device_id: string;
  record_type: RecordType;
  recorded_at: string;
  device_timestamp: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_address?: string;
  photo_preview?: string;
  verification_score: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  attempts: number;
  last_error?: string | null;
  created_at: string;
  synced_at?: string | null;
}

const DB_NAME = 'mp_cargas_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_punches';
const FALLBACK_KEY = 'mp_cargas_offline_punches_queue';

type SyncListener = (status: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
  justSyncedCount?: number;
}) => void;

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase | null>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'idempotency_key' });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('created_at', 'created_at', { unique: false });
            store.createIndex('employee_id', 'employee_id', { unique: false });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (e) => {
          console.warn('[IndexedDB] Erro ao abrir banco offline, usando fallback:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('[IndexedDB] Falha na inicialização:', err);
        resolve(null);
      }
    });
  }

  public async put(punch: PendingPunch): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      this.putLocalStorage(punch);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(punch);
        tx.oncomplete = () => resolve();
        tx.onerror = () => {
          this.putLocalStorage(punch);
          reject(tx.error);
        };
      } catch (err) {
        this.putLocalStorage(punch);
        resolve();
      }
    });
  }

  public async getAllPending(): Promise<PendingPunch[]> {
    const db = await this.dbPromise;
    if (!db) {
      return this.getAllLocalStorage().filter((p) => p.status === 'PENDING' || p.status === 'FAILED');
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const records: PendingPunch[] = req.result || [];
          resolve(records.filter((p) => p.status === 'PENDING' || p.status === 'FAILED'));
        };

        req.onerror = () => {
          resolve(this.getAllLocalStorage());
        };
      } catch {
        resolve(this.getAllLocalStorage());
      }
    });
  }

  public async delete(idempotencyKey: string): Promise<void> {
    const db = await this.dbPromise;
    if (!db) {
      const list = this.getAllLocalStorage().filter((p) => p.idempotency_key !== idempotencyKey);
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(idempotencyKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private getAllLocalStorage(): PendingPunch[] {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private putLocalStorage(punch: PendingPunch): void {
    try {
      const list = this.getAllLocalStorage();
      const idx = list.findIndex((p) => p.idempotency_key === punch.idempotency_key);
      if (idx >= 0) list[idx] = punch;
      else list.push(punch);
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[LocalStorage] Erro ao salvar fallback:', e);
    }
  }
}

class SyncManager {
  private storage = new IndexedDBStorage();
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private cachedPendingCount = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      window.addEventListener('focus', () => {
        if (navigator.onLine) this.syncPending();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.syncPending();
        }
      });

      // Inicializa contagem
      this.refreshCount();

      // Heartbeat controlado (a cada 20s)
      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && this.cachedPendingCount > 0) {
          this.syncPending();
        }
      }, 20000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async refreshCount(): Promise<number> {
    const list = await this.storage.getAllPending();
    this.cachedPendingCount = list.length;
    return this.cachedPendingCount;
  }

  private notify(extra?: { justSyncedCount?: number; lastSyncedAt?: string }) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    this.listeners.forEach((listener) => {
      listener({
        isOnline,
        isSyncing: this.isSyncing,
        pendingCount: this.cachedPendingCount,
        ...extra,
      });
    });
  }

  private async handleNetworkChange(isOnline: boolean) {
    await this.refreshCount();
    this.notify();
    if (isOnline) {
      this.syncPending();
    }
  }

  public getPendingCount(): number {
    return this.cachedPendingCount;
  }

  public async getPendingPunches(): Promise<PendingPunch[]> {
    return this.storage.getAllPending();
  }

  /**
   * Enfileira uma batida de ponto offline no IndexedDB
   */
  public async enqueueOfflinePunch(
    punchData: Omit<PendingPunch, 'attempts' | 'created_at' | 'status' | 'device_timestamp'>
  ): Promise<PendingPunch> {
    const nowIso = new Date().toISOString();
    const newEntry: PendingPunch = {
      ...punchData,
      operation_id: punchData.idempotency_key,
      device_timestamp: nowIso,
      status: 'PENDING',
      attempts: 0,
      created_at: nowIso,
    };

    await this.storage.put(newEntry);
    await this.refreshCount();
    this.notify();
    return newEntry;
  }

  /**
   * Sincronização Automática com Proteção contra Retry Infinito e Idempotência
   */
  public async syncPending(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    const queue = await this.storage.getAllPending();
    if (queue.length === 0) {
      this.cachedPendingCount = 0;
      this.notify();
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;

    for (const punch of queue) {
      // Limite máximo de 5 tentativas para evitar loop de retry infinito
      if (punch.attempts >= 5) {
        punch.status = 'FAILED';
        punch.last_error = 'Limite de 5 tentativas excedido.';
        await this.storage.put(punch);
        failedCount++;
        continue;
      }

      try {
        punch.status = 'SYNCING';
        await this.storage.put(punch);

        await dbService.createTimeRecord({
          employee_id: punch.employee_id,
          device_id: punch.device_id,
          record_type: punch.record_type,
          latitude: punch.latitude,
          longitude: punch.longitude,
          location_accuracy: punch.location_accuracy,
          location_address: punch.location_address,
          photo_preview: punch.photo_preview,
          verification_score: punch.verification_score,
          idempotency_key: punch.idempotency_key,
          sync_status: 'SINCRONIZADO',
          recorded_at: punch.recorded_at,
        });

        // Marca como sincronizado e remove da fila pendente
        await this.storage.delete(punch.idempotency_key);
        syncedCount++;
      } catch (err: any) {
        console.error('[SyncManager] Erro ao sincronizar ponto offline:', err);
        punch.attempts += 1;
        punch.status = 'FAILED';
        punch.last_error = err?.message || 'Falha de comunicação com o servidor';
        await this.storage.put(punch);
        failedCount++;
      }
    }

    await this.refreshCount();
    this.isSyncing = false;

    this.notify({
      justSyncedCount: syncedCount,
      lastSyncedAt: new Date().toISOString(),
    });

    return { synced: syncedCount, failed: failedCount };
  }
}

export const syncManager = new SyncManager();
