import { dbService } from './supabase';
import type { RecordType } from '../types';

export interface PendingPunch {
  idempotency_key: string;
  employee_id: string;
  device_id: string;
  record_type: RecordType;
  recorded_at: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_address?: string;
  photo_preview?: string;
  verification_score: number;
  attempts: number;
  created_at: string;
}

const OFFLINE_QUEUE_KEY = 'mp_cargas_offline_punches_queue';

type SyncListener = (status: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
  justSyncedCount?: number;
}) => void;

class SyncManager {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      
      setInterval(() => {
        if (navigator.onLine && this.getPendingCount() > 0) {
          this.syncPending();
        }
      }, 15000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(extra?: { justSyncedCount?: number; lastSyncedAt?: string }) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pendingCount = this.getPendingCount();
    
    this.listeners.forEach((listener) => {
      listener({
        isOnline,
        isSyncing: this.isSyncing,
        pendingCount,
        ...extra,
      });
    });
  }

  private handleNetworkChange(isOnline: boolean) {
    this.notify();
    if (isOnline) {
      this.syncPending();
    }
  }

  public getPendingPunches(): PendingPunch[] {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getPendingCount(): number {
    return this.getPendingPunches().length;
  }

  private savePendingPunches(queue: PendingPunch[]) {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    this.notify();
  }

  /**
   * Enfileira uma batida de ponto offline
   */
  public enqueueOfflinePunch(punchData: Omit<PendingPunch, 'attempts' | 'created_at'>): PendingPunch {
    const queue = this.getPendingPunches();
    const newEntry: PendingPunch = {
      ...punchData,
      attempts: 0,
      created_at: new Date().toISOString(),
    };

    queue.push(newEntry);
    this.savePendingPunches(queue);
    return newEntry;
  }

  /**
   * Dispara a sincronização de todas as batidas pendentes
   */
  public async syncPending(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    
    const queue = this.getPendingPunches();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: PendingPunch[] = [];

    for (const punch of queue) {
      try {
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
        syncedCount++;
      } catch (err) {
        console.error('Falha ao sincronizar registro:', err);
        punch.attempts += 1;
        remainingQueue.push(punch);
        failedCount++;
      }
    }

    this.savePendingPunches(remainingQueue);
    this.isSyncing = false;

    this.notify({
      justSyncedCount: syncedCount,
      lastSyncedAt: new Date().toISOString(),
    });

    return { synced: syncedCount, failed: failedCount };
  }
}

export const syncManager = new SyncManager();
