// ============================================================================
// auth.js — login/logout e stato di sessione condiviso da tutta l'app.
// ============================================================================

const Auth = (() => {
  let currentUser = null;
  const listeners = [];

  function onChange(cb) {
    listeners.push(cb);
  }

  function notify() {
    listeners.forEach((cb) => cb(currentUser));
  }

  async function init() {
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session ? data.session.user : null;
    notify();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session ? session.user : null;
      notify();
    });
  }

  async function login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logout() {
    await supabaseClient.auth.signOut();
  }

  function getUser() {
    return currentUser;
  }

  return { init, login, logout, onChange, getUser };
})();
