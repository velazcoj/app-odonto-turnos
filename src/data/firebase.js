import { initializeApp } from 'firebase/app';
import {
  initializeAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  browserLocalPersistence, indexedDBLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, query, where, updateDoc, deleteDoc, setDoc, getDoc, getDocFromCache, getDocs, getDocsFromServer, getDocFromServer,
  writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config.js';
import { displayName } from '../lib/constants.js';

// Solo se inicializa si hay configuración (si no, la app usa el modo demo).
let auth;
let db;
if (firebaseConfig.apiKey) {
  const app = initializeApp(firebaseConfig);
  // Sin popupRedirectResolver: solo se usa email y contraseña. getAuth() lo incluye y en iOS carga
  // apis.google.com y un iframe antes de saber quién está logueada (pantalla en blanco con mala señal).
  // La sesión hoy vive en localStorage; IndexedDB va segunda para encontrarla si quedó ahí.
  auth = initializeAuth(app, { persistence: [browserLocalPersistence, indexedDBLocalPersistence] });
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
// Si una suscripción falla, Firestore la corta y no vuelve a llamar: avisar para no quedar en "Cargando…".
const failed = (onError) => (err) => { console.error(err); onError?.(err); };

export const isDemo = false;

export function onAuth(cb) {
  return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null));
}
export const login = (email, pw) => signInWithEmailAndPassword(auth, email.trim(), pw);
export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim());

export function watchSettings(cb, onError) {
  return onSnapshot(doc(db, 'users', uid()), (s) => cb(s.data()?.settings || {}), failed(onError));
}
export async function saveSettings(settings) {
  send(setDoc(doc(db, 'users', uid()), { settings }, { merge: true }));
}

export function watchPatients(cb, onError) {
  return onSnapshot(patientsCol(), (s) => cb(withId(s)), failed(onError));
}

// Mantener el nombre ("Apellido, Nombre") y el teléfono actualizados en los turnos del paciente.
async function syncAppointments(p) {
  const name = displayName(p);
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

// Borra al paciente y, si se pide, algunos de sus turnos (los próximos), todo junto.
export async function deletePatient(id, apptIds = []) {
  const batch = writeBatch(db);
  batch.delete(doc(patientsCol(), id));
  apptIds.forEach((a) => batch.delete(doc(apptsCol(), a)));
  send(batch.commit());
}

export function watchAppointmentsRange(from, to, cb, onError) {
  const q = query(apptsCol(), where('date', '>=', from), where('date', '<=', to));
  return onSnapshot(q, (s) => cb(withId(s)), failed(onError));
}

export function watchPatientAppointments(patientId, cb, onError) {
  const q = query(apptsCol(), where('patientId', '==', patientId));
  return onSnapshot(q, (s) => cb(withId(s)), failed(onError));
}

export async function getAppointment(id) {
  // Primero la caché: el turno casi siempre está ahí, y getDoc espera al servidor (con señal mala, ~10 s).
  const ref = doc(apptsCol(), id);
  const s = await getDocFromCache(ref).catch(() => getDoc(ref));
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
// Copia de seguridad: todo desde el servidor (la caché puede tener solo lo que se miró). Sin conexión, falla.
export async function exportAll() {
  const [p, a, u] = await Promise.all([
    getDocsFromServer(patientsCol()), getDocsFromServer(apptsCol()), getDocFromServer(doc(db, 'users', uid())),
  ]);
  return { patients: withId(p), appointments: withId(a), settings: u.data()?.settings || {} };
}

export async function deleteAppointment(id) {
  send(deleteDoc(doc(apptsCol(), id)));
}
