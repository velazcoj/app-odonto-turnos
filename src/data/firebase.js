import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, setDoc, getDoc, getDocs,
  writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';

// Solo se inicializa si hay configuración (si no, la app usa el modo demo).
let auth;
let db;
if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  // Caché local: la app abre al instante y funciona aunque no haya señal en el consultorio.
  try {
    db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    db = initializeFirestore(app, {});
  }
}

const uid = () => auth.currentUser?.uid;
const patientsCol = () => collection(db, 'users', uid(), 'patients');
const apptsCol = () => collection(db, 'users', uid(), 'appointments');
const withId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => k !== 'id' && v !== undefined));

export const isDemo = false;

export function onAuth(cb) {
  return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
}
export const login = (email, pw) => signInWithEmailAndPassword(auth, email.trim(), pw);
export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

export function watchSettings(cb) {
  return onSnapshot(doc(db, 'users', uid()), (s) => cb(s.data()?.settings || {}), () => cb({}));
}
export const saveSettings = (settings) => setDoc(doc(db, 'users', uid()), { settings }, { merge: true });

export function watchPatients(cb) {
  return onSnapshot(patientsCol(), (s) => cb(withId(s)));
}

export async function savePatient(p) {
  const data = clean(p);
  if (p.id) {
    await updateDoc(doc(patientsCol(), p.id), { ...data, updatedAt: serverTimestamp() });
    // Mantener el nombre actualizado en sus turnos
    const name = `${p.firstName} ${p.lastName}`.trim();
    const appts = await getDocs(query(apptsCol(), where('patientId', '==', p.id)));
    const batch = writeBatch(db);
    let n = 0;
    appts.forEach((a) => {
      if (a.data().patientName !== name || a.data().patientPhone !== (p.phone || '')) {
        batch.update(a.ref, { patientName: name, patientPhone: p.phone || '' });
        n++;
      }
    });
    if (n) await batch.commit();
    return p.id;
  }
  const ref = await addDoc(patientsCol(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export const deletePatient = (id) => deleteDoc(doc(patientsCol(), id));

export function watchAppointmentsRange(from, to, cb) {
  const q = query(apptsCol(), where('date', '>=', from), where('date', '<=', to));
  return onSnapshot(q, (s) => cb(withId(s)));
}

export function watchPatientAppointments(patientId, cb) {
  const q = query(apptsCol(), where('patientId', '==', patientId));
  return onSnapshot(q, (s) => cb(withId(s)));
}

export async function getAppointment(id) {
  const s = await getDoc(doc(apptsCol(), id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function saveAppointment(a) {
  const data = clean(a);
  if (a.id) {
    await updateDoc(doc(apptsCol(), a.id), { ...data, updatedAt: serverTimestamp() });
    return a.id;
  }
  const ref = await addDoc(apptsCol(), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export const updateAppointment = (id, partial) => updateDoc(doc(apptsCol(), id), partial);
export const deleteAppointment = (id) => deleteDoc(doc(apptsCol(), id));
