import { useLayoutEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { TabBar, Avatar, Empty } from '../components/ui.jsx';
import { useApp } from '../context.js';
import { norm, fullName } from '../lib/constants.js';
import { parseISO } from '../lib/dates.js';
import { savedScroll } from '../lib/router.js';

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'recientes', label: 'Recientes' },
  { id: 'cumple', label: 'Cumplen este mes' },
];

// La pantalla se desmonta al abrir una ficha: búsqueda y filtro quedan acá para cuando vuelva.
let lastQ = '';
let lastFilter = 'todos';

const ts = (v) => (v?.toMillis ? v.toMillis() : typeof v === 'number' ? v : 0);

export default function Patients() {
  const { patients } = useApp();
  const [q, setQState] = useState(lastQ);
  const [filter, setFilterState] = useState(lastFilter);
  const setQ = (v) => { lastQ = v; setQState(v); };
  const setFilter = (v) => { lastFilter = v; setFilterState(v); };

  // Volver a la posición en la lista (la lista ya está completa en el primer render).
  useLayoutEffect(() => {
    const y = savedScroll('/pacientes');
    if (y && patients) window.scrollTo(0, y);
  }, []);

  const filtered = useMemo(() => {
    let l = patients || [];
    const nq = norm(q);
    if (nq) {
      const words = nq.split(/\s+/);
      l = l.filter((p) => {
        // filter(Boolean): un campo que no existe no tiene que volverse el texto "undefined".
        const hay = norm([p.firstName, p.lastName, p.dni, p.phone, p.insurance].filter(Boolean).join(' '));
        const digits = (p.dni || '').replace(/\D/g, '') + ' ' + (p.phone || '').replace(/\D/g, '');
        return words.every((w) => hay.includes(w) || (/^\d+$/.test(w) && digits.includes(w)));
      });
    }
    if (filter === 'cumple') {
      const m = new Date().getMonth();
      l = l.filter((p) => p.birthDate && parseISO(p.birthDate).getMonth() === m)
        .sort((a, b) => parseISO(a.birthDate).getDate() - parseISO(b.birthDate).getDate());
      return l;
    }
    if (filter === 'recientes') {
      return [...l].sort((a, b) => ts(b.updatedAt || b.createdAt) - ts(a.updatedAt || a.createdAt)).slice(0, 30);
    }
    return [...l].sort((a, b) => norm(a.lastName + a.firstName).localeCompare(norm(b.lastName + b.firstName)));
  }, [patients, q, filter]);

  const groups = useMemo(() => {
    if (filter !== 'todos') return [{ letter: null, items: filtered }];
    const g = [];
    for (const p of filtered) {
      const letter = (norm(p.lastName)[0] || '#').toUpperCase();
      if (!g.length || g[g.length - 1].letter !== letter) g.push({ letter, items: [] });
      g[g.length - 1].items.push(p);
    }
    return g;
  }, [filtered, filter]);

  const total = patients?.length || 0;

  return (
    <div className="screen with-tabs">
      <header className="page-head">
        <div className="eyebrow">{total} {total === 1 ? 'paciente' : 'pacientes'}</div>
        <div className="row-between">
          <h1>Pacientes</h1>
          <a className="icon-btn dark" href="#/paciente/nuevo" aria-label="Agregar paciente"><Icon name="userPlus" /></a>
        </div>
      </header>

      <label className="search">
        <Icon name="search" size={20} stroke={2.2} />
        <span className="sr-only">Buscar paciente</span>
        <input type="search" placeholder="Nombre, apellido o DNI" value={q} onChange={(e) => setQ(e.target.value)}
          autoCorrect="off" autoCapitalize="off" spellCheck="false" />
        {q && <button className="clear" onClick={() => setQ('')} aria-label="Borrar búsqueda"><Icon name="x" size={18} /></button>}
      </label>

      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} className={filter === f.id ? 'chip on' : 'chip'} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {patients === null ? <div className="loading">Cargando…</div> : filtered.length === 0 ? (
        total === 0 ? (
          <Empty icon="users" title="Todavía no hay pacientes" text="Agregá el primero, o cargalo directo al dar un turno."
            action={<a className="btn primary" href="#/paciente/nuevo">Agregar paciente</a>} />
        ) : (
          <Empty icon="search" title="Sin resultados" text={q ? `No hay pacientes que coincidan con "${q}".` : 'No hay pacientes en este filtro.'}
            action={q ? <a className="btn primary" href="#/paciente/nuevo">Agregar paciente</a> : null} />
        )
      ) : groups.map((g) => (
        <div key={g.letter || 'all'}>
          {g.letter && <div className="letter">{g.letter}</div>}
          <div className="card list">
            {g.items.map((p) => (
              <a key={p.id} className="list-row link" href={`#/paciente/${p.id}`}>
                <Avatar patient={p} />
                <span className="col gap2 grow">
                  <span className="appt-name">{p.lastName}, {p.firstName}</span>
                  <span className="muted small">
                    {filter === 'cumple' && p.birthDate
                      ? `Cumple el ${parseISO(p.birthDate).getDate()}`
                      : [p.insurance, p.phone].filter(Boolean).join(' · ') || fullName(p)}
                  </span>
                </span>
                <Icon name="chevronRight" size={18} stroke={2.2} style={{ color: '#9AA4AD' }} />
              </a>
            ))}
          </div>
        </div>
      ))}

      <TabBar active="pacientes" />
    </div>
  );
}
