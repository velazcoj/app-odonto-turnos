import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import store from '../data/store.js';

// "Demasiados intentos" no es lo mismo que "contraseña incorrecta": si no se lo dice, sigue probando
// y alarga el bloqueo.
function loginError(code = '') {
  if (code.includes('network')) return 'Sin conexión. Probá de nuevo.';
  if (code.includes('too-many-requests')) return 'Demasiados intentos. Esperá unos minutos o cambiá la contraseña con "Olvidé mi contraseña".';
  if (['invalid-credential', 'wrong-password', 'user-not-found', 'invalid-email', 'missing-password'].some((c) => code.includes(c))) {
    return 'Email o contraseña incorrectos.';
  }
  if (code.includes('user-disabled')) return 'Esta cuenta está deshabilitada.';
  return 'No se pudo ingresar. Probá de nuevo en un rato.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(''); setMsg('');
    try {
      await store.login(email, pw);
    } catch (ex) {
      setErr(loginError(ex?.code));
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) { setErr('Escribí tu email y tocá de nuevo "Olvidé mi contraseña".'); return; }
    setErr('');
    try {
      await store.resetPassword(email);
      setMsg('Te mandamos un email para cambiar la contraseña.');
    } catch (ex) {
      setErr((ex?.code || '').includes('network') ? 'Sin conexión. Probá de nuevo.' : 'No se pudo enviar el email. Revisá la dirección.');
    }
  };

  return (
    <form className="screen login" onSubmit={submit}>
      <div className="login-logo"><Icon name="calendar" size={34} /></div>
      <h1>Turnos</h1>
      <div className="muted center">Ingresá para ver tu agenda</div>
      <div className="form">
        <label className="field"><span>Email</span>
          <input type="email" inputMode="email" autoComplete="username" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {err && <div className="error" role="alert">{err}</div>}
        {msg && <div className="hint ok">{msg}</div>}
        <button className="btn primary block big" disabled={busy || !email || !pw}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        <button type="button" className="link-btn center-btn" onClick={reset}>Olvidé mi contraseña</button>
      </div>
    </form>
  );
}
