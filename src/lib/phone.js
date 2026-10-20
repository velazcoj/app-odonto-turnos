// Números argentinos → formato internacional para WhatsApp (549 + área + número, sin 0 ni 15).

export function waNumber(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('549')) return d;
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  // Si lo cargaron con el 15 (ej. 11 15 5555 0142 → 12 dígitos), sacarlo.
  if (d.length === 12) {
    for (const pos of [2, 3, 4]) {
      if (d.slice(pos, pos + 2) === '15') {
        d = d.slice(0, pos) + d.slice(pos + 2);
        break;
      }
    }
  }
  return '549' + d;
}

export function waLink(phone, text) {
  const n = waNumber(phone);
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return n ? `https://wa.me/${n}${q}` : '';
}

export function telLink(phone) {
  const d = String(phone || '').replace(/[^\d+]/g, '');
  return d ? `tel:${d}` : '';
}
