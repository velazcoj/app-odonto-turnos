import Icon from './Icon.jsx';
import { Sheet, TypeLabel, TypeIcon } from './ui.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { navigate } from '../lib/router.js';
import { STATUSES, fillTemplate, DEFAULT_SETTINGS, apptName } from '../lib/constants.js';
import { formatLong, relativeDay, timeToMin, minToTime, durationLabel } from '../lib/dates.js';
import { waLink, telLink, noWaText, onWhatsAppClick } from '../lib/phone.js';

export function reminderLink(appt, patient, settings) {
  const phone = patient?.phone || appt.patientPhone;
  const text = fillTemplate(settings?.reminderTemplate || DEFAULT_SETTINGS.reminderTemplate, {
    nombre: patient?.firstName || (appt.patientName || '').split(' ')[0],
    dia: relativeDay(appt.date),
    hora: appt.start,
  });
  return waLink(phone, text);
}

export default function AppointmentSheet({ appt, onClose }) {
  const { patientsById, settings } = useApp();
  if (!appt) return null;
  const isBlock = appt.kind === 'bloqueo';
  const patient = patientsById[appt.patientId];
  const phone = patient?.phone || appt.patientPhone;
  const name = apptName(appt, patientsById);
  const end = minToTime(timeToMin(appt.start) + (appt.duration || 30));
  const wa = !isBlock && reminderLink(appt, patient, settings);
  const tel = !isBlock && telLink(phone);

  const setStatus = (status) => store.updateAppointment(appt.id, { status });
  const remove = async () => {
    const what = isBlock ? 'este bloqueo' : `el turno de ${name}`;
    if (!window.confirm(`¿Eliminar ${what}?`)) return;
    await store.deleteAppointment(appt.id);
    onClose();
  };
  const edit = () => { onClose(); navigate(`/turno/${appt.id}`); };
  const openPatient = () => { onClose(); navigate(`/paciente/${appt.patientId}`); };

  return (
    <Sheet open onClose={onClose} title={isBlock ? 'Bloqueo' : 'Turno'}>
      <div className="sheet-head">
        {isBlock
          ? <span className="dl-icon block"><Icon name="lock" size={20} stroke={1.8} /></span>
          : <TypeIcon type={appt.type} size={48} variant="tint" />}
        <div className="grow">
          <div className="sheet-title">{isBlock ? (appt.label || 'Horario bloqueado') : name}</div>
          <div className="sheet-sub">
            {formatLong(appt.date)} · {appt.start} – {end}
            {!isBlock && <> · <TypeLabel type={appt.type} /></>}
          </div>
          {appt.notes && <div className="sheet-note">{appt.notes}</div>}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
      </div>

      {!isBlock && (
        <>
          <div className="sheet-label">Estado</div>
          <div className="status-grid">
            {STATUSES.map((s) => (
              <button key={s.id} className={appt.status === s.id ? 'status-btn on' : 'status-btn'} aria-pressed={appt.status === s.id}
                style={appt.status === s.id ? { background: s.bg, color: s.ink, borderColor: s.ink } : undefined}
                onClick={() => setStatus(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="action-row">
            {wa ? (
              <a className="action primary" href={wa}
                onClick={onWhatsAppClick(() => store.updateAppointment(appt.id, { reminderSent: true }))}>
                <Icon name="whatsapp" />Recordar
              </a>
            ) : <span className="action disabled" aria-disabled="true"><Icon name="whatsapp" />{noWaText(phone)}</span>}
            {tel ? <a className="action" href={tel}><Icon name="phone" />Llamar</a>
              : <span className="action disabled" aria-disabled="true"><Icon name="phone" />Sin teléfono</span>}
            {patient && <button className="action" onClick={openPatient}><Icon name="user" />Paciente</button>}
          </div>
          {appt.reminderSent && (
            <button className="hint ok" onClick={() => {
              if (window.confirm('¿Marcar el recordatorio como no enviado?')) store.updateAppointment(appt.id, { reminderSent: false });
            }}>
              <Icon name="check" size={16} /> Recordatorio enviado
            </button>
          )}
        </>
      )}
      {isBlock && <div className="hint">{durationLabel(appt.duration)} sin turnos.</div>}

      <div className="action-row secondary">
        <button className="btn ghost" onClick={edit}><Icon name="edit" size={18} />Editar</button>
        <button className="btn ghost danger" onClick={remove}><Icon name="trash" size={18} />Eliminar</button>
      </div>
    </Sheet>
  );
}
