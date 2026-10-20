import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TabBar, Fab, StatusBadge } from '../components/ui.jsx';
import AppointmentSheet from '../components/AppointmentSheet.jsx';
import { useApp } from '../context.js';
import { useAppointments, useMinuteTick } from '../lib/hooks.js';
import { navigate } from '../lib/router.js';
import { typeOf, DEFAULT_SETTINGS, apptName } from '../lib/constants.js';
import {
  todayISO, addDays, weekStart, dayShort, dayNum, monthName, capitalize, formatLong,
  timeToMin, minToTime, durationLabel, isWorkDay,
} from '../lib/dates.js';

const occupies = (a) => a.status !== 'cancelado';

function buildTimeline(appts, dayStart, dayEnd) {
  const items = [];
  let cursor = timeToMin(dayStart);
  const end = timeToMin(dayEnd);
  // Hueco libre desde cursor hasta `to`, sin pasar del horario de cierre.
  const gap = (to, min) => {
    const t = Math.min(to, end);
    if (t - cursor >= min) items.push({ gap: true, from: cursor, to: t });
  };
  for (const a of appts) {
    const s = timeToMin(a.start);
    if (occupies(a)) {
      gap(s, 30);
      items.push({ appt: a });
      cursor = Math.max(cursor, s + (a.duration || 30));
    } else {
      // Un cancelado no ocupa lugar, pero el hueco anterior va antes que él para respetar el orden.
      gap(s, 15);
      items.push({ appt: a });
      cursor = Math.max(cursor, s);
    }
  }
  gap(end, 30);
  return items;
}

export default function Agenda({ params }) {
  useMinuteTick();
  const { settings, patientsById } = useApp();
  const today = todayISO();
  const [sel, setSelDate] = useState(params.fecha || today);
  const [selId, setSelId] = useState(null);
  // La misma pantalla puede recibir otra fecha por la URL (p. ej. al volver de reprogramar un turno).
  useEffect(() => { if (params.fecha) setSelDate(params.fecha); }, [params.fecha]);
  // Si pasó la medianoche con la agenda abierta mirando "hoy", seguir en el nuevo hoy.
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current === today) return;
    if (sel === prevToday.current) pick(today);
    prevToday.current = today;
  });
  const from = weekStart(sel);
  const to = addDays(from, 6);
  const list = useAppointments(from, to);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const dayStart = settings.dayStart || DEFAULT_SETTINGS.dayStart;
  const dayEnd = settings.dayEnd || DEFAULT_SETTINGS.dayEnd;

  const pick = (d) => { setSelDate(d); navigate(`/agenda?fecha=${d}`, { replace: true }); };
  const dayAppts = (list || []).filter((a) => a.date === sel);
  const workDays = settings.workDays || DEFAULT_SETTINGS.workDays;
  const workDay = isWorkDay(sel, workDays);
  // Un día que no atiende no ofrece huecos libres (los turnos que tenga se muestran igual).
  const timeline = buildTimeline(dayAppts, dayStart, dayEnd).filter((it) => workDay || !it.gap);
  const selAppt = selId && (list || []).find((a) => a.id === selId);
  const countFor = (d) => (list || []).filter((a) => a.date === d && a.kind !== 'bloqueo' && a.status !== 'cancelado').length;

  return (
    <div className="screen with-tabs">
      <header className="page-head">
        <div className="eyebrow">{sel === today ? 'Hoy' : formatLong(sel)}</div>
        <div className="row-between">
          <h1>{capitalize(monthName(sel))}</h1>
          <div className="row gap8">
            {weekStart(today) !== from && <button className="btn small light" onClick={() => pick(today)}>Hoy</button>}
            <button className="icon-btn white" aria-label="Semana anterior" onClick={() => pick(addDays(sel, -7))}><Icon name="chevronLeft" /></button>
            <button className="icon-btn white" aria-label="Semana siguiente" onClick={() => pick(addDays(sel, 7))}><Icon name="chevronRight" /></button>
          </div>
        </div>
      </header>

      <div className="week">
        {days.map((d) => {
          const n = countFor(d);
          const cls = ['week-day', d === sel && 'on', d === today && 'today', d < today && 'past'].filter(Boolean).join(' ');
          return (
            <button key={d} className={cls} onClick={() => pick(d)} aria-pressed={d === sel}
              aria-label={`${formatLong(d)}, ${n === 0 ? 'sin turnos' : n === 1 ? '1 turno' : `${n} turnos`}`}>
              <span className="wd">{dayShort(d)}</span>
              <span className="wn">{dayNum(d)}</span>
              <span className="dots">
                {Array.from({ length: Math.min(n, 4) }, (_, i) => <span key={i} className="dot" />)}
              </span>
            </button>
          );
        })}
      </div>

      {list === null ? <div className="loading">Cargando…</div> : (
        <div className="timeline">
          {timeline.map((it, i) => {
            if (it.gap) {
              return (
                <div key={'g' + i} className="tl-row">
                  <span className="tl-time">{minToTime(it.from)}</span>
                  <a className="tl-gap" href={`#/turno/nuevo?fecha=${sel}&hora=${minToTime(it.from)}`}>
                    <span>Libre · {durationLabel(it.to - it.from)}</span>
                    <Icon name="plus" size={20} stroke={2.2} />
                  </a>
                </div>
              );
            }
            const a = it.appt;
            if (a.kind === 'bloqueo') {
              return (
                <div key={a.id} className="tl-row">
                  <span className="tl-time">{a.start}</span>
                  <button className="tl-card block" onClick={() => setSelId(a.id)}>
                    {a.label || 'Bloqueado'} · {durationLabel(a.duration)}
                  </button>
                </div>
              );
            }
            const t = typeOf(a.type);
            return (
              <div key={a.id} className={`tl-row${a.status === 'cancelado' ? ' cancelled' : ''}`}>
                <span className="tl-time">{a.start}</span>
                <button className="tl-card" style={{ background: t.bg, color: t.ink }} onClick={() => setSelId(a.id)}>
                  <span className="col gap3">
                    <span className="tl-name">{apptName(a, patientsById)}</span>
                    <span className="tl-sub" style={{ color: t.color }}>{t.label} · {durationLabel(a.duration || 30)}</span>
                  </span>
                  {a.status !== 'pendiente' && <StatusBadge status={a.status} />}
                </button>
              </div>
            );
          })}
          {timeline.length === 0 && (
            <div className="loading">{workDay ? 'Sin horario de atención configurado.' : 'No atendés este día. Lo podés cambiar en Ajustes.'}</div>
          )}
        </div>
      )}

      <Fab to={`/turno/nuevo?fecha=${sel}`} />
      <TabBar active="agenda" />
      {selAppt && <AppointmentSheet appt={selAppt} onClose={() => setSelId(null)} />}
    </div>
  );
}
