const DATABASE_NAME = 'velvetkey-offline';
const STORE_NAME = 'tickets';
const DATABASE_VERSION = 1;
const FALLBACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type OfflineTicket = {
  eventId: string;
  eventTitle: string | null;
  eventDate: string | null;
  token: string;
  cachedAt: string;
  expiresAt: string;
};

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'eventId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineTicket(input: {
  eventId: string;
  eventTitle: string | null;
  eventDate: string | null;
  token: string;
}): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  const eventTime = input.eventDate
    ? new Date(input.eventDate).getTime()
    : Number.NaN;
  const expiresAt = Number.isFinite(eventTime)
    ? new Date(eventTime + 24 * 60 * 60 * 1000)
    : new Date(Date.now() + FALLBACK_TTL_MS);
  const ticket: OfflineTicket = {
    ...input,
    cachedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(ticket);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function getOfflineTicket(
  eventId: string,
): Promise<OfflineTicket | null> {
  const database = await openDatabase();
  if (!database) return null;
  const ticket = await new Promise<OfflineTicket | undefined>(
    (resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(eventId);
      request.onsuccess = () =>
        resolve(request.result as OfflineTicket | undefined);
      request.onerror = () => reject(request.error);
    },
  );
  database.close();
  if (!ticket) return null;
  if (new Date(ticket.expiresAt).getTime() <= Date.now()) {
    await deleteOfflineTicket(eventId);
    return null;
  }
  return ticket;
}

export async function deleteOfflineTicket(eventId: string): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(eventId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function clearOfflineTickets(): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
