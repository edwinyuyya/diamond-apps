// Rawatku — layar Kartu Darurat (t7).
// Data dari profil aktif dan obat aktif (maks. 3). QR memakai payload yang
// sama dengan pratinjau teks. Tidak ada data yang dikirim ke luar perangkat.

import { h, clear, on } from '../dom.js';
import { DISCLAIMERS, EMERGENCY_NUMBERS } from '../model.js';
import { encodeQR, qrToSvg, emergencyPayload, QRError } from '../qr.js';

const MAX_MEDICATIONS = 3;

function text(value) {
  return value == null ? '' : String(value);
}

function joinNonEmpty(list, separator = ', ') {
  const values = (Array.isArray(list) ? list : [])
    .map((item) => text(item).trim())
    .filter(Boolean);
  return values.length > 0 ? values.join(separator) : '';
}

function phoneHref(phone) {
  const digits = text(phone).replace(/[^\d+]/g, '');
  return digits.length >= 3 ? `tel:${digits}` : null;
}

function formatDose(med) {
  const name = text(med?.name).trim() || 'Obat';
  const dose = text(med?.dose).trim();
  const unit = text(med?.doseUnit).trim();
  const times = Array.isArray(med?.times) ? med.times.filter(Boolean) : [];
  let value = name;
  if (dose) value += ` ${dose}${unit ? ` ${unit}` : ''}`;
  if (times.length > 0) value += ` — ${times.join(', ')}`;
  return value;
}

function formatContactLine(contact) {
  const name = text(contact?.name).trim();
  const relation = text(contact?.relation).trim();
  const phone = text(contact?.phone).trim();
  let label = name || 'Kontak';
  if (relation) label += ` (${relation})`;
  if (phone) label += ` — ${phone}`;
  return label;
}

function emptySection(profile, message) {
  const section = h('section', { id: 'screen-emergency', class: 'screen emergency' },
    h('header', { class: 'screen-header' },
      h('h1', {}, 'Kartu Darurat'),
      h('p', { class: 'muted' }, message)
    ),
    h('p', { class: 'empty-state' },
      'Lengkapi profil terlebih dahulu. ',
      h('a', { href: '#/profil' }, 'Buka Profil')
    )
  );
  void profile;
  return section;
}

