import { useEffect, useState } from 'react';

// Router mínimo por hash: '#/paciente/abc?fecha=2026-10-21'. Así funciona el gesto "atrás" del iPhone.
function parse() {
  const h = location.hash.replace(/^#/, '') || '/hoy';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, params, path };
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
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
