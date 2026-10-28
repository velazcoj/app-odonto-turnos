import { todayISO, addDays } from './dates.js';

// Resumen de los turnos viejos guardado en el teléfono (ver lib/visits.js): se completa una vez por día
// con los días nuevos y se rehace entero cada 30 días, para no leer de Firestore todos los turnos viejos
// cada vez que se abre la lista de pacientes. Recibe el store para poder probarlo aparte.
const REBUILD_DAYS = 30;

// items: { [id del turno]: [paciente, día, estado] }, turnos anteriores a `until`.
export async function loadPast(until, store) {
  const key = `turnos-visitas-v1:${store.userKey()}`;
  let c = null;
  try { c = JSON.parse(localStorage.getItem(key)); } catch { /* sin resumen */ }
  if (c?.v !== 1) c = null;
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
  if (!store.isDemo) {
    try { localStorage.setItem(key, JSON.stringify({ v: 1, upTo: until, built: full ? today : c.built, items })); } catch { /* lleno */ }
  }
  return items;
}
