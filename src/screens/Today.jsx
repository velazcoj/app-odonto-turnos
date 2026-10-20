import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TabBar, Fab, StatusBadge, TypeLabel, SectionTitle, Empty } from '../components/ui.jsx';
import AppointmentSheet, { reminderLink } from '../components/AppointmentSheet.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { useAppointments, useMinuteTick } from '../lib/hooks.js';
import { todayISO, addDays, formatLong, timeToMin, minToTime, nowMin, durationLabel } from '../lib/dates.js';
import { telLink } from '../lib/phone.js';
import { apptName } from '../lib/constants.js';

const active = (a) => a.kind !== 'bloqueo' && a.status !== 'cancelado' && a.status !== 'ausente';

export default function Today() {
  useMinuteTick();
  const { patientsById, settings } = useApp();
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const list = useAppointments(today, tomorrow);
  const [sel, setSel] = useState(null);

  const todays = (list || []).filter((a) => a.date === today);
  const tomorrows = (list || []).filter((a) => a.date === tomorrow && active(a));
  const count = todays.filter((a) => a.kind !== 'bloqueo' && a.status !== 'cancelado').length;
  const now = nowMin();
  const next = todays.find((a) => active(a) && timeToMin(a.start) + (a.duration || 30) > now);
  const selAppt = sel && (list || []).find((a) => a.id === sel);

  let when = '';
  if (next) {
    const diff = timeToMin(next.start) - now;
    if (diff <= 0) when = 'Ahora';
    else if (diff < 60) when = `En ${diff} min`;
    else when = `En ${Math.floor(diff / 60)} h ${diff % 60 ? `${diff % 60} min` : ''}`.trim();
  }

  return (
    <div className="screen with-tabs">
      <header className="page-head">
        <div className="eyebrow">{formatLong(today)}</div>
        <div className="row-between">
          <h1>Hoy</h1>
          <div className="row gap8">
            <span className="pill">{count} {count === 1 ? 'turno' : 'turnos'}</span>
            <a className="icon-btn" href="#/ajustes" aria-label="Ajustes"><Icon name="settings" /></a>
          </div>
        </div>
      </header>

      {next && (
        <div className="next-card">
          <button className="next-info" onClick={() => setSel(next.id)}>
            <div className="next-when">Próximo · {when}</div>
            <div className="next-name">{apptName(next, patientsById)}</div>
            <div className="next-time">
              {next.start} – {minToTime(timeToMin(next.start) + (next.duration || 30))} · {durationLabel(next.duration || 30)}
            </div>
          </button>
          <div className="row gap10">
            {reminderLink(next, patientsById[next.patientId], settings) && (
              <a className="next-btn solid" target="_blank" rel="noreferrer" href={reminderLink(next, patientsById[next.patientId], settings)}>
                <Icon name="whatsapp" size={18} />WhatsApp
              </a>
            )}
            {telLink(patientsById[next.patientId]?.phone || next.patientPhone) && (
              <a className="next-btn outline" href={telLink(patientsById[next.patientId]?.phone || next.patientPhone)}>
                <Icon name="phone" size={18} />Llamar
              </a>
            )}
          </div>
        </div>
      )}

      <SectionTitle>Turnos del día</SectionTitle>
      {list === null ? <div className="loading">Cargando…</div> : todays.length === 0 ? (
        <Empty icon="calendar" title="Día libre" text="No hay turnos cargados para hoy."
          action={<a className="btn primary" href={`#/turno/nuevo?fecha=${today}`}>Dar un turno</a>} />
      ) : (
        <div className="day-list">
          {todays.map((a) => {
            const past = timeToMin(a.start) + (a.duration || 30) <= now;
            const isNext = next && a.id === next.id;
            if (a.kind === 'bloqueo') {
              return (
                <button key={a.id} className="day-row" onClick={() => setSel(a.id)}>
                  <span className="day-time muted">{a.start}</span>
                  <span className="appt-card block">{a.label || 'Bloqueado'} · {durationLabel(a.duration)}</span>
                </button>
              );
            }
            return (
              <button key={a.id} className={`day-row${past ? ' past' : ''}${a.status === 'cancelado' ? ' cancelled' : ''}`} onClick={() => setSel(a.id)}>
                <span className={`day-time${isNext ? ' accent' : ''}`}>{a.start}</span>
                <span className={`appt-card${isNext ? ' next' : ''}`}>
                  <span className="col gap3">
                    <span className="appt-name">{apptName(a, patientsById)}</span>
                    <TypeLabel type={a.type} />
                  </span>
                  <StatusBadge status={a.status} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tomorrows.length > 0 && (
        <>
          <SectionTitle>Recordatorios para mañana</SectionTitle>
          <div className="card list">
            {tomorrows.map((a) => {
              const link = reminderLink(a, patientsById[a.patientId], settings);
              return (
                <div key={a.id} className="list-row">
                  <div className="col gap3 grow">
                    <span className="appt-name">{apptName(a, patientsById)}</span>
                    <span className="muted small">{a.start} · <TypeLabel type={a.type} /></span>
                  </div>
                  {a.reminderSent ? (
                    <span className="sent"><Icon name="check" size={16} />Enviado</span>
                  ) : link ? (
                    <a className="btn small wa" href={link} target="_blank" rel="noreferrer"
                      onClick={() => store.updateAppointment(a.id, { reminderSent: true })}>
                      <Icon name="whatsapp" size={16} />Enviar
                    </a>
                  ) : <span className="muted small">Sin teléfono</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Fab to={`/turno/nuevo?fecha=${today}`} />
      <TabBar active="hoy" />
      {selAppt && <AppointmentSheet appt={selAppt} onClose={() => setSel(null)} />}
    </div>
  );
}