/**
 * Render kartu darurat.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  const state = ctx?.state;
  let profile = ctx?.profile || null;
  if (!profile && state && typeof state.getActiveProfile === 'function') {
    try {
      profile = state.getActiveProfile();
    } catch {
      profile = null;
    }
  }
  const cleanups = [];

  const section = h('section', { id: 'screen-emergency', class: 'screen emergency' });

  if (!state || !profile) {
    root.appendChild(emptySection(profile, 'Profil aktif tidak ditemukan.'));
    return () => {};
  }

  const profileId = profile.id;
  let medications = [];
  try {
    medications = state.list('medications', { profileId })
      .filter((med) => med && med.active !== false)
      .slice(0, MAX_MEDICATIONS);
  } catch {
    medications = [];
  }

  // ---------------------------------------------------------------------
  // Payload & QR
  // ---------------------------------------------------------------------
  let payload;
  try {
    payload = emergencyPayload(profile, medications, {
      emergencyNumbers: EMERGENCY_NUMBERS
    });
  } catch (error) {
    payload = null;
    if (!(error instanceof QRError)) {
      // Tampilkan pesan ramah tanpa membocorkan detail internal.
      // eslint-disable-next-line no-console
      console.error('Kartu darurat gagal disusun', error);
    }
  }

  let qrSvg = null;
  let qrError = null;
  if (payload) {
    try {
      qrSvg = qrToSvg(encodeQR(payload.text));
    } catch (error) {
      qrError = error;
    }
  }

  // ---------------------------------------------------------------------
  // Header layar
  // ---------------------------------------------------------------------
  section.appendChild(h('header', { class: 'screen-header' },
    h('h1', {}, 'Kartu Darurat'),
    h('p', { class: 'muted' },
      'Tunjukkan kartu ini kepada petugas medis saat keadaan darurat. '
      + 'Data ditulis sendiri oleh pemilik.')
  ));

  // Peringatan privasi (QR tidak terenkripsi).
  section.appendChild(h('p', {
    id: 'emergency-privacy-warning',
    class: 'warning-box',
    role: 'note'
  },
    h('strong', {}, 'Peringatan privasi: '),
    'Kode QR berisi data pribadi tanpa enkripsi. Siapa pun yang memindainya '
    + 'dapat membaca isinya. Tunjukkan hanya kepada petugas medis yang Anda percaya. ',
    DISCLAIMERS.privacy
  ));

  // ---------------------------------------------------------------------
  // Kartu
  // ---------------------------------------------------------------------
  const card = h('article', { id: 'emergency-card', class: 'card stack emergency-card avoid-break' });

  card.appendChild(h('header', { class: 'screen-header' },
    h('p', { class: 'badge' }, 'RAWATKU-DARURAT v1'),
    h('h2', { id: 'emergency-name' }, text(profile.name).trim() || 'Nama belum diisi')
  ));

  const bloodType = text(profile.bloodType).trim() || 'tidak tahu';
  const allergies = joinNonEmpty(profile.allergies) || 'Tidak ada data';
  const chronic = joinNonEmpty(profile.chronicConditions) || 'Tidak ada data';
  const contacts = Array.isArray(profile.emergencyContacts)
    ? profile.emergencyContacts.filter(Boolean)
    : [];

  card.appendChild(h('dl', { class: 'summary-grid' },
    h('div', { class: 'summary-row row' },
      h('dt', {}, 'Golongan darah'),
      h('dd', { id: 'emergency-blood' }, bloodType)
    ),
    h('div', { class: 'summary-row row' },
      h('dt', {}, 'Alergi'),
      h('dd', { id: 'emergency-allergies' }, allergies)
    ),
    h('div', { class: 'summary-row row' },
      h('dt', {}, 'Penyakit kronis'),
      h('dd', { id: 'emergency-chronic' }, chronic)
    )
  ));

  const contactsNode = h('div', { id: 'emergency-contacts', class: 'stack' });
  if (contacts.length === 0) {
    contactsNode.appendChild(h('p', { class: 'muted' }, 'Belum ada kontak darurat.'));
  } else {
    contactsNode.appendChild(h('ul', { class: 'list' },
      contacts.map((contact) => {
        const href = phoneHref(contact?.phone);
        return h('li', { class: 'list-item' },
          h('span', {}, formatContactLine(contact)),
          href ? h('a', { href, class: 'button button--link' }, 'Telepon') : null
        );
      })
    ));
  }
  card.appendChild(h('section', { class: 'stack' },
    h('h3', {}, 'Kontak darurat'),
    contactsNode
  ));

  const medsNode = h('div', { id: 'emergency-medications', class: 'stack' });
  if (medications.length === 0) {
    medsNode.appendChild(h('p', { class: 'muted' }, 'Tidak ada obat aktif yang dicatat.'));
  } else {
    medsNode.appendChild(h('ul', { class: 'list' },
      medications.map((med) => h('li', { class: 'list-item' }, formatDose(med)))
    ));
    if (payload?.fields?.medications === '' && medications.length > 0) {
      medsNode.appendChild(h('p', { class: 'hint' },
        'Baris obat tidak dimuat di QR karena keterbatasan ruang.'));
    }
  }
  card.appendChild(h('section', { class: 'stack' },
    h('h3', {}, 'Obat aktif (maks. 3)'),
    medsNode
  ));

  // QR.
  const qrContainer = h('div', { id: 'emergency-qr', class: 'emergency-qr' });
  if (qrSvg) {
    // SVG dihasilkan sendiri oleh qrToSvg dari payload internal; tidak ada
    // teks pengguna mentah di dalam string ini (label QR sudah di-escape).
    qrContainer.innerHTML = qrSvg;
  } else {
    qrContainer.appendChild(h('p', { class: 'warning-box', role: 'alert' },
      qrError instanceof QRError && qrError.code === 'QR_TERLALU_PANJANG'
        ? 'Data darurat terlalu panjang untuk kode QR. Ringkas data obat.'
        : 'Kode QR tidak dapat dibuat. Periksa data profil.'));
  }
  card.appendChild(qrContainer);

  const truncatedWarning = h('p', {
    id: 'emergency-truncated-warning',
    class: 'warning-box',
    role: 'status',
    hidden: !(payload?.truncated)
  }, 'Sebagian data dipersingkat agar muat di kode QR. Versi lengkap ada di pratinjau teks dan aplikasi.');

  card.appendChild(h('section', { class: 'stack avoid-break' },
    h('h3', {}, 'Teks di dalam QR'),
    h('pre', { id: 'emergency-payload-pre', class: 'emergency-payload' },
      payload ? payload.text : 'Tidak tersedia.'),
    truncatedWarning
  ));

  section.appendChild(card);

  // ---------------------------------------------------------------------
  // Nomor darurat, cetak, disclaimer
  // ---------------------------------------------------------------------
  const numbers = (payload?.fields?.emergencyNumbers || EMERGENCY_NUMBERS)
    .map((number) => text(number).trim())
    .filter(Boolean);
  const numbersNode = h('p', { id: 'emergency-numbers', class: 'emergency-numbers' },
    h('strong', {}, 'Darurat: '),
    numbers.flatMap((number, index) => {
      const parts = [];
      if (index > 0) parts.push(' / ');
      parts.push(h('a', { href: `tel:${number}` }, number));
      return parts;
    })
  );
  section.appendChild(numbersNode);

  const printButton = h('button', {
    id: 'btn-print-emergency',
    class: 'button button--primary no-print',
    type: 'button'
  }, 'Cetak kartu darurat');
  cleanups.push(on(printButton, 'click', () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }));
  section.appendChild(h('div', { class: 'actions no-print' }, printButton));

  section.appendChild(h('p', { id: 'emergency-disclaimer', class: 'warning-box' },
    DISCLAIMERS.emergency));

  root.appendChild(section);

  return () => {
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
        // abaikan
      }
    }
  };
}
