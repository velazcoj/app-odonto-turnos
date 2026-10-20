import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { navigate } from '../lib/router.js';
import { statusOf, typeOf, initials } from '../lib/constants.js';

export function StatusBadge({ status }) {
  const s = statusOf(status);
  return <span className="badge" style={{ background: s.bg, color: s.ink }}>{s.label}</span>;
}

// Ícono circular del motivo. variant: 'ring' (blanco con borde), 'tint' (fondo suave del motivo),
// 'next' (negro de marca con ícono menta y halo, para el próximo turno).
export function TypeIcon({ type, size = 44, variant = 'ring' }) {
  const t = typeOf(type);
  const style = { width: size, height: size };
  if (variant !== 'next') style.color = t.color;
  if (variant === 'tint') style.background = t.bg;
  return (
    <span className={`type-icon ${variant}`} style={style}>
      <Icon name={t.icon} size={Math.round(size * 0.45)} stroke={1.8} />
    </span>
  );
}

export function TypeLabel({ type }) {
  const t = typeOf(type);
  return <span className="type-label" style={{ color: t.color }}>{t.label}</span>;
}

const AVATAR_COLORS = [['#CCEDE7', '#0F5F58'], ['#DBEAFE', '#1E3A8A'], ['#EDE9FE', '#4C1D95'], ['#FFEDD5', '#7C2D12'], ['#FCE7F3', '#831843']];
export function Avatar({ patient, size = 44 }) {
  const key = (patient?.id || patient?.lastName || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [bg, ink] = AVATAR_COLORS[key % AVATAR_COLORS.length];
  return (
    <div className="avatar" style={{ width: size, height: size, background: bg, color: ink, fontSize: size * 0.34 }}>
      {initials(patient)}
    </div>
  );
}

// Barra inferior: Hoy, Agenda, "+" (nuevo turno, en el día que se está mirando) y Pacientes.
export function TabBar({ active, newTo = '/turno/nuevo' }) {
  const tab = (id, label, icon) => (
    <a href={`#/${id}`} className={active === id ? 'tab active' : 'tab'} aria-current={active === id ? 'page' : undefined}>
      <Icon name={icon} size={24} />
      {label}
    </a>
  );
  return (
    <nav className="tabbar">
      {tab('hoy', 'Hoy', 'clock')}
      {tab('agenda', 'Agenda', 'calendar')}
      <a className="tab-plus" href={`#${newTo}`} aria-label="Nuevo turno">
        <Icon name="plus" size={24} stroke={2.4} />
      </a>
      {tab('pacientes', 'Pacientes', 'users')}
    </nav>
  );
}

export function TopBar({ left, title, right }) {
  return (
    <div className="topbar">
      <div className="topbar-side">{left}</div>
      <div className="topbar-title">{title}</div>
      <div className="topbar-side right">{right}</div>
    </div>
  );
}

export function BackLink({ label, onClick }) {
  return (
    <button className="link-btn back" onClick={onClick}>
      <Icon name="chevronLeft" size={22} stroke={2.2} />{label}
    </button>
  );
}

// Safari iOS no enfoca un botón al tocarlo (activeElement queda en <body>): recordar el último control
// tocado, en fase de captura (antes del onClick que abre la hoja), para devolverle el foco al cerrar.
let lastTap = null;
document.addEventListener('click', (e) => { lastTap = e.target.closest?.('button, a, [tabindex]') || null; }, true);

export function Sheet({ open, onClose, children, title }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // VoiceOver: llevar el foco a la hoja (al contenedor, para no abrir el teclado) y devolverlo al cerrar.
    const active = document.activeElement;
    const opener = active && active !== document.body ? active : lastTap;
    ref.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prev;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={28} /></div>
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return <div className="section-title"><span>{children}</span>{right}</div>;
}

export const go = (to) => () => navigate(to);
