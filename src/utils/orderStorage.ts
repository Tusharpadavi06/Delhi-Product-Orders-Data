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

/**
 * Save all product order rows (supports 10,000+ rows with zero quota error)
 */
export async function saveOrdersToStorage(orders: ProductOrderRow[]): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Store under fixed key 'current_dataset'
      store.put({ id: 'current_dataset', data: orders, updatedAt: Date.now() });

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage if size allows', err);
    try {
      if (orders.length <= 1500) {
        localStorage.setItem('fms_simulated_orders', JSON.stringify(orders));
      }
    } catch (e) {}
    return false;
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
