// Unified async data-access layer. Backed by Supabase (table "app_data") when
// configured, otherwise falls back to the local synchronous db.js so the app
// works fully offline. repositories.js is the only module that should import this.

import { supabase, hasSupabase } from "./supabaseClient.js";
import { db as localDb } from "./db.js";
import { authService } from "./authService.js";

const TABLE = "app_data";

export const store = {
  async all(collection) {
    if (!hasSupabase) return localDb.all(collection);
    const uid = authService.currentUserId();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id,data")
      .eq("collection", collection)
      .eq("user_id", uid);
    if (error) throw new Error(error.message);
    return (data || []).map((row) => ({ ...row.data, id: row.id }));
  },

  async get(collection, id) {
    if (!hasSupabase) return localDb.get(collection, id);
    const { data, error } = await supabase
      .from(TABLE)
      .select("id,data")
      .eq("collection", collection)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { ...data.data, id: data.id } : null;
  },

  async query(collection, predicate) {
    const rows = await store.all(collection);
    return rows.filter(predicate);
  },

  async set(collection, id, doc) {
    if (!hasSupabase) return localDb.set(collection, id, doc);
    const uid = authService.currentUserId();
    const payload = { id, collection, user_id: uid, data: { ...doc, id } };
    const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: "id,collection" });
    if (error) throw new Error(error.message);
    return payload.data;
  },

  async add(collection, doc) {
    const id = localDb.uid();
    return store.set(collection, id, doc);
  },

  async update(collection, id, patch) {
    const existing = (await store.get(collection, id)) || { id };
    return store.set(collection, id, { ...existing, ...patch, id });
  },

  async remove(collection, id) {
    if (!hasSupabase) return localDb.remove(collection, id);
    const { error } = await supabase.from(TABLE).delete().eq("collection", collection).eq("id", id);
    if (error) throw new Error(error.message);
  },
};
