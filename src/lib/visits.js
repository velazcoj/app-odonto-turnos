import { useEffect, useMemo, useState } from 'react';
import store from '../data/store.js';
import { useAppointments } from './hooks.js';
import { loadPast } from './pastVisits.js';
import { todayISO, addDays, hasEnded } from './dates.js';

// Próximo turno y última visita de cada paciente, para la lista de pacientes. Los turnos de la última
// semana en adelante llegan en vivo; los anteriores, del resumen guardado en el teléfono (pastVisits.js).
const LIVE_DAYS = 7;

// { next: { [paciente]: turno }, last: { [paciente]: día } }, o null mientras carga. Última visita: el
// último turno que ya pasó, sin contar cancelados ni ausentes.
export function useVisits() {
  const until = addDays(todayISO(), -LIVE_DAYS);
  const live = useAppointments(until, '9999-12-31');
  const [past, setPast] = useState(null);
  useEffect(() => {
    let on = true;
    loadPast(until, store).then((p) => on && setPast(p));
    return () => { on = false; };
  }, [until]);

  return useMemo(() => {
    if (!live) return null;
    const next = {};
    const last = {};
    const visit = (pid, date, status) => {
      if (status !== 'cancelado' && status !== 'ausente' && !(last[pid] >= date)) last[pid] = date;
    };
    Object.values(past || {}).forEach(([pid, date, status]) => visit(pid, date, status));
    for (const a of live) { // ordenados por día y hora
      if (a.kind === 'bloqueo' || !a.patientId) continue;
      if (hasEnded(a)) visit(a.patientId, a.date, a.status);
      else if (a.status !== 'cancelado' && !next[a.patientId]) next[a.patientId] = a;
    }
    return { next, last };
  }, [live, past]);
}
