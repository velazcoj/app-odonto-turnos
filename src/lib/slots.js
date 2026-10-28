import { timeToMin, minToTime } from './dates.js';

// Horarios libres de un día para una duración: grilla cada `step` minutos desde el inicio del horario
// de atención, sin superponerse con turnos (los cancelados no ocupan) ni bloqueos, y terminando antes
// del cierre. `from` (minutos) deja afuera lo que ya pasó si el día es hoy; `excludeId`, el turno que
// se está editando.
export function freeSlots({ appts, dayStart, dayEnd, duration, excludeId, from = 0, step = 30, max = 8 }) {
  const busy = (appts || [])
    .filter((a) => a.id !== excludeId && a.status !== 'cancelado')
    .map((a) => { const s = timeToMin(a.start); return [s, s + (a.duration || 30)]; });
  const end = timeToMin(dayEnd);
  const out = [];
  for (let s = timeToMin(dayStart); s + duration <= end && out.length < max; s += step) {
    if (s < from) continue;
    if (busy.some(([bs, be]) => s < be && s + duration > bs)) continue;
    out.push(minToTime(s));
  }
  return out;
}
