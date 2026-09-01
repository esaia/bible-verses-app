/**
 * Files the operator dragged in from their own machine.
 *
 * The file itself is kept in IndexedDB rather than uploaded anywhere: a
 * service's music is the church's, it is tens of megabytes, and the console
 * has to keep working when the hall's wifi does not. Storing the `File` keeps
 * it across reloads, so a track dropped on Saturday is still there on Sunday.
 *
 * Object URLs are deliberately *not* stored — a blob URL dies with the
 * document that made it, so they are minted fresh each session.
 */

const DB_NAME = 'studioMedia';
const DB_VERSION = 1;
const STORE = 'files';

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const run = async (mode, work) => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = work(transaction.objectStore(STORE));

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

export const saveLocalFile = async file => {
  const record = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    file,
  };

  await run('readwrite', store => store.put(record));

  return record;
};

export const loadLocalFiles = () => run('readonly', store => store.getAll());

export const deleteLocalFile = id => run('readwrite', store => store.delete(id));

/** Strips the extension, so the list reads like titles rather than filenames. */
export const titleFromName = name => name.replace(/\.[^.]+$/, '');

/** Everything a `<audio>` element will actually play. */
export const isAudioFile = file =>
  file.type.startsWith('audio/') || /\.(mp3|m4a|aac|wav|ogg|oga|flac|opus|webm)$/i.test(file.name);
