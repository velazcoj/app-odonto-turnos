import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TopBar, Avatar, Sheet, Empty } from '../components/ui.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { useAppointments } from '../lib/hooks.js';
import { back } from '../lib/router.js';
import { TYPES, DURATIONS, DEFAULT_SETTINGS, fullName, norm } from '../lib/constants.js';
import { todayISO, timeToMin, minToTime, nowMin, durationLabel, formatLong } from '../lib/dates.js';

function defaultStart(date, dayStart) {
  if (date === todayISO()) {
    const n = Math.ceil((nowMin() + 1) / 30) * 30;
    return minToTime(Math.min(Math.max(n, timeToMin(dayStart)), 23 * 60 + 30));
  }
  return dayStart;
}

function PatientPicker({ open, onClose, onPick }) {
  const { patients } = useApp();
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [np, setNp] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const nq = norm(q);
    const l = (patients || []).filter((p) => !nq || nq.split(/\s+/).every((w) => norm(`${p.firstName} ${p.lastName} ${p.dni}`).includes(w)));
    return l.sort((a, b) => norm(a.lastName + a.firstName).localeCompare(norm(b.lastName + b.firstName))).slice(0, 50);
  }, [patients, q]);

  const startCreate = () => {
    const parts = q.trim().split(/\s+/);
    setNp({ firstName: parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : '', lastName: parts.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), phone: '' });
    setCreating(true);
  };

  const create = async () => {
    if (!np.firstName.trim() || !np.lastName.trim()) return;
    setSaving(true);
    const data = { firstName: np.firstName.trim(), lastName: np.lastName.trim(), phone: np.phone.trim() };
    const id = await store.savePatient(data);
    setSaving(false);
    setCreating(false);
    setQ('');
    onPick({ id, ...data });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Elegir paciente">
      {!creating ? (
        <>
          <label className="search in-sheet">
            <Icon name="search" size={20} stroke={2.2} />
            <span className="sr-only">Buscar paciente</span>
            <input type="search" placeholder="Buscar paciente" value={q} onChange={(e) => setQ(e.target.value)} autoCorrect="off" />
          </label>
          <button className="list-row link new-patient" onClick={startCreate}>
            <span className="avatar plus"><Icon name="userPlus" size={20} /></span>
            <span className="appt-name">{q.trim() ? `Nuevo paciente: "${q.trim()}"` : 'Nuevo paciente'}</span>
          </button>
          <div className="picker-list">
            {list.map((p) => (
              <button key={p.id} className="list-row link" onClick={() => { setQ(''); onPick(p); }}>
                <Avatar patient={p} size={38} />
                <span className="col gap2 grow">
                  <span className="appt-name">{p.lastName}, {p.firstName}</span>
                  {p.phone && <span className="muted small">{p.phone}</span>}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="form tight">
          <div className="sheet-title">Nuevo paciente</div>
          <div className="field-row">
            <label className="field"><span>Nombre</span>
              <input value={np.firstName} onChange={(e) => setNp({ ...np, firstName: e.target.value })} autoFocus /></label>
            <label className="field"><span>Apellido</span>
              <input value={np.lastName} onChange={(e) => setNp({ ...np, lastName: e.target.value })} /></label>
          </div>
          <label className="field"><span>Celular</span>
            <input type="tel" inputMode="tel" value={np.phone} onChange={(e) => setNp({ ...np, phone: e.target.value })} placeholder="11 5555 0142" />
            <small>Los demás datos los podés completar después en su ficha.</small></label>
          <div className="row gap10">
            <button className="btn ghost grow" onClick={() => setCreating(false)}>Volver</button>
            <button className="btn primary grow" onClick={create} disabled={saving || !np.firstName.trim() || !np.lastName.trim()}>
              {saving ? 'Guardando…' : 'Crear y elegir'}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default function AppointmentForm({ id, params }) {
  const { patients, patientsById, settings } = useApp();
  const isNew = id === 'nuevo';
  const dayStart = settings.dayStart || DEFAULT_SETTINGS.dayStart;
  const initialDate = params.fecha || todayISO();

  const [f, setF] = useState(() => ({
    kind: params.bloqueo ? 'bloqueo' : 'turno',
    patientId: params.paciente || '',
    date: initialDate,
    start: params.hora || defaultStart(initialDate, dayStart),
    duration: 45,
    type: 'consulta',
    status: 'pendiente',
    notes: '',
    label: 'Almuerzo',
  }));
  const [blockEnd, setBlockEnd] = useState(() => minToTime(timeToMin(f.start) + 60));
  const [loaded, setLoaded] = useState(isNew);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (isNew) return;
    store.getAppointment(id).then((a) => {
      if (a) {
        setF((x) => ({ ...x, ...a }));
        setBlockEnd(minToTime(timeToMin(a.start) + (a.duration || 30)));
      } else {
        setLoadError('Este turno ya no existe. Puede que se haya eliminado.');
      }
      setLoaded(true);
    }).catch(() => {
      setLoadError('No se pudo cargar el turno. Revisá la conexión e intentá de nuevo.');
      setLoaded(true);
    });
  }, [id, isNew]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const patient = patientsById[f.patientId];
  const patientName = patient ? fullName(patient) : f.patientName;
  const isBlock = f.kind === 'bloqueo';
  const duration = isBlock ? Math.max(timeToMin(blockEnd) - timeToMin(f.start), 0) : f.duration;

  const sameDay = useAppointments(f.date, f.date);
  const conflicts = (sameDay || []).filter((a) => {
    if (a.id === f.id || a.status === 'cancelado') return false;
    const s = timeToMin(a.start);
    const e = s + (a.duration || 30);
    const ms = timeToMin(f.start);
    return ms < e && ms + duration > s;
  });
  const nextAfter = (sameDay || []).filter((a) => a.id !== f.id && a.status !== 'cancelado' && timeToMin(a.start) >= timeToMin(f.start) + duration)[0];

  const save = async () => {
    setError('');
    if (!isBlock && !f.patientId) { setError('Elegí un paciente.'); return; }
    if (!f.date || !f.start) { setError('Completá día y hora.'); return; }
    if (isBlock && duration <= 0) { setError('La hora de fin tiene que ser posterior al inicio.'); return; }
    setSaving(true);
    const base = { id: isNew ? undefined : id, date: f.date, start: f.start, duration, notes: (f.notes || '').trim() };
    const data = isBlock
      ? { ...base, kind: 'bloqueo', label: (f.label || '').trim() || 'Bloqueado', patientId: null, patientName: null, patientPhone: null, type: null, status: null }
      : { ...base, kind: 'turno', patientId: f.patientId, patientName, patientPhone: patient?.phone || f.patientPhone || '', type: f.type, status: f.status || 'pendiente', label: null };
    try {
      await store.saveAppointment(data);
      back(`/agenda?fecha=${f.date}`);
    } catch {
      setError('No se pudo guardar. Revisá la conexión e intentá de nuevo.');
      setSaving(false);
    }
  };

  const cancel = <button className="link-btn muted" onClick={() => back('/hoy')}>Cancelar</button>;
  // patients === null: sin la lista, un turno con ?paciente= se guardaría sin nombre.
  if (!loaded || loadError || patients === null) {
    return (
      <div className="screen">
        <TopBar left={cancel} />
        {loadError ? <Empty icon="calendar" title="No se puede editar" text={loadError} />
          : <div className="loading">Cargando…</div>}
      </div>
    );
  }

  return (
    <div className="screen">
      <TopBar
        left={cancel}
        title={isNew ? (isBlock ? 'Bloquear horario' : 'Nuevo turno') : (isBlock ? 'Editar bloqueo' : 'Editar turno')}
        right={<button className="link-btn strong" onClick={save} disabled={saving}>{saving ? '…' : 'Guardar'}</button>}
      />

      <div className="form">
        {isNew && (
          <div className="segmented">
            <button className={!isBlock ? 'on' : ''} onClick={() => set('kind', 'turno')}>Turno</button>
            <button className={isBlock ? 'on' : ''} onClick={() => set('kind', 'bloqueo')}>Bloquear horario</button>
          </div>
        )}

        {!isBlock ? (
          <div className="field">
            <span>Paciente</span>
            <button className="picker-btn" onClick={() => setPicker(true)}>
              {f.patientId ? (
                <>
                  <Avatar patient={patient || { firstName: patientName, id: f.patientId }} size={38} />
                  <span className="appt-name grow">{patientName}</span>
                  <span className="link-strong">Cambiar</span>
                </>
              ) : (
                <>
                  <span className="avatar plus"><Icon name="user" size={20} /></span>
                  <span className="grow muted strong">Elegir paciente</span>
                  <Icon name="chevronRight" size={18} />
                </>
              )}
            </button>
          </div>
        ) : (
          <label className="field"><span>Motivo del bloqueo</span>
            <input value={f.label} onChange={(e) => set('label', e.target.value)} list="block-labels" />
            <datalist id="block-labels">
              {['Almuerzo', 'Vacaciones', 'Congreso', 'Trámite', 'Personal'].map((l) => <option key={l} value={l} />)}
            </datalist>
          </label>
        )}

        <div className="field-row">
          <label className="field"><span>Día</span>
            <input type="date" value={f.date} onChange={(e) => e.target.value && set('date', e.target.value)} /></label>
          <label className="field"><span>{isBlock ? 'Desde' : 'Hora'}</span>
            <input type="time" step="300" value={f.start} onChange={(e) => e.target.value && set('start', e.target.value)} /></label>
          {isBlock && (
            <label className="field"><span>Hasta</span>
              <input type="time" step="300" value={blockEnd} onChange={(e) => e.target.value && setBlockEnd(e.target.value)} /></label>
          )}
        </div>
        <div className="muted small">{formatLong(f.date)}</div>

        {sameDay && (conflicts.length > 0 ? (
          <div className="hint warn">
            Se superpone con {conflicts.map((c) => `${c.kind === 'bloqueo' ? (c.label || 'un bloqueo') : c.patientName} (${c.start})`).join(', ')}
          </div>
        ) : (
          <div className="hint ok">
            <Icon name="check" size={16} />
            Horario libre{nextAfter ? ` · el siguiente es a las ${nextAfter.start}` : ''}
          </div>
        ))}

        {!isBlock && (
          <>
            <div className="field">
              <span>Duración</span>
              <div className="chip-grid five">
                {DURATIONS.map((m) => (
                  <button key={m} className={f.duration === m ? 'chip-lg on' : 'chip-lg'} onClick={() => set('duration', m)}>
                    {m === 90 ? '1 h 30' : durationLabel(m)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Motivo</span>
              <div className="chip-grid two">
                {TYPES.map((t) => (
                  <button key={t.id} className="chip-type" onClick={() => set('type', t.id)}
                    style={{ borderColor: f.type === t.id ? t.color : 'transparent', background: f.type === t.id ? t.bg : '#FFFFFF' }}>
                    <span className="type-dot" style={{ background: t.color }} />{t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <label className="field"><span>Nota (opcional)</span>
          <textarea rows={2} value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>

        {error && <div className="error">{error}</div>}
        <button className="btn primary block big" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : isBlock ? 'Guardar bloqueo' : 'Guardar turno'}
        </button>
      </div>

      <PatientPicker open={picker} onClose={() => setPicker(false)}
        onPick={(p) => { setF((x) => ({ ...x, patientId: p.id, patientName: fullName(p), patientPhone: p.phone || '' })); setPicker(false); }} />
    </div>
  );
}
