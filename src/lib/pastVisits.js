import { todayISO, addDays, hasEnded } from './dates.js';

// Resumen de los turnos viejos guardado en el teléfono (ver lib/visits.js): se completa una vez por día
// con los días nuevos y se rehace entero cada 30 días, para no leer de Firestore todos los turnos viejos
// cada vez que se abre la lista de pacientes. Recibe el store para poder probarlo aparte.
const REBUILD_DAYS = 30;
const keyFor = (user) => `turnos-visitas-v1:${user}`;

// La regla de "visita", la misma para la lista de pacientes y para "Para control": un turno que ya
// pasó, sin contar cancelados ni ausentes.
export const countsAsVisit = (status) => status !== 'cancelado' && status !== 'ausente';

// Próximo turno y última visita de cada paciente. past: el resumen ({ id: [paciente, día, estado] });
// live: los turnos recientes y futuros (cualquier orden).
export function buildVisits(past, live) {
  const next = {};
  const last = {};
  const visit = (pid, date, status) => {
    if (countsAsVisit(status) && !(last[pid] >= date)) last[pid] = date;
  };
  Object.values(past || {}).forEach(([pid, date, status]) => visit(pid, date, status));
  const sorted = [...(live || [])].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  for (const a of sorted) {
    if (a.kind === 'bloqueo' || !a.patientId) continue;
    if (hasEnded(a)) visit(a.patientId, a.date, a.status);
    else if (a.status !== 'cancelado' && !next[a.patientId]) next[a.patientId] = a;
  }
  return { next, last };
}

const read = (user) => {
  try { const c = JSON.parse(localStorage.getItem(keyFor(user))); return c?.v === 1 ? c : null; } catch { return null; }
};
const write = (user, c) => {
  try { localStorage.setItem(keyFor(user), JSON.stringify(c)); } catch { /* lleno */ }
};

// items: { [id del turno]: [paciente, día, estado] }, turnos anteriores a `until`.
export async function loadPast(until, store) {
  const user = store.userKey();
  const c = read(user);
  if (c && c.upTo === until) return c.items;
  const today = todayISO();
  const full = store.isDemo || !c || c.built < addDays(today, -REBUILD_DAYS) || c.upTo > until;
  const from = full ? '0000-00-00' : c.upTo;
  let docs;
  try {
    docs = await store.getAppointmentsBetween(from, until);
  } catch {
    return c?.items || {}; // sin conexión: lo que había, y se completa la próxima vez
  }
  const items = full ? {} : { ...c.items };
  for (const a of docs) {
    if (a.kind !== 'bloqueo' && a.patientId) items[a.id] = [a.patientId, a.date, a.status || 'pendiente'];
  }
  if (!store.isDemo) write(user, { v: 1, upTo: until, built: full ? today : c.built, items });
  return items;
}

// Un turno que se crea, edita, cambia de estado o se borra desde la app actualiza el resumen en el
// momento. change: el turno completo, solo lo que cambió (p. ej. { status }) o null si se borró.
export function patchPast(user, id, change) {
  const c = user && read(user);
  if (!c || !id) return;
  const prev = c.items[id];
  const it = change && {
    kind: change.kind,
    patientId: change.patientId !== undefined ? change.patientId : prev?.[0],
    date: change.date !== undefined ? change.date : prev?.[1],
    status: change.status !== undefined ? change.status : prev?.[2],
  };
  // Solo los turnos anteriores a la semana en vivo están en el resumen; los demás llegan solos.
  if (it && it.kind !== 'bloqueo' && it.patientId && it.date && it.date < c.upTo) {
    c.items[id] = [it.patientId, it.date, it.status || 'pendiente'];
  } else if (prev) {
    delete c.items[id];
  } else return;
  write(user, c);
}
