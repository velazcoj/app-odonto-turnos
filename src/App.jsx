import { useEffect, useMemo, useState } from 'react';
import store from './data/store.js';
import { AppCtx } from './context.js';
import { useRoute } from './lib/router.js';
import Login from './screens/Login.jsx';
import Today from './screens/Today.jsx';
import Agenda from './screens/Agenda.jsx';
import Patients from './screens/Patients.jsx';
import PatientDetail from './screens/PatientDetail.jsx';
import PatientForm from './screens/PatientForm.jsx';
import AppointmentForm from './screens/AppointmentForm.jsx';
import Settings from './screens/Settings.jsx';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = verificando
  const [patients, setPatients] = useState(null);
  const [settings, setSettings] = useState({});
  const [settingsReady, setSettingsReady] = useState(false);
  const route = useRoute();

  useEffect(() => store.onAuth(setUser), []);

  useEffect(() => {
    if (!user) { setPatients(null); setSettingsReady(false); return undefined; }
    const u1 = store.watchPatients(setPatients);
    const u2 = store.watchSettings((s) => { setSettings(s); setSettingsReady(true); });
    return () => { u1(); u2(); };
  }, [user]);

  const patientsById = useMemo(() => Object.fromEntries((patients || []).map((p) => [p.id, p])), [patients]);
  const ctx = useMemo(() => ({ user, patients, patientsById, settings, settingsReady }),
    [user, patients, patientsById, settings, settingsReady]);

  if (user === undefined) return <div className="splash" />;
  if (!user) return <Login />;

  const [a, b, c] = route.parts;
  let screen;
  if (a === 'agenda') screen = <Agenda params={route.params} />;
  else if (a === 'pacientes') screen = <Patients />;
  else if (a === 'paciente' && b === 'nuevo') screen = <PatientForm key="new" />;
  else if (a === 'paciente' && c === 'editar') screen = <PatientForm key={'e' + b} id={b} />;
  else if (a === 'paciente' && b) screen = <PatientDetail key={b} id={b} />;
  else if (a === 'turno' && b) screen = <AppointmentForm key={b + location.hash} id={b} params={route.params} />;
  else if (a === 'ajustes') screen = <Settings />;
  else screen = <Today />;

  return (
    <AppCtx.Provider value={ctx}>
      {store.isDemo && <div className="demo-banner">Modo demo · datos de ejemplo</div>}
      {screen}
    </AppCtx.Provider>
  );
}
