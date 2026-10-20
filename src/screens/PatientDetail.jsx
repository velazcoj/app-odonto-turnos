import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TopBar, BackLink, Avatar, StatusBadge, TypeLabel, SectionTitle, Empty } from '../components/ui.jsx';
import AppointmentSheet from '../components/AppointmentSheet.jsx';
import { useApp } from '../context.js';
import { usePatientAppointments, useMinuteTick } from '../lib/hooks.js';
import { back, navigate } from '../lib/router.js';
import { fullName } from '../lib/constants.js';
import { formatDMY, age, todayISO, monthYear, formatShort, hasEnded } from '../lib/dates.js';
import { waLink, telLink } from '../lib/phone.js';

const ts = (v) => (v?.toDate ? v.toDate() : typeof v === 'number' ? new Date(v) : null);

// Fuera de PatientDetail: definida adentro, cada re-render (el tick de 30 s) desmontaba y volvía a crear las filas.
function ApptRow({ ap, today, onSelect }) {
  return (
    <button className="list-row" onClick={() => onSelect(ap.id)}>
      <span className="col gap2 grow">
        <span className="appt-name">{ap.date === today ? 'Hoy' : formatShort(ap.date)} · {ap.start}</span>
        <TypeLabel type={ap.type} />
      </span>
      <StatusBadge status={ap.status} />
    </button>
  );
}

export default function PatientDetail({ id }) {
  useMinuteTick();
  const { patientsById, patients } = useApp();
  const p = patientsById[id];
  const appts = usePatientAppointments(id);
  const [sel, setSel] = useState(null);

  if (!p) {
    return (
      <div className="screen">
        <TopBar left={<BackLink label="Pacientes" onClick={() => back('/pacientes')} />} />
        {patients === null ? <div className="loading">Cargando…</div>
          : <Empty icon="user" title="Paciente no encontrado" text="Puede que se haya eliminado." />}
      </div>
    );
  }

  const wa = waLink(p.phone, `Hola ${p.firstName}! `);
  const tel = telLink(p.phone);
  const since = ts(p.createdAt);
  const today = todayISO();
  const list = appts || [];
  const upcoming = list.filter((a) => !hasEnded(a)).reverse();
  const pastList = list.filter(hasEnded);
  const visits = pastList.filter((a) => a.status === 'asistio').length;
  // "Dar turno" repite motivo y duración del último turno (el último que pasó, si no el próximo).
  const last = pastList.find((a) => a.type) || upcoming.find((a) => a.type);
  const newAppt = `/turno/nuevo?paciente=${id}${last ? `&tipo=${last.type}&duracion=${last.duration || 30}` : ''}`;
  const a = age(p.birthDate);
  const selAppt = sel && list.find((x) => x.id === sel);

  const rows = [
    ['Teléfono', p.phone],
    ['DNI', p.dni],
    ['Nacimiento', p.birthDate && `${formatDMY(p.birthDate)}${a !== null ? ` · ${a} años` : ''}`],
    ['Obra social', p.insurance],
    ['N° afiliado', p.memberNumber],
    ['Email', p.email],
  ].filter(([, v]) => v);

  return (
    <div className="screen">
      <TopBar
        left={<BackLink label="Pacientes" onClick={() => back('/pacientes')} />}
        right={<a className="link-btn strong" href={`#/paciente/${id}/editar`}>Editar</a>}
      />

      <div className="profile">
        <Avatar patient={p} size={76} />
        <div className="profile-name">{fullName(p)}</div>
        <div className="muted">
          {[since && `Paciente desde ${monthYear(since)}`, visits ? `${visits} ${visits === 1 ? 'visita' : 'visitas'}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div className="quick-actions">
        {wa ? <a className="qa" href={wa} target="_blank" rel="noreferrer"><Icon name="whatsapp" />WhatsApp</a>
          : <span className="qa disabled"><Icon name="whatsapp" />WhatsApp</span>}
        {tel ? <a className="qa" href={tel}><Icon name="phone" />Llamar</a>
          : <span className="qa disabled"><Icon name="phone" />Llamar</span>}
        <button className="qa dark" onClick={() => navigate(newAppt)}><Icon name="calendarPlus" />Dar turno</button>
      </div>

      {rows.length > 0 && (
        <div className="card info">
          {rows.map(([k, v]) => (
            <div key={k} className="info-row"><span className="muted">{k}</span><span className="strong right">{v}</span></div>
          ))}
        </div>
      )}

      {p.notes && (
        <div className="note-card">
          <div className="note-label">Nota</div>
          <div className="note-text">{p.notes}</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <>
          <SectionTitle>Próximos turnos</SectionTitle>
          <div className="card list">{upcoming.map((ap) => <ApptRow key={ap.id} ap={ap} today={today} onSelect={setSel} />)}</div>
        </>
      )}

      <SectionTitle>Turnos anteriores</SectionTitle>
      {appts === null ? <div className="loading">Cargando…</div> : pastList.length === 0
        ? <div className="muted pad">Todavía no tiene turnos anteriores.</div>
        : <div className="card list">{pastList.slice(0, 30).map((ap) => <ApptRow key={ap.id} ap={ap} today={today} onSelect={setSel} />)}</div>}

      <div style={{ height: 40 }} />
      {selAppt && <AppointmentSheet appt={selAppt} onClose={() => setSel(null)} />}
    </div>
  );
}
