// Modo demo: mismos métodos que firebase.js, pero guardando en localStorage.
// Sirve para probar la app sin Firebase. No usar para datos reales.
import { todayISO, addDays } from '../lib/dates.js';
import { displayName } from '../lib/constants.js';

const KEY = 'turnos-demo-v1';
const listeners = new Set();

function seed() {
  const t = todayISO();
  const P = (id, firstName, lastName, phone, insurance, birthDate, notes = '') => ({
    id, firstName, lastName, phone, insurance, birthDate, notes, dni: '', email: '', memberNumber: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 400,
  });
  const patients = [
    P('p1', 'Lucía', 'Fernández', '11 5555-0142', 'OSDE', '1990-02-14', 'Prefiere turnos a la tarde.'),
    P('p2', 'Martín', 'Gómez', '11 5555-0177', 'Swiss Medical', '1985-07-02'),
    P('p3', 'Sofía', 'Ramírez', '11 5555-0190', 'Particular', '2001-11-23'),
    P('p4', 'Diego', 'Morales', '11 5555-0111', 'Galeno', '1978-03-30'),
    P('p5', 'Valentina', 'Ruiz', '11 5555-0123', 'IOMA', '1995-' + t.slice(5, 7) + '-28'),
    P('p6', 'Ana', 'González', '11 5555-0166', 'Medifé', '1969-09-12'),
  ];
  const name = (id) => displayName(patients.find((x) => x.id === id));
  const phone = (id) => patients.find((x) => x.id === id).phone;
  let n = 0;
  const A = (date, start, duration, type, status, patientId) => ({
    id: 'a' + ++n, date, start, duration, type, status, kind: 'turno',
    patientId, patientName: name(patientId), patientPhone: phone(patientId),
  });
  const appointments = [
    A(t, '09:00', 45, 'consulta', 'asistio', 'p2'),
    A(t, '10:30', 30, 'control', 'ausente', 'p3'),
    { id: 'b1', kind: 'bloqueo', label: 'Almuerzo', date: t, start: '13:00', duration: 60 },
    A(t, '15:00', 45, 'limpieza', 'confirmado', 'p1'),
    A(t, '16:00', 30, 'urgencia', 'pendiente', 'p4'),
    A(t, '17:00', 45, 'consulta', 'confirmado', 'p5'),
    A(addDays(t, 1), '10:00', 45, 'tratamiento', 'pendiente', 'p6'),
    A(addDays(t, 1), '11:00', 30, 'control', 'pendiente', 'p2'),
    A(addDays(t, 2), '16:30', 45, 'limpieza', 'pendiente', 'p3'),
    A(addDays(t, -60), '17:00', 30, 'consulta', 'asistio', 'p1'),
  ];
  return { patients, appointments, settings: {} };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* sin storage */ }
  const s = seed();
  save(s);
  return s;
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin storage */ }
}

// Se carga recién al primer uso: en producción este módulo viaja en el bundle pero no se usa, y no
// tiene que sembrar datos de ejemplo en localStorage.
let state;
const st = () => { if (!state) state = load(); return state; };
const commit = () => { save(state); listeners.forEach((l) => l()); };
const sub = (fn) => { fn(); listeners.add(fn); return () => listeners.delete(fn); };
const newId = () => Math.random().toString(36).slice(2, 10);

export const isDemo = true;

export function onAuth(cb) { setTimeout(() => cb({ uid: 'demo', email: 'demo@ejemplo.com' }), 0); return () => {}; }
export const login = async () => {};
export const logout = async () => { localStorage.removeItem(KEY); location.reload(); };
export const resetPassword = async () => {};

export const watchSettings = (cb) => sub(() => cb({ ...st().settings }));
export const saveSettings = async (settings) => { st().settings = { ...st().settings, ...settings }; commit(); };

export const watchPatients = (cb) => sub(() => cb(st().patients.map((p) => ({ ...p }))));

export async function savePatient(p) {
  if (p.id) {
    st().patients = st().patients.map((x) => (x.id === p.id ? { ...x, ...p } : x));
    const name = displayName(p);
    st().appointments = st().appointments.map((a) =>
      a.patientId === p.id ? { ...a, patientName: name, patientPhone: p.phone || '' } : a);
    commit();
    return p.id;
  }
  const id = newId();
  st().patients.push({ ...p, id, createdAt: Date.now() });
  commit();
  return id;
}
export const deletePatient = async (id, apptIds = []) => {
  st().patients = st().patients.filter((p) => p.id !== id);
  st().appointments = st().appointments.filter((a) => !apptIds.includes(a.id));
  commit();
};

export const watchAppointmentsRange = (from, to, cb) =>
  sub(() => cb(st().appointments.filter((a) => a.date >= from && a.date <= to).map((a) => ({ ...a }))));
export const watchPatientAppointments = (pid, cb) =>
  sub(() => cb(st().appointments.filter((a) => a.patientId === pid).map((a) => ({ ...a }))));
export const getAppointment = async (id) => { const a = st().appointments.find((x) => x.id === id); return a ? { ...a } : null; };

export async function saveAppointment(a) {
  if (a.id) {
    st().appointments = st().appointments.map((x) => (x.id === a.id ? { ...x, ...a } : x));
    commit();
    return a.id;
  }
  const id = newId();
  st().appointments.push({ ...a, id });
  commit();
  return id;
}
export const updateAppointment = async (id, partial) => {
  st().appointments = st().appointments.map((x) => (x.id === id ? { ...x, ...partial } : x));
  commit();
};
export const exportAll = async () => ({
  patients: st().patients.map((p) => ({ ...p })), appointments: st().appointments.map((a) => ({ ...a })), settings: { ...st().settings },
});
export const deleteAppointment = async (id) => { st().appointments = st().appointments.filter((a) => a.id !== id); commit(); };
