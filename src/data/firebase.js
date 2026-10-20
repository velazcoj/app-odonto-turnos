import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, query, where, updateDoc, deleteDoc, setDoc, getDoc, getDocs,
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
// 'estimate': mientras una escritura está pendiente, createdAt/updatedAt traen la hora local en vez de null.
const withId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => k !== 'id' && v !== undefined));

// Las escrituras quedan al instante en la caché local (y se ven en pantalla), pero la promesa de
// Firestore recién resuelve cuando el servidor confirma: sin señal, nunca. No la esperamos; la
// cola persistente la sube sola cuando vuelve la conexión. Solo avisamos los rechazos definitivos.
function report(err) {
  console.error(err);
  if (err?.code === 'permission-denied' || err?.code === 'not-found') {
    window.alert('No se pudo sincronizar un cambio. Revisá los datos y volvé a intentarlo.');
  }
}
const send = (write) => { write.catch(report); };

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
export async function saveSettings(settings) {
  send(setDoc(doc(db, 'users', uid()), { settings }, { merge: true }));
}

export function watchPatients(cb) {
  return onSnapshot(patientsCol(), (s) => cb(withId(s)));
}

// Mantener el nombre y el teléfono actualizados en los turnos del paciente.
async function syncAppointments(p) {
  const name = `${p.firstName} ${p.lastName}`.trim();
  const phone = p.phone || '';
  const appts = await getDocs(query(apptsCol(), where('patientId', '==', p.id)));
  const batch = writeBatch(db);
  let n = 0;
  appts.forEach((a) => {
    if (a.data().patientName !== name || a.data().patientPhone !== phone) {
      batch.update(a.ref, { patientName: name, patientPhone: phone });
      n++;
    }
  });
  if (n) send(batch.commit());
}

export async function savePatient(p) {
  const data = clean(p);
  if (p.id) {
    send(updateDoc(doc(patientsCol(), p.id), { ...data, updatedAt: serverTimestamp() }));
    syncAppointments(p).catch(report);
    return p.id;
  }
  // El id se genera en el teléfono, sin esperar al servidor.
  const ref = doc(patientsCol());
  send(setDoc(ref, { ...data, createdAt: serverTimestamp() }));
  return ref.id;
}

export async function deletePatient(id) {
  send(deleteDoc(doc(patientsCol(), id)));
}

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
    send(updateDoc(doc(apptsCol(), a.id), { ...data, updatedAt: serverTimestamp() }));
    return a.id;
  }
  const ref = doc(apptsCol());
  send(setDoc(ref, { ...data, createdAt: serverTimestamp() }));
  return ref.id;
}

export async function updateAppointment(id, partial) {
  send(updateDoc(doc(apptsCol(), id), partial));
}
export async function deleteAppointment(id) {
  send(deleteDoc(doc(apptsCol(), id)));
}
