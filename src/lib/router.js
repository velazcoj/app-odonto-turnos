import { useEffect, useState } from 'react';

// Router mínimo por hash: '#/paciente/abc?fecha=2026-10-21'. Así funciona el gesto "atrás" del iPhone.
function parse() {
  const h = location.hash.replace(/^#/, '') || '/hoy';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, params, path };
}

export const currentRoute = parse;

// Posición de scroll de cada pantalla al salir de ella, para que una lista larga pueda volver adonde estaba.
const scrolls = new Map();
let lastPath = parse().path;
export const savedScroll = (path) => scrolls.get(path) || 0;

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      const r = parse();
      const changed = r.path !== lastPath;
      // Guardar antes del scrollTo: cuando la pantalla se desmonta, scrollY ya vale 0.
      if (changed) scrolls.set(lastPath, window.scrollY);
      lastPath = r.path;
      setRoute(r);
      // Mismo path con otros parámetros (p. ej. cambiar el día en la Agenda): no saltar arriba.
      if (changed) window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function navigate(to, { replace = false } = {}) {
  const url = '#' + to;
  if (replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = to;
  }
}

// Volver; si se abrió directo en una pantalla interna, ir a una pantalla base.
export function back(fallback = '/hoy') {
  const before = location.hash;
  history.back();
  setTimeout(() => { if (location.hash === before) navigate(fallback, { replace: true }); }, 250);
}
