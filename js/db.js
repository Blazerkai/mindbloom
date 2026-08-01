// Minimal local persistence layer shaped like Firestore collections/documents,
// so it can be swapped for the real Firebase SDK later without touching callers.
// Every "collection" is a top-level localStorage key holding { [id]: doc }.

const PREFIX = "mindbloom:";

function readCollection(name) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + name)) || {};
  } catch {
    return {};
  }
}

function writeCollection(name, data) {
  localStorage.setItem(PREFIX + name, JSON.stringify(data));
}

function uid() {
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
}

export const db = {
  uid,

  all(collection) {
    return Object.values(readCollection(collection));
  },

  get(collection, id) {
    return readCollection(collection)[id] ?? null;
  },

  query(collection, predicate) {
    return Object.values(readCollection(collection)).filter(predicate);
  },

  set(collection, id, doc) {
    const data = readCollection(collection);
    data[id] = { ...doc, id };
    writeCollection(collection, data);
    return data[id];
  },

  add(collection, doc) {
    const id = uid();
    return db.set(collection, id, doc);
  },

  update(collection, id, patch) {
    const data = readCollection(collection);
    const existing = data[id] || { id };
    data[id] = { ...existing, ...patch, id };
    writeCollection(collection, data);
    return data[id];
  },

  remove(collection, id) {
    const data = readCollection(collection);
    delete data[id];
    writeCollection(collection, data);
  },

  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  },
};

// -------- session (current signed-in user id) --------
const SESSION_KEY = PREFIX + "session";
export const session = {
  get() {
    return localStorage.getItem(SESSION_KEY);
  },
  set(userId) {
    localStorage.setItem(SESSION_KEY, userId);
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  },
};
