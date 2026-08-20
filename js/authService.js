import { supabase, hasSupabase } from "./supabaseClient.js";
import { db as localDb, session as localSession } from "./db.js";

let cachedUserId = hasSupabase ? null : localSession.get();
let cachedEmail = null;
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb(cachedUserId));
}

export const authService = {
  backend: hasSupabase ? "supabase" : "local",

  // resolves once the initial session state (from Supabase, if configured) is known
  async ready() {
    if (!hasSupabase) return cachedUserId;
    const { data } = await supabase.auth.getSession();
    cachedUserId = data.session?.user?.id || null;
    cachedEmail = data.session?.user?.email || null;
    supabase.auth.onAuthStateChange((_event, session) => {
      cachedUserId = session?.user?.id || null;
      cachedEmail = session?.user?.email || null;
      notify();
    });
    return cachedUserId;
  },

  onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  currentUserId() {
    return cachedUserId;
  },

  currentEmail() {
    return cachedEmail;
  },

  async signup({ email, password, name }) {
    if (hasSupabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
      cachedUserId = data.user?.id || null;
      cachedEmail = email;
      notify();
      return { id: cachedUserId, needsEmailConfirmation: !data.session };
    }
    const existing = localDb.query("users", (u) => u.email === email)[0];
    if (existing) throw new Error("An account with that email already exists.");
    const user = localDb.add("users", { email, password, name, createdAt: Date.now() });
    localSession.set(user.id);
    cachedUserId = user.id;
    notify();
    return { id: user.id, needsEmailConfirmation: false };
  },

  async login({ email, password }) {
    if (hasSupabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      cachedUserId = data.user?.id || null;
      cachedEmail = email;
      notify();
      return { id: cachedUserId };
    }
    const user = localDb.query("users", (u) => u.email === email)[0];
    if (!user || user.password !== password) throw new Error("Invalid email or password.");
    localSession.set(user.id);
    cachedUserId = user.id;
    notify();
    return { id: user.id };
  },

  async loginWithGoogle() {
    if (!hasSupabase) throw new Error("Google sign-in requires Supabase to be configured.");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw new Error(error.message);
    // browser is redirected to Google now; execution resumes on callback via onAuthStateChange
  },

  async resetPassword({ email, newPassword }) {
    if (hasSupabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error(error.message);
      return { emailSent: true };
    }
    const user = localDb.query("users", (u) => u.email === email)[0];
    if (!user) throw new Error("No account found for that email.");
    localDb.update("users", user.id, { password: newPassword });
    return { emailSent: false };
  },

  async signOut() {
    if (hasSupabase) {
      await supabase.auth.signOut();
    } else {
      localSession.clear();
    }
    cachedUserId = null;
    cachedEmail = null;
    notify();
  },
};
