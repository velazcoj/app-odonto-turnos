// Fechas como texto 'YYYY-MM-DD' y horas como 'HH:mm', siempre en hora local.

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISO(s) {
  // Un dato roto no tiene que tirar abajo la pantalla entera.
  if (typeof s !== 'string' || !s) { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// ¿Atiende ese día? workDays: [0..6] como Date.getDay().
export const isWorkDay = (s, workDays) => workDays.includes(parseISO(s).getDay());

// Próximo día que atiende después de s (si no atiende ningún día, mañana).
export function nextWorkDay(s, workDays) {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(s, i);
    if (isWorkDay(d, workDays)) return d;
  }
  return addDays(s, 1);
}

export function weekStart(s) {
  const d = parseISO(s);
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - dow);
  return toISO(d);
}

export function dayName(s) { return DIAS[parseISO(s).getDay()]; }
export function dayShort(s) { return DIAS_CORTOS[parseISO(s).getDay()]; }
export function dayNum(s) { return parseISO(s).getDate(); }
export function monthName(s) { return MESES[parseISO(s).getMonth()]; }
export function capitalize(t) { return t ? t[0].toUpperCase() + t.slice(1) : t; }

// "Lunes 19 de octubre"
export function formatLong(s) {
  const d = parseISO(s);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// "Mié 21 oct"
export function formatShort(s) {
  const d = parseISO(s);
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

// "21/10/2026"
export function formatDMY(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// "hoy" / "mañana" / "el miércoles 21/10"
export function relativeDay(s) {
  const t = todayISO();
  if (s === t) return 'hoy';
  if (s === addDays(t, 1)) return 'mañana';
  const d = parseISO(s);
  return `el ${DIAS[d.getDay()].toLowerCase()} ${d.getDate()}/${d.getMonth() + 1}`;
}

export function timeToMin(t) {
  if (typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function nowMin() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ¿El turno ya terminó? (un turno de hoy a las 9 ya no es "próximo" a las 11)
export function hasEnded(a) {
  const t = todayISO();
  return a.date < t || (a.date === t && timeToMin(a.start) + (a.duration || 30) <= nowMin());
}

export function age(birthISO) {
  if (!birthISO) return null;
  const b = parseISO(birthISO);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export function durationLabel(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function monthYear(date) {
  return `${MESES[date.getMonth()]} ${date.getFullYear()}`;
}
