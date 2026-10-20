import { useEffect } from 'react';
import Icon from './Icon.jsx';
import { navigate } from '../lib/router.js';
import { statusOf, typeOf, initials } from '../lib/constants.js';

export function StatusBadge({ status }) {
  const s = statusOf(status);
  return <span className="badge" style={{ background: s.bg, color: s.ink }}>{s.label}</span>;
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

export function TabBar({ active }) {
  const tabs = [
    { id: 'hoy', label: 'Hoy', icon: 'clock' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar' },
    { id: 'pacientes', label: 'Pacientes', icon: 'users' },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <a key={t.id} href={`#/${t.id}`} className={active === t.id ? 'tab active' : 'tab'}>
          <Icon name={t.icon} size={24} />
          {t.label}
        </a>
      ))}
    </nav>
  );
}

export function Fab({ to }) {
  return (
    <a className="fab" href={`#${to}`} aria-label="Nuevo turno">
      <Icon name="plus" size={26} stroke={2.4} />
    </a>
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

export function Sheet({ open, onClose, children, title }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
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
