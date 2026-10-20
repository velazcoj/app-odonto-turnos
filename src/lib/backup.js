// Copia de seguridad: un JSON con todo (para restaurar con un script si hiciera falta) y dos CSV para
// abrir en Excel o Numbers. Sin restauración desde la app.
import { toISO } from './dates.js';
import { typeOf, statusOf } from './constants.js';

// Timestamps de Firestore (y los números del modo demo) → texto ISO.
const iso = (v) => (v?.toDate ? v.toDate().toISOString() : typeof v === 'number' ? new Date(v).toISOString() : v);
const plain = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, iso(v)]));

// CSV con ";" (el separador que espera Excel en español) y BOM UTF-8 para que se vean bien las tildes.
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows) => `﻿${rows.map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;

export function buildBackup({ patients, appointments, settings }, now = new Date()) {
  const stamp = toISO(now);
  const byName = [...patients].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es'));
  const byDate = [...appointments].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));

  const json = JSON.stringify({
    app: 'turnos-odonto', version: 1, exportedAt: now.toISOString(),
    settings, patients: patients.map(plain), appointments: appointments.map(plain),
  }, null, 2);

  const pacientes = csv([
    ['Apellido', 'Nombre', 'Celular', 'DNI', 'Nacimiento', 'Obra social', 'N° afiliado', 'Email', 'Nota'],
    ...byName.map((p) => [p.lastName, p.firstName, p.phone, p.dni, p.birthDate, p.insurance, p.memberNumber, p.email, p.notes]),
  ]);
  const turnos = csv([
    ['Fecha', 'Hora', 'Duración (min)', 'Tipo', 'Paciente', 'Teléfono', 'Motivo', 'Estado', 'Recordatorio enviado', 'Nota'],
    ...byDate.map((a) => (a.kind === 'bloqueo'
      ? [a.date, a.start, a.duration, 'Bloqueo', a.label, '', '', '', '', a.notes]
      : [a.date, a.start, a.duration, 'Turno', a.patientName, a.patientPhone, typeOf(a.type).label, statusOf(a.status).label,
        a.reminderSent ? 'Sí' : 'No', a.notes])),
  ]);

  return {
    counts: { patients: patients.length, appointments: appointments.filter((a) => a.kind !== 'bloqueo').length },
    parts: [
      { name: `turnos-backup-${stamp}.json`, type: 'application/json', text: json },
      { name: `pacientes-${stamp}.csv`, type: 'text/csv', text: pacientes },
      { name: `turnos-${stamp}.csv`, type: 'text/csv', text: turnos },
    ],
  };
}

// Archivos para la hoja de compartir. Safari no siempre acepta application/json o text/csv:
// si no los acepta, se prueba como texto plano (la extensión del nombre se mantiene).
export function shareableFiles(parts) {
  const make = (plainText) => parts.map((p) => new File([p.text], p.name, { type: plainText ? 'text/plain' : p.type }));
  if (!navigator.canShare) return null;
  for (const plainText of [false, true]) {
    const files = make(plainText);
    try { if (navigator.canShare({ files })) return files; } catch { /* sigue */ }
  }
  return null;
}
