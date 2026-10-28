import { useEffect, useState } from 'react';
import { parseTime } from '../lib/dates.js';

// Hora escrita con el teclado numérico, en lugar de la rueda de iOS: acepta "1530", "15:30", "15.30",
// "930" y "9" y la normaliza a HH:MM al salir del campo. Si no es una hora válida, lo avisa debajo y el
// formulario conserva la última hora válida (onValidity le dice si puede guardar). El formulario se
// actualiza en cada tecla: en iOS tocar "Guardar" no siempre saca el foco del campo.
export default function TimeField({ label, value, onChange, onValidity, id }) {
  const [text, setText] = useState(value || '');
  const [error, setError] = useState('');

  // Si la hora cambia desde afuera (un horario libre, el "Hasta" que acompaña), mostrarla.
  useEffect(() => {
    if (parseTime(text) !== value) {
      setText(value || '');
      setError('');
      onValidity?.(true);
    }
  }, [value]);

  const check = (t) => {
    const v = parseTime(t);
    if (v) {
      setText(v);
      setError('');
      onValidity?.(true);
      if (v !== value) onChange(v);
    } else {
      setError(t.trim() ? 'Hora inválida. Escribila como 15:30 o 1530.' : 'Escribí la hora.');
      onValidity?.(false);
    }
  };

  return (
    <label className="field">
      <span>{label}</span>
      <input id={id} className="time-input" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="done"
        maxLength={5} placeholder="15:30" value={text} aria-invalid={error ? 'true' : undefined}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          setError('');
          const v = parseTime(t);
          onValidity?.(!!v);
          if (v && v !== value) onChange(v);
        }}
        onBlur={(e) => check(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}
