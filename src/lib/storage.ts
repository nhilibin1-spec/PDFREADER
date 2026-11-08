import type { AppSettings, PdfRecord, StoredPdf } from "../types";

const DB_NAME = "wathiqa-pdf-library";
const STORE_NAME = "documents";
const SETTINGS_KEY = "wathiqa-settings-v1";

export const defaultSettings: AppSettings = {
  theme: "light",
  sortKey: "recent",
  viewMode: "grid",
  direction: "vertical",
  zoom: 1,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("تعذر فتح التخزين المحلي"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("فشلت عملية التخزين"));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("فشلت معاملة التخزين"));
    };
  });
}

export async function getStoredDocuments(): Promise<StoredPdf[]> {
  const records = await withStore("readonly", (store) => store.getAll() as IDBRequest<StoredPdf[]>);
  return records.filter((record) => record.blob instanceof Blob);
}

export async function getStoredDocument(id: string): Promise<StoredPdf | undefined> {
  return withStore("readonly", (store) => store.get(id) as IDBRequest<StoredPdf | undefined>);
}

export async function putStoredDocument(document: StoredPdf): Promise<void> {
  await withStore("readwrite", (store) => store.put(document));
}

export async function updateStoredDocument(id: string, patch: Partial<PdfRecord>): Promise<PdfRecord | null> {
  const current = await getStoredDocument(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await putStoredDocument(next);
  const { blob: _blob, ...metadata } = next;
  void _blob;
  return metadata;
}

export async function removeStoredDocument(id: string): Promise<StoredPdf | undefined> {
  const current = await getStoredDocument(id);
  await withStore("readwrite", (store) => store.delete(id) as IDBRequest<void>);
  return current;
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return defaultSettings;
    const parsed = { ...defaultSettings, ...(JSON.parse(saved) as Partial<AppSettings>) };
    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      sortKey: ["recent", "name", "size", "added"].includes(parsed.sortKey) ? parsed.sortKey : "recent",
      viewMode: parsed.viewMode === "list" ? "list" : "grid",
      direction: parsed.direction === "horizontal" ? "horizontal" : "vertical",
      zoom: Number.isFinite(parsed.zoom) ? Math.min(3, Math.max(.5, parsed.zoom)) : 1,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The application remains usable when private browsing blocks localStorage.
  }
}
