const DB_NAME = 'strudel-tutor';
const STORE = 'likes';
const VERSION = 1;

export type Like = {
  id: string;
  seed_code: string;
  variation_code: string;
  transformation_label: string;
  explanation_one_line: string;
  liked_at: number;
};

export type Exemplar = {
  seed_code: string;
  variation_code: string;
  transformation_label: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('liked_at', 'liked_at', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function store(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function addLike(
  payload: Omit<Like, 'id' | 'liked_at'>,
): Promise<Like> {
  const like: Like = { id: uuid(), ...payload, liked_at: Date.now() };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = store(db, 'readwrite').put(like);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return like;
}

export async function deleteLike(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = store(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllLikes(): Promise<Like[]> {
  const db = await openDb();
  return new Promise<Like[]>((resolve, reject) => {
    const req = store(db, 'readonly').getAll();
    req.onsuccess = () => {
      const result = (req.result as Like[]) ?? [];
      resolve([...result].sort((a, b) => b.liked_at - a.liked_at));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearLikes(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = store(db, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Character bigram set, whitespace-stripped and lowercased. Cheap and
 * deterministic — chosen as the v1 similarity heuristic because Strudel
 * seeds share a lot of structural tokens (`s("..")`, `note("..")`,
 * `(N,M)` euclids, chain methods like `.slow(`).
 */
import { similarity } from './similarity';

export async function getTopKSimilar(seedCode: string, k = 3): Promise<Exemplar[]> {
  const all = await getAllLikes();
  if (all.length === 0) return [];
  const scored = all.map((l) => ({
    like: l,
    score: similarity(seedCode, l.seed_code),
  }));
  // Tie-break by recency (already sorted in getAllLikes).
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, k)
    .filter((s) => s.score > 0)
    .map((s) => ({
      seed_code: s.like.seed_code,
      variation_code: s.like.variation_code,
      transformation_label: s.like.transformation_label,
    }));
}
