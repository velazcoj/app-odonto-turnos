import { useState } from 'react';
import { TopBar, BackLink, SectionTitle } from '../components/ui.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { back } from '../lib/router.js';
import { DEFAULT_SETTINGS, WEEKDAYS, fillTemplate } from '../lib/constants.js';

export default function Settings() {
  const { settingsReady } = useApp();
  // El formulario toma los valores una sola vez: esperar a que lleguen los ajustes guardados,
  // si no, tras una recarga mostraría los de fábrica y al guardar pisaría su plantilla.
  if (!settingsReady) {
    return (
      <div className="screen">
        <TopBar left={<BackLink label="Hoy" onClick={() => back('/hoy')} />} title="Ajustes" />
        <div className="loading">Cargando…</div>
      </div>
    );
  }
  return <SettingsForm />;
}

function SettingsForm() {
  const { settings, user } = useApp();
  const [f, setF] = useState(() => ({ ...DEFAULT_SETTINGS, ...settings }));
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setSaved(false); setF((x) => ({ ...x, [k]: e.target.value })); };
  const toggleDay = (d) => {
    setSaved(false);
    setF((x) => ({ ...x, workDays: x.workDays.includes(d) ? x.workDays.filter((w) => w !== d) : [...x.workDays, d].sort() }));
  };

  const save = async () => {
    await store.saveSettings({
      displayName: (f.displayName || '').trim() || DEFAULT_SETTINGS.displayName,
      dayStart: f.dayStart, dayEnd: f.dayEnd, workDays: f.workDays, reminderTemplate: f.reminderTemplate,
    });
    setSaved(true);
  };

  return (
    <div className="screen">
      <TopBar left={<BackLink label="Hoy" onClick={() => back('/hoy')} />} title="Ajustes" />
      <div className="form">
        <label className="field"><span>Nombre a mostrar</span>
          <input value={f.displayName} onChange={set('displayName')} autoComplete="off" autoCapitalize="words" />
          <small>Aparece en el saludo de la pantalla Hoy.</small></label>

        <SectionTitle>Horario de atención</SectionTitle>
        <div className="muted small">Se usa para mostrar los huecos libres en la agenda.</div>
        <div className="field-row">
          <label className="field"><span>Desde</span><input type="time" step="900" value={f.dayStart} onChange={set('dayStart')} /></label>
          <label className="field"><span>Hasta</span><input type="time" step="900" value={f.dayEnd} onChange={set('dayEnd')} /></label>
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

        <button className="btn primary block big" onClick={save} aria-live="polite">{saved ? 'Guardado ✓' : 'Guardar ajustes'}</button>

        <SectionTitle>Cuenta</SectionTitle>
        <div className="muted small">{store.isDemo ? 'Modo demo: los datos son de ejemplo y quedan solo en este teléfono.' : `Ingresaste como ${user?.email}`}</div>
        <button className="btn ghost danger block" onClick={() => { if (window.confirm(store.isDemo ? '¿Borrar los datos de ejemplo?' : '¿Cerrar sesión?')) store.logout(); }}>
          {store.isDemo ? 'Reiniciar demo' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
}
