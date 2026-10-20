import { useEffect, useState } from 'react';
import store from '../data/store.js';

const byTime = (a, b) => (a.date + a.start).localeCompare(b.date + b.start);

// Un error de la suscripción se relanza al dibujar, para que lo muestre el ErrorBoundary.
export function useAppointments(from, to) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    setList(null);
    setError(null);
    return store.watchAppointmentsRange(from, to, (l) => setList([...l].sort(byTime)), setError);
  }, [from, to]);
  if (error) throw error;
  return list;
}

export function usePatientAppointments(patientId) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!patientId) return undefined;
    return store.watchPatientAppointments(patientId, (l) => setList([...l].sort(byTime).reverse()), setError);
  }, [patientId]);
  if (error) throw error;
  return list;
}

// Re-render cada minuto (para "en 25 min", "ahora", etc.)
export function useMinuteTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
}
