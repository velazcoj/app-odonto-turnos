import { useState } from 'react';
import { TopBar, Empty } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import store from '../data/store.js';
import { useApp } from '../context.js';
import { back, navigate } from '../lib/router.js';
import { usePatientAppointments } from '../lib/hooks.js';
import { justCreated } from './PatientDetail.jsx';
import { hasEnded } from '../lib/dates.js';
import { INSURANCES, findDuplicate, duplicateQuestion, cap, displayName } from '../lib/constants.js';

const EMPTY = { firstName: '', lastName: '', phone: '', dni: '', birthDate: '', insurance: '', memberNumber: '', email: '', notes: '' };

export default function PatientForm({ id }) {
  const { patients, patientsById } = useApp();
  // El formulario toma los datos una sola vez: si se abre antes de que lleguen los pacientes
  // (recarga en esta pantalla) quedaría vacío y al guardar borraría teléfono, DNI, etc.
  if (id && !patientsById[id]) {
    return (
      <div className="screen">
        <TopBar left={<button type="button" className="link-btn muted" onClick={() => back(`/paciente/${id}`)}>Cancelar</button>} />
        {patients === null ? <div className="loading">Cargando…</div>
          : <Empty icon="user" title="Paciente no encontrado" text="Puede que se haya eliminado." />}
      </div>
    );
  }
  return <PatientFields id={id} existing={id ? patientsById[id] : null} />;
}

// Editar o crear lo decide el id de la ruta, no si el paciente está cargado.
function PatientFields({ id, existing }) {
  const { patients } = useApp();
  const appts = usePatientAppointments(id);
  const [f, setF] = useState(() => ({ ...EMPTY, ...(existing || {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!f.firstName.trim() || !f.lastName.trim()) { setError('Completá nombre y apellido.'); return; }
    const dup = !id && findDuplicate(patients, f);
    if (dup && !window.confirm(duplicateQuestion(dup))) return;
    setSaving(true);
    setError('');
    try {
      const data = {
        ...f,
        firstName: cap(f.firstName.trim()),
        lastName: cap(f.lastName.trim()),
        phone: f.phone.trim(), dni: f.dni.trim(), email: f.email.trim(),
        insurance: f.insurance.trim(), memberNumber: f.memberNumber.trim(), notes: f.notes.trim(),
      };
      delete data.createdAt; delete data.updatedAt;
      const newId = await store.savePatient(id ? { ...data, id } : data);
      if (id) back(`/paciente/${id}`);
      else {
        justCreated.add(newId);
        navigate(`/paciente/${newId}`, { replace: true });
      }
    } catch (err) {
      setError('No se pudo guardar. Revisá la conexión e intentá de nuevo.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar a ${displayName(existing)}?`)) return;
    // Los turnos que ya pasaron quedan como historial; los próximos, si ella quiere, se borran también.
    const upcoming = (appts || []).filter((a) => !hasEnded(a));
    const n = upcoming.length;
    const alsoAppts = n > 0 && window.confirm(n === 1
      ? 'Tiene 1 turno próximo. ¿Borrarlo también?'
      : `Tiene ${n} turnos próximos. ¿Borrarlos también?`);
    await store.deletePatient(id, alsoAppts ? upcoming.map((a) => a.id) : []);
    navigate('/pacientes', { replace: true });
  };

  return (
    <form className="screen" onSubmit={save}>
      <TopBar
        left={<button type="button" className="link-btn muted" onClick={() => back(id ? `/paciente/${id}` : '/pacientes')}>Cancelar</button>}
        title={id ? 'Editar paciente' : 'Nuevo paciente'}
        right={<button type="submit" className="link-btn strong" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>}
      />

      <div className="form">
        <div className="field-row">
          <label className="field"><span>Nombre *</span>
            <input value={f.firstName} onChange={set('firstName')} autoComplete="off" autoCapitalize="words" autoFocus={!id} /></label>
          <label className="field"><span>Apellido *</span>
            <input value={f.lastName} onChange={set('lastName')} autoComplete="off" autoCapitalize="words" /></label>
        </div>
        <label className="field"><span>Celular</span>
          <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="11 5555 0142" />
          <small>Con código de área, sin 0 ni 15. Se usa para WhatsApp.</small></label>
        <div className="field-row">
          <label className="field"><span>DNI</span>
            <input inputMode="numeric" value={f.dni} onChange={set('dni')} /></label>
          {/* El selector de fecha de iOS no tiene una forma confiable de dejarla vacía: "Borrar" lo hace. */}
          <div className="field">
            <span className="field-head">
              <label htmlFor="pf-birth">Nacimiento</label>
              {f.birthDate && (
                <button type="button" className="field-clear" onClick={() => setF((x) => ({ ...x, birthDate: '' }))}>Borrar</button>
              )}
            </span>
            <input id="pf-birth" type="date" value={f.birthDate} onChange={set('birthDate')} />
          </div>
        </div>
        <div className="field-row">
          <label className="field"><span>Obra social</span>
            <input list="insurances" value={f.insurance} onChange={set('insurance')} autoComplete="off" /></label>
          <label className="field"><span>N° afiliado</span>
            <input value={f.memberNumber} onChange={set('memberNumber')} /></label>
        </div>
        <datalist id="insurances">{INSURANCES.map((i) => <option key={i} value={i} />)}</datalist>
        <label className="field"><span>Email</span>
          <input type="email" inputMode="email" value={f.email} onChange={set('email')} autoCapitalize="off" /></label>
        <label className="field"><span>Nota</span>
          <textarea rows={3} value={f.notes} onChange={set('notes')} placeholder="Ej.: prefiere turnos a la tarde" /></label>

        {error && <div className="error" role="alert">{error}</div>}
        <button type="submit" className="btn primary block" disabled={saving}>{saving ? 'Guardando…' : 'Guardar paciente'}</button>
        {id && (
          <button type="button" className="btn ghost danger block" onClick={remove} disabled={appts === null}><Icon name="trash" size={18} />Eliminar paciente</button>
        )}
      </div>
    </form>
  );
}
