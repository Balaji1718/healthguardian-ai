import { openDB, type IDBPDatabase } from "idb";

/**
 * Raw medical documents (PDF/images) NEVER leave the device: they are stored in
 * IndexedDB only. Firestore holds metadata + user-verified structured results.
 */
const DB_NAME = "healthguardian-local";
const STORE = "documents";
const CACHE = "cache";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (typeof window === "undefined") throw new Error("IndexedDB is browser only");
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id" });
        if (!d.objectStoreNames.contains(CACHE)) d.createObjectStore(CACHE);
      },
    });
  }
  return dbPromise;
}

export interface LocalDocument {
  id: string;
  uid: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) return "Only PDF, PNG, JPEG or WEBP files are supported.";
  if (file.size > MAX_FILE_BYTES) return "File is larger than the 15 MB limit.";
  if (file.size === 0) return "File appears to be empty.";
  return null;
}

export async function saveLocalDocument(uid: string, file: File): Promise<string> {
  const id = `${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const d = await db();
  await d.put(STORE, {
    id,
    uid,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  } satisfies LocalDocument);
  return id;
}

export async function getLocalDocument(uid: string, id: string): Promise<LocalDocument | null> {
  const d = await db();
  const doc = (await d.get(STORE, id)) as LocalDocument | undefined;
  // Ownership check: a local document is only readable by its owner.
  if (!doc || doc.uid !== uid) return null;
  return doc;
}

export async function listLocalDocuments(uid: string): Promise<LocalDocument[]> {
  const d = await db();
  const all = (await d.getAll(STORE)) as LocalDocument[];
  return all.filter((x) => x.uid === uid);
}

export async function deleteLocalDocument(uid: string, id: string) {
  const doc = await getLocalDocument(uid, id);
  if (!doc) return;
  const d = await db();
  await d.delete(STORE, id);
}

export async function deleteAllLocalDocuments(uid: string) {
  const docs = await listLocalDocuments(uid);
  const d = await db();
  await Promise.all(docs.map((x) => d.delete(STORE, x.id)));
}

/* ------------------------------- data cache -------------------------------- */

export async function cacheSet(key: string, value: unknown) {
  try {
    const d = await db();
    await d.put(CACHE, { value, at: Date.now() }, key);
  } catch {
    /* cache is best-effort */
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const d = await db();
    const hit = (await d.get(CACHE, key)) as { value: T } | undefined;
    return hit ? hit.value : null;
  } catch {
    return null;
  }
}

export async function cacheClear(uid: string) {
  const d = await db();
  const keys = await d.getAllKeys(CACHE);
  await Promise.all(keys.filter((k) => String(k).startsWith(uid)).map((k) => d.delete(CACHE, k)));
}
