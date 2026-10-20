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

// Días de la semana como los cuenta Date.getDay() (0 = domingo), en el orden de la agenda.
export const WEEKDAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [0, 'Dom']];

export const DEFAULT_SETTINGS = {
  dayStart: '09:00',
  dayEnd: '20:00',
  workDays: [1, 2, 3, 4, 5], // si no está guardado, de lunes a viernes
  reminderTemplate:
    'Hola {nombre}! Te recuerdo tu turno {dia} a las {hora} en el consultorio. ¿Me confirmás? Gracias!',
};

export function fillTemplate(tpl, { nombre, dia, hora }) {
  return (tpl || DEFAULT_SETTINGS.reminderTemplate)
    .replaceAll('{nombre}', nombre || '')
    .replaceAll('{dia}', dia || '')
    .replaceAll('{hora}', hora || '');
}

// Primera letra de cada palabra en mayúscula ("maría josé" → "María José"); el resto queda como se escribió.
export const cap = (s) => s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1));

// "Lucía Fernández" a partir del paciente
export const fullName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '');
// Nombre a mostrar en un turno: el del paciente actual; el guardado en el turno queda de respaldo
// (paciente borrado, o turnos que no llegaron a actualizarse después de editarlo).
export const apptName = (a, patientsById) => fullName(patientsById?.[a.patientId]) || a.patientName || '';
export const initials = (p) => `${(p?.firstName || '?')[0] || ''}${(p?.lastName || '')[0] || ''}`.toUpperCase();

// Para buscar sin importar tildes ni mayúsculas
export const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Posible duplicado al crear: mismo nombre y apellido (en cualquier orden) o mismo DNI. El celular no
// cuenta: es común cargar a los chicos con el de la madre o el padre.
const digits = (s) => String(s || '').replace(/\D/g, '');
const nameKey = (p) => [norm(p.firstName), norm(p.lastName)].sort().join(' ');
export function findDuplicate(patients, p) {
  const k = nameKey(p);
  const dni = digits(p.dni);
  return (patients || []).find((x) => nameKey(x) === k || (dni && digits(x.dni) === dni));
}
export const duplicateQuestion = (d) =>
  `Ya tenés a ${fullName(d)}${d.phone ? ` (${d.phone})` : ''}. ¿Crear otro paciente igual?`;
