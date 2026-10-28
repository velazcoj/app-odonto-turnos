import { useState } from 'react';
import { TopBar, SectionTitle, TabBar } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import TimeField from '../components/TimeField.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { DEFAULT_SETTINGS, WEEKDAYS, fillTemplate } from '../lib/constants.js';
import { buildBackup, shareableFiles } from '../lib/backup.js';

// Copia de seguridad en dos pasos: Safari solo deja abrir la hoja de compartir en respuesta directa a un
// toque, y si antes hay una espera de red (leer todo del servidor) la rechaza. Por eso primero se prepara
// y después se comparte con otro toque.
function Backup() {
  const [state, setState] = useState({ step: 'idle' });
  const prepare = async () => {
    setState({ step: 'preparing' });
    try {
      const backup = buildBackup(await store.exportAll());
      const files = shareableFiles(backup.parts);
      // Sin hoja de compartir: links de descarga (creados una sola vez).
      const downloads = files ? null : backup.parts.map((p) => ({ name: p.name, url: URL.createObjectURL(new Blob([p.text], { type: p.type })) }));
      setState({ step: 'ready', backup, files, downloads });
    } catch {
      setState({ step: 'error', msg: 'Necesitás conexión para preparar la copia. Probá de nuevo con señal.' });
    }
  };
  const share = async () => {
    try {
      await navigator.share({ files: state.files, title: 'Copia de seguridad de Turnos' });
    } catch (e) {
      if (e?.name !== 'AbortError') setState((s) => ({ ...s, msg: 'No se pudo compartir. Probá de nuevo.' }));
    }
  };
  const { step, backup } = state;
  return (
    <>
      <div className="muted small">Pacientes y turnos en un archivo JSON y dos planillas (CSV). Tiene datos personales: guardala en un lugar privado.</div>
      {step === 'ready' ? (
        <>
          <div className="hint ok" aria-live="polite">
            Lista: {backup.counts.patients} {backup.counts.patients === 1 ? 'paciente' : 'pacientes'} · {backup.counts.appointments} {backup.counts.appointments === 1 ? 'turno' : 'turnos'}
          </div>
          {state.files ? (
            <button className="btn primary block" onClick={share}><Icon name="share" size={18} />Compartir copia</button>
          ) : (
            <div className="col gap8">
              {state.downloads.map((d) => (
                <a key={d.name} className="btn ghost block" download={d.name} href={d.url}>
                  <Icon name="share" size={18} />Descargar {d.name}
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <button className="btn ghost block" onClick={prepare} disabled={step === 'preparing'}>
          {step === 'preparing' ? 'Preparando…' : 'Preparar copia de seguridad'}
        </button>
      )}
      {(step === 'error' || state.msg) && <div className="error" role="alert">{state.msg}</div>}
    </>
  );
}

export default function Settings() {
  const { settingsReady } = useApp();
  // El formulario toma los valores una sola vez: esperar a que lleguen los ajustes guardados,
  // si no, tras una recarga mostraría los de fábrica y al guardar pisaría su plantilla.
  if (!settingsReady) {
    return (
      <div className="screen with-tabs">
        <TopBar title="Ajustes" />
        <div className="loading">Cargando…</div>
        <TabBar active="ajustes" />
      </div>
    );
  }
  return <SettingsForm />;
}

function SettingsForm() {
  const { settings, user } = useApp();
  const [f, setF] = useState(() => ({ ...DEFAULT_SETTINGS, ...settings }));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [badTime, setBadTime] = useState({});
  const set = (k) => (e) => { setSaved(false); setF((x) => ({ ...x, [k]: e.target.value })); };
  const setTime = (k) => (v) => { setSaved(false); setF((x) => ({ ...x, [k]: v })); };
  const validity = (k) => (ok) => { if (!ok) setSaved(false); setBadTime((b) => (b[k] === !ok ? b : { ...b, [k]: !ok })); };
  const toggleDay = (d) => {
    setSaved(false);
    setF((x) => ({ ...x, workDays: x.workDays.includes(d) ? x.workDays.filter((w) => w !== d) : [...x.workDays, d].sort() }));
  };

  const save = async () => {
    setError('');
    if (badTime.dayStart || badTime.dayEnd) { setError('Revisá el horario de atención: escribilo como 09:00 o 900.'); return; }
    await store.saveSettings({
      displayName: (f.displayName || '').trim() || DEFAULT_SETTINGS.displayName,
      dayStart: f.dayStart, dayEnd: f.dayEnd, workDays: f.workDays, reminderTemplate: f.reminderTemplate,
    });
    setSaved(true);
  };

  return (
    <div className="screen with-tabs">
      <TopBar title="Ajustes" />
      <div className="form">
        <label className="field"><span>Nombre a mostrar</span>
          <input value={f.displayName} onChange={set('displayName')} autoComplete="off" autoCapitalize="words" />
          <small>Aparece en el saludo de la pantalla Hoy.</small></label>

        <SectionTitle>Horario de atención</SectionTitle>
        <div className="muted small">Se usa para mostrar los huecos libres en la agenda.</div>
        <div className="field-row">
          <TimeField label="Desde" value={f.dayStart} onChange={setTime('dayStart')} onValidity={validity('dayStart')} />
          <TimeField label="Hasta" value={f.dayEnd} onChange={setTime('dayEnd')} onValidity={validity('dayEnd')} />
        </div>
        <div className="field">
          <span>Días que atendés</span>
          <div className="chip-grid seven">
            {WEEKDAYS.map(([d, label]) => (
              <button key={d} className={f.workDays.includes(d) ? 'chip-lg on' : 'chip-lg'} aria-pressed={f.workDays.includes(d)} onClick={() => toggleDay(d)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <SectionTitle>Mensaje de recordatorio</SectionTitle>
        <label className="field"><span className="sr-only">Mensaje</span>
          <textarea rows={4} value={f.reminderTemplate} onChange={set('reminderTemplate')} /></label>
        <div className="muted small">Podés usar {'{nombre}'}, {'{dia}'} y {'{hora}'}. Ejemplo:</div>
        <div className="bubble">{fillTemplate(f.reminderTemplate, { nombre: 'Lucía', dia: 'mañana', hora: '15:00' })}</div>

        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary block big" onClick={save} aria-live="polite">{saved ? 'Guardado ✓' : 'Guardar ajustes'}</button>

        <SectionTitle>Copia de seguridad</SectionTitle>
        <Backup />

        <SectionTitle>Cuenta</SectionTitle>
        <div className="muted small">{store.isDemo ? 'Modo demo: los datos son de ejemplo y quedan solo en este teléfono.' : `Ingresaste como ${user?.email}`}</div>
        <button className="btn ghost danger block" onClick={() => { if (window.confirm(store.isDemo ? '¿Borrar los datos de ejemplo?' : '¿Cerrar sesión?')) store.logout(); }}>
          {store.isDemo ? 'Reiniciar demo' : 'Cerrar sesión'}
        </button>
      </div>
      <TabBar active="ajustes" />
    </div>
  );
}
