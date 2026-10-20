export const TYPES = [
  { id: 'consulta', label: 'Consulta', color: '#2563EB', bg: '#DBEAFE', ink: '#1E3A8A' },
  { id: 'limpieza', label: 'Limpieza', color: '#0F766E', bg: '#CCEDE7', ink: '#134E4A' },
  { id: 'control', label: 'Control', color: '#7C3AED', bg: '#EDE9FE', ink: '#4C1D95' },
  { id: 'tratamiento', label: 'Tratamiento', color: '#BE185D', bg: '#FCE7F3', ink: '#831843' },
  { id: 'urgencia', label: 'Urgencia', color: '#EA580C', bg: '#FFEDD5', ink: '#7C2D12' },
];

export const typeOf = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

export const STATUSES = [
  { id: 'pendiente', label: 'A confirmar', bg: '#EEF1F4', ink: '#475569' },
  { id: 'confirmado', label: 'Confirmado', bg: '#CCEDE7', ink: '#0F5F58' },
  { id: 'asistio', label: 'Asistió', bg: '#DCFCE7', ink: '#166534' },
  { id: 'ausente', label: 'Ausente', bg: '#FFEDD5', ink: '#9A3412' },
  { id: 'cancelado', label: 'Canceló', bg: '#FEE2E2', ink: '#991B1B' },
];

export const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

export const DURATIONS = [15, 30, 45, 60, 90];

export const INSURANCES = ['Particular', 'OSDE', 'Swiss Medical', 'Galeno', 'Medifé', 'Omint', 'Sancor Salud', 'IOMA', 'PAMI', 'OSECAC', 'OSDEPYM', 'Accord Salud'];

export const DEFAULT_SETTINGS = {
  dayStart: '09:00',
  dayEnd: '20:00',
  reminderTemplate:
    'Hola {nombre}! Te recuerdo tu turno {dia} a las {hora} en el consultorio. ¿Me confirmás? Gracias!',
};

export function fillTemplate(tpl, { nombre, dia, hora }) {
  return (tpl || DEFAULT_SETTINGS.reminderTemplate)
    .replaceAll('{nombre}', nombre || '')
    .replaceAll('{dia}', dia || '')
    .replaceAll('{hora}', hora || '');
}

// "Lucía Fernández" a partir del paciente
export const fullName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '');
// Nombre a mostrar en un turno: el del paciente actual; el guardado en el turno queda de respaldo
// (paciente borrado, o turnos que no llegaron a actualizarse después de editarlo).
export const apptName = (a, patientsById) => fullName(patientsById?.[a.patientId]) || a.patientName || '';
export const initials = (p) => `${(p?.firstName || '?')[0] || ''}${(p?.lastName || '')[0] || ''}`.toUpperCase();

// Para buscar sin importar tildes ni mayúsculas
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
