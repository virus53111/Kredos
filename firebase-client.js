import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTWk6-x_iF1Ub3JlPPc6B2RqFBxKxOVTY",
  authDomain: "kredos-3f3d6.firebaseapp.com",
  projectId: "kredos-3f3d6",
  storageBucket: "kredos-3f3d6.firebasestorage.app",
  messagingSenderId: "537324300663",
  appId: "1:537324300663:web:5cba519b999b7a8d1a5972"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
await setPersistence(auth, browserLocalPersistence);

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, b => (b % 36).toString(36)).join("").toUpperCase();
}

function encodeMeta(role, referralCode) {
  return "PB|" + role + "|" + referralCode;
}

function decodeMeta(displayName) {
  const m = /^PB\|(renter|host)\|([A-Z0-9]{5,12})$/.exec(displayName || "");
  return m ? { role:m[1], referralCode:m[2] } : null;
}

function publicUser(user, profile) {
  const fallback = decodeMeta(user.displayName) || { role:"renter", referralCode:"-" };
  return {
    uid:user.uid,
    email:user.email || "",
    emailVerified:user.emailVerified,
    role:profile?.role || fallback.role,
    referralCode:profile?.referralCode || fallback.referralCode,
    createdAt:profile?.createdAt || null
  };
}

async function writeProfile(user, role, referralCode) {
  const ref = doc(db, "users", user.uid);
  const payload = {
    uid:user.uid,
    email:(user.email || "").toLowerCase(),
    role,
    referralCode,
    createdAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  };
  await setDoc(ref, payload, {merge:true});
}

export async function registerAccount({email,password,role}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!["renter","host"].includes(role)) throw new Error("INVALID_ROLE");
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const referralCode = randomCode();
  await updateProfile(cred.user, {displayName:encodeMeta(role, referralCode)});
  try {
    await writeProfile(cred.user, role, referralCode);
  } catch (error) {
    console.warn("PhoneBridge profile write pending Firestore rules deployment:", error);
  }
  return publicUser(cred.user, {role, referralCode});
}

export async function loginAccount(email,password) {
  const cred = await signInWithEmailAndPassword(auth, String(email || "").trim().toLowerCase(), password);
  const profile = await ensureProfile(cred.user);
  return publicUser(cred.user, profile);
}

export async function logoutAccount() {
  await firebaseSignOut(auth);
}

export function waitForAuth() {
  return new Promise(resolve => {
    const stop = onAuthStateChanged(auth, user => {
      stop();
      resolve(user);
    });
  });
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function ensureProfile(user) {
  const ref = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
  } catch (error) {
    console.warn("PhoneBridge profile read pending Firestore rules deployment:", error);
  }

  const meta = decodeMeta(user.displayName) || {role:"renter", referralCode:randomCode()};
  if (!decodeMeta(user.displayName)) {
    await updateProfile(user, {displayName:encodeMeta(meta.role, meta.referralCode)});
  }
  try {
    await writeProfile(user, meta.role, meta.referralCode);
  } catch (error) {
    console.warn("PhoneBridge profile sync pending Firestore rules deployment:", error);
  }
  return meta;
}

export async function currentAccount() {
  const user = auth.currentUser || await waitForAuth();
  if (!user) return null;
  const profile = await ensureProfile(user);
  return publicUser(user, profile);
}

export async function addDevice(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");
  const profile = await ensureProfile(user);
  if (profile.role !== "host") throw new Error("HOST_ONLY");

  const payload = {
    ownerId:user.uid,
    model:String(data.model || "").trim().slice(0,80),
    country:String(data.country || "").trim().slice(0,60),
    androidVersion:String(data.androidVersion || "").trim().slice(0,30),
    carrier:String(data.carrier || "").trim().slice(0,60),
    network:String(data.network || "").trim().slice(0,20),
    status:"pending",
    public:false,
    hourlyRate:1,
    hostRate:0.5,
    createdAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  };
  if (!payload.model || !payload.country || !payload.androidVersion) throw new Error("INVALID_DEVICE");
  const ref = await addDoc(collection(db, "devices"), payload);
  return {id:ref.id, ...payload};
}

export async function listMyDevices() {
  const user = auth.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");
  const q = query(collection(db, "devices"), where("ownerId","==",user.uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id:d.id, ...d.data()}));
}

export function firebaseErrorCode(error) {
  return String(error?.code || error?.message || "UNKNOWN");
}
