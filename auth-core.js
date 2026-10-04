const PBAuth = (() => {
  const USERS_KEY = "pb_users_v1";
  const SESSION_KEY = "pb_session_v1";

  const b64 = bytes => btoa(String.fromCharCode(...bytes));
  const fromB64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const randomId = (prefix="") => prefix + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2,"0")).join("");

  function users() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
    catch { return []; }
  }

  function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }

  async function hashPassword(password, saltB64) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const bits = await crypto.subtle.deriveBits(
      {name:"PBKDF2", salt, iterations:120000, hash:"SHA-256"},
      key,
      256
    );
    return { salt: b64(salt), hash: b64(new Uint8Array(bits)) };
  }

  async function register({email,password,role}) {
    email = String(email || "").trim().toLowerCase();
    if (!email || !password || !["renter","host"].includes(role)) throw new Error("INVALID_INPUT");
    const list = users();
    if (list.some(u => u.email === email)) throw new Error("EMAIL_EXISTS");

    const passwordData = await hashPassword(password);
    const user = {
      id: randomId("usr_"),
      email,
      role,
      referralCode: randomId("").slice(0,8).toUpperCase(),
      createdAt: new Date().toISOString(),
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash
    };
    list.push(user);
    saveUsers(list);
    startSession(user.id);
    return publicUser(user);
  }

  async function login(email,password) {
    email = String(email || "").trim().toLowerCase();
    const user = users().find(u => u.email === email);
    if (!user) throw new Error("BAD_CREDENTIALS");
    const check = await hashPassword(password, user.passwordSalt);
    if (check.hash !== user.passwordHash) throw new Error("BAD_CREDENTIALS");
    startSession(user.id);
    return publicUser(user);
  }

  function startSession(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId,
      token: randomId("ses_"),
      issuedAt: new Date().toISOString()
    }));
  }

  function session() {
    try {
      const current = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (!current?.userId) return null;
      const user = users().find(u => u.id === current.userId);
      return user ? { ...current, user: publicUser(user) } : null;
    } catch { return null; }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function publicUser(user) {
    return {
      id:user.id,
      email:user.email,
      role:user.role,
      referralCode:user.referralCode,
      createdAt:user.createdAt
    };
  }

  return { register, login, session, logout };
})();