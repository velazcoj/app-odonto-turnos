import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TabBar, StatusBadge, TypeLabel, TypeIcon, Empty, Brand } from '../components/ui.jsx';
import AppointmentSheet, { reminderLink } from '../components/AppointmentSheet.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { useAppointments, useMinuteTick } from '../lib/hooks.js';
import {
  todayISO, addDays, formatShort, timeToMin, nowMin, durationLabel, nextWorkDay, dayName, dayShort,
} from '../lib/dates.js';
import { telLink, noWaText } from '../lib/phone.js';
import { apptName, typeOf, DEFAULT_SETTINGS } from '../lib/constants.js';

const active = (a) => a.kind !== 'bloqueo' && a.status !== 'cancelado' && a.status !== 'ausente';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// Anillo de progreso: atendidos / turnos del día (sin cancelados ni bloqueos).
function Progress({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="ring" role="img" aria-label={`${done} de ${total} turnos atendidos`}
      style={{ background: `conic-gradient(var(--mint) 0 ${pct}%, #232A31 ${pct}% 100%)` }}>
      <div className="ring-inner" aria-hidden="true">
        <span className="ring-num">{done}/{total}</span>
        <span className="ring-label">listos</span>
      </div>
    </div>
  );
}

export default function Today() {
  useMinuteTick();
  const { patientsById, settings } = useApp();
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  // Recordatorios para el próximo día que atiende (un viernes, los del lunes). Si en el medio hay un
  // día que no atiende pero con turnos (un sábado excepcional), también entran.
  const remDate = nextWorkDay(today, settings.workDays || DEFAULT_SETTINGS.workDays);
  const list = useAppointments(today, remDate);
  const [sel, setSel] = useState(null);

  const todays = (list || []).filter((a) => a.date === today);
  const tomorrows = (list || []).filter((a) => a.date > today && active(a));
  const severalDays = tomorrows.some((a) => a.date !== remDate);
  const remTitle = remDate === tomorrow && !severalDays ? 'Recordatorios para mañana'
    : `Recordatorios ${severalDays ? 'hasta' : 'para'} el ${dayName(remDate).toLowerCase()}`;
  const turnos = todays.filter((a) => a.kind !== 'bloqueo' && a.status !== 'cancelado');
  const done = turnos.filter((a) => a.status === 'asistio').length;
  const now = nowMin();
  // El que ya se marcó "Asistió" no es el próximo, aunque su horario no haya terminado.
  const next = todays.find((a) => active(a) && a.status !== 'asistio' && timeToMin(a.start) + (a.duration || 30) > now);
  const selAppt = sel && (list || []).find((a) => a.id === sel);

  let when = '';
  if (next) {
    const diff = timeToMin(next.start) - now;
    if (diff <= 0) when = 'Ahora';
    else if (diff < 60) when = `En ${diff} min`;
    else when = `En ${Math.floor(diff / 60)} h ${diff % 60 ? `${diff % 60} min` : ''}`.trim();
  }
  const nextWa = next && reminderLink(next, patientsById[next.patientId], settings);
  const nextPhone = next && (patientsById[next.patientId]?.phone || next.patientPhone);
  const nextTel = next && telLink(nextPhone);

  return (
    <div className="screen with-tabs today">
      <header className={next ? 'today-head with-next' : 'today-head'}>
        <div className="row-between">
          <Brand />
          <div className="row">
            <span className="today-date">{formatShort(today)}</span>
            <a className="icon-btn on-dark" href="#/ajustes" aria-label="Ajustes"><Icon name="settings" /></a>
          </div>
        </div>
        <div className="today-greet">
          <div className="col gap2">
            <div className="greet-hi">{greeting()},</div>
            <h1>{settings.displayName || DEFAULT_SETTINGS.displayName}</h1>
          </div>
          {turnos.length > 0 && <Progress done={done} total={turnos.length} />}
        </div>
      </header>

      {next && (
        <div className="next-card">
          <button className="next-info" onClick={() => setSel(next.id)}>
            <span className="next-hour">{next.start}</span>
            <span className="col gap2 grow">
              <span className="next-when">Próximo · {when}</span>
              <span className="next-name">{apptName(next, patientsById)}</span>
              <span className="next-sub">{typeOf(next.type).label} · {durationLabel(next.duration || 30)}</span>
            </span>
          </button>
          <div className="row gap10">
            {nextWa ? (
              <a className="next-btn solid" target="_blank" rel="noreferrer" href={nextWa}>
                <Icon name="whatsapp" size={18} />WhatsApp
              </a>
            ) : <span className="next-btn disabled" aria-disabled="true"><Icon name="whatsapp" size={18} />{noWaText(nextPhone)}</span>}
            {nextTel ? (
              <a className="next-btn soft" href={nextTel}>
                <Icon name="phone" size={18} />Llamar
              </a>
            ) : <span className="next-btn disabled" aria-disabled="true"><Icon name="phone" size={18} />Sin teléfono</span>}
          </div>
        </div>
      )}

      <div className="section-head">
        <h2>Agenda de hoy</h2>
        <a className="section-link" href={`#/agenda?fecha=${today}`}>Ver semana</a>
      </div>
      {list === null ? <div className="loading">Cargando…</div> : todays.length === 0 ? (
        <Empty icon="calendar" title="Día libre" text="No hay turnos cargados para hoy."
          action={<a className="btn primary" href={`#/turno/nuevo?fecha=${today}`}>Dar un turno</a>} />
      ) : (
        <div className="day-line">
          {todays.map((a) => {
            const past = timeToMin(a.start) + (a.duration || 30) <= now;
            if (a.kind === 'bloqueo') {
              return (
                <button key={a.id} className={`dl-row block${past ? ' past' : ''}`} onClick={() => setSel(a.id)}>
                  <span className="dl-icon block"><Icon name="lock" size={18} stroke={1.8} /></span>
                  <span className="col gap2 grow">
                    <span className="dl-name">{a.label || 'Bloqueado'}</span>
                    <span className="dl-sub"><span className="dl-time">{a.start}</span> · {durationLabel(a.duration)}</span>
                  </span>
                </button>
              );
            }
            const isNext = next && a.id === next.id;
            const cls = ['dl-row', past && 'past', a.status === 'cancelado' && 'cancelled', isNext && 'next'].filter(Boolean).join(' ');
            return (
              <button key={a.id} className={cls} onClick={() => setSel(a.id)}>
                <TypeIcon type={a.type} variant={isNext ? 'next' : 'ring'} />
                <span className="col gap2 grow">
                  <span className="dl-name">{apptName(a, patientsById)}</span>
                  <span className="dl-sub"><span className="dl-time">{a.start}</span> · {typeOf(a.type).label}</span>
                </span>
                <StatusBadge status={a.status} />
              </button>
            );
          })}
        </div>
      )}

      {tomorrows.length > 0 && (
        <>
          <div className="section-head">
            <h2>{remTitle}</h2>
          </div>
          <div className="card list">
            {tomorrows.map((a) => {
              const link = reminderLink(a, patientsById[a.patientId], settings);
              return (
                <div key={a.id} className="list-row">
                  <TypeIcon type={a.type} size={40} variant="tint" />
                  <div className="col gap2 grow">
                    <span className="appt-name">{apptName(a, patientsById)}</span>
                    <span className="muted small">{severalDays && `${dayShort(a.date)} `}{a.start} · <TypeLabel type={a.type} /></span>
                  </div>
                  {a.reminderSent ? (
                    // Abrir WhatsApp no garantiza que se haya mandado: tocar "Enviado" lo reabre para reenviar.
                    link ? (
                      <a className="sent" href={link} target="_blank" rel="noreferrer" aria-label="Enviado. Tocar para reenviar">
                        <Icon name="check" size={16} />Enviado
                      </a>
                    ) : <span className="sent"><Icon name="check" size={16} />Enviado</span>
                  ) : link ? (
                    <a className="btn small wa" href={link} target="_blank" rel="noreferrer"
                      onClick={() => store.updateAppointment(a.id, { reminderSent: true })}>
                      <Icon name="whatsapp" size={16} />Enviar
                    </a>
                  ) : <span className="muted small">{noWaText(patientsById[a.patientId]?.phone || a.patientPhone)}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <TabBar active="hoy" newTo={`/turno/nuevo?fecha=${today}`} />
      {selAppt && <AppointmentSheet appt={selAppt} onClose={() => setSel(null)} />}
    </div>
  );
}
