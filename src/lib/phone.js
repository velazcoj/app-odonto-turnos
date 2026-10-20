// Números argentinos → formato internacional para WhatsApp (549 + área + número, sin 0 ni 15).
// En Argentina característica + número local = 10 dígitos, y las características empiezan con 1, 2 o 3.

// Varios números o un interno en el mismo campo: "11 5555 0142 / 4444-1234", "… int. 23", "Celu o fijo: …".
const SEPARATORS = /\s*(?:[/,;]|\s[oóy]\s|\b(?:interno|int|ext)[.:]?(?=[\s\d]|$))\s*/i;
// Sin el texto de alrededor: "cel: +54…" → "+54…", "… después de las 20" / "… (18 hs)" → solo el número
// (si no, esos dígitos se sumaban y podían armar el número válido de otra persona).
const cleanPart = (p) => p.replace(/^[^\d+]+/, '').replace(/\s*\p{L}.*$/u, '').replace(/\s*\([^)]*$/, '');
// Cada parte: { raw: texto original (con "Cel", "15"…), num: solo el número }.
function parts(phone) {
  const pieces = String(phone || '').split(SEPARATORS).map((raw) => ({ raw, num: cleanPart(raw) })).filter((p) => /\d/.test(p.num));
  const out = [];
  for (let i = 0; i < pieces.length; i++) {
    let { raw, num } = pieces[i];
    // Una "/" dentro de un mismo número ("11/5555-0142", "4444/1234"): unir con lo que sigue si el
    // pedazo es demasiado corto para ser un número, o si solo así queda un número válido.
    const short = (x) => x.replace(/\D/g, '').length < 6;
    while (!waOne(num) && i + 1 < pieces.length && (short(num) || waOne(`${num} ${pieces[i + 1].num}`))) {
      i++;
      raw += ` ${pieces[i].raw}`;
      num += ` ${pieces[i].num}`;
    }
    out.push({ raw, num });
  }
  return out;
}

// Marcas de celular, para elegir esa parte cuando hay "fijo / celular" (un fijo con característica
// también arma un link válido, pero WhatsApp no lo tiene).
const MOBILE = /cel|m[oó]vil|wsp|whats|^\D*(\+|00)?\s*54\s*9|(^|[\s-])15[\s-]/i;

function waOne(s) {
  let d = s.replace(/\D/g, '');
  const intl = s.startsWith('+') || d.startsWith('00');
  if (d.startsWith('00')) d = d.slice(2); // prefijo internacional 00
  // Con + o 00 y otro país: tal cual. Salvo un '+' de más delante de un número nacional
  // (10 dígitos que empiezan con 1-3, o con 0): ningún prefijo de la zona da ese largo.
  if (intl && !d.startsWith('54') && !d.startsWith('0') && !(d.length === 10 && /^[1-3]/.test(d))) {
    return d.length >= 8 && d.length <= 15 ? d : '';
  }
  if (d.startsWith('54') && d.length >= 11) d = d.slice(2); // ningún número nacional de 10 empieza con 5
  if (d.startsWith('9') && d.length >= 11) d = d.slice(1); // ni con 9 (el 9 es el indicador móvil)
  if (d.startsWith('0')) d = d.slice(1);
  // Con el 15 (ej. 11 15 5555 0142 → 12 dígitos): está en la posición = largo del área (2, 3 o 4).
  // Con área de 3 dígitos d[2..3] nunca es '15'; con 4, solo si el área termina en 15 y da lo mismo.
  if (d.length === 12) {
    for (const pos of [2, 3, 4]) {
      if (d.slice(pos, pos + 2) === '15') {
        d = d.slice(0, pos) + d.slice(pos + 2);
        break;
      }
    }
  }
  // Sin característica ("15 5555 0142", "5555-0142") o con dígitos de más: mejor sin link que uno roto.
  return d.length === 10 && /^[1-3]/.test(d) && !d.startsWith('15') ? '549' + d : '';
}

export function waNumber(phone) {
  const valid = parts(phone).map((p) => ({ ...p, wa: waOne(p.num) })).filter((p) => p.wa);
  return (valid.find((p) => MOBILE.test(p.raw)) || valid[0])?.wa || '';
}

// Texto del botón de WhatsApp cuando no hay link: no hay número, o hay uno que no se pudo armar.
export const noWaText = (phone) => (String(phone || '').trim() ? 'Revisar número' : 'Sin teléfono');

export function waLink(phone, text) {
  const n = waNumber(phone);
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return n ? `https://wa.me/${n}${q}` : '';
}

export function telLink(phone) {
  // Solo el primer número del campo, sin el interno ni un segundo número.
  const d = (parts(phone)[0]?.num || '').replace(/[^\d+]/g, '');
  return d ? `tel:${d}` : '';
}
