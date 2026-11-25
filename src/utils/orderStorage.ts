import { ProductOrderRow } from '../types/fms';

const DB_NAME = 'ginza_fms_db';
const DB_VERSION = 1;
const STORE_NAME = 'product_orders';

// Open or initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let idbWriteInFlight = false;
let pendingIdbOrders: ProductOrderRow[] | null = null;

/**
 * Save all product order rows (supports 10,000+ rows with zero quota error).
 * Coalesces concurrent writes so large structured-clones never stack in memory.
 */
export async function saveOrdersToStorage(orders: ProductOrderRow[]): Promise<boolean> {
  if (idbWriteInFlight) {
    pendingIdbOrders = orders;
    return true;
  }
  idbWriteInFlight = true;
  let currentOrders: ProductOrderRow[] | null = orders;
  let lastOk = false;

  try {
    while (currentOrders) {
      const batch = currentOrders;
      pendingIdbOrders = null;
      try {
        const db = await openDB();
        lastOk = await new Promise<boolean>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put({ id: 'current_dataset', data: batch, updatedAt: Date.now() });

          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => {
            db.close();
            resolve(false);
          };
          tx.onabort = () => {
            db.close();
            resolve(false);
          };
        });
      } catch (err) {
        console.warn('IndexedDB save failed, falling back to localStorage if size allows', err);
        try {
          if (batch.length <= 1500) {
            localStorage.setItem('fms_simulated_orders', JSON.stringify(batch));
          }
        } catch (e) {}
        lastOk = false;
      }
      currentOrders = pendingIdbOrders;
    }
    return lastOk;
  } finally {
    idbWriteInFlight = false;
  }
}

/**
 * Load all product order rows from IndexedDB
 */
export async function loadOrdersFromStorage(): Promise<ProductOrderRow[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_dataset');

      req.onsuccess = () => {
        db.close();
        if (req.result && Array.isArray(req.result.data) && req.result.data.length > 0) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    return null;
  }
}

/**
 * Wipe/clear all orders from storage
 */
export async function clearOrdersFromStorage(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete('current_dataset');

      tx.oncomplete = () => {
        db.close();
        try {
          localStorage.removeItem('fms_simulated_orders');
        } catch (e) {}
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    try {
      localStorage.removeItem('fms_simulated_orders');
    } catch (e) {}
    return false;
  }
}
