import { Data, dataSchema, emptyData } from './model';
const DB = 'migraine-terminal';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('datasets');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function loadData(
  mode: Data['mode'],
): Promise<{ data: Data; revision: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('datasets', 'readonly');
    const req = tx.objectStore('datasets').get(mode);
    req.onsuccess = () => {
      try {
        resolve(
          req.result
            ? {
                data: dataSchema.parse(req.result.data),
                revision: req.result.revision,
              }
            : { data: emptyData(mode), revision: 0 },
        );
      } catch (e) {
        reject(e);
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
export async function persistData(
  data: Data,
  revision: number,
): Promise<number> {
  dataSchema.parse(data);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('datasets', 'readwrite');
    const store = tx.objectStore('datasets');
    const req = store.get(data.mode);
    req.onsuccess = () => {
      if ((req.result?.revision ?? 0) !== revision) {
        tx.abort();
        reject(
          new Error(
            'Os dados foram alterados noutra janela. Recarregue antes de editar.',
          ),
        );
        return;
      }
      store.put({ data, revision: revision + 1 }, data.mode);
    };
    tx.oncomplete = () => {
      db.close();
      resolve(revision + 1);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => {
      db.close();
      reject(
        new Error(
          'Não foi possível guardar. Verifique o espaço disponível ou recarregue a página.',
        ),
      );
    };
  });
}
