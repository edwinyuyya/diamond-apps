// Rawatku — layar Beranda (t5).
// Semua data berasal dari state API; tidak ada penyimpanan langsung di layar ini.
// Tanpa dependency eksternal. Data pengguna tidak pernah ditulis lewat innerHTML.

import { h, clear } from '../dom.js';
import {
  DISCLAIMERS,
  VITAL_TYPES,
  VITAL_TYPE_ORDER,
  ageFromBirthDate
} from '../model.js';
import {
  todayISO,
  formatDateID,
  startOfWeek
} from '../logic/dates.js';
import {
  buildDosesForDate,
  applyDoseLogs
} from '../logic/schedule.js';
import {
  weeklyAdherence,
  adherenceHistory
} from '../logic/adherence.js';
import { predictRefills } from '../logic/stock.js';
import { latestFor, formatVital } from '../logic/vitals.js';
import { flagVital, FLAG_LABELS } from '../logic/safety.js';

// Dimuat dinamis agar Beranda tetap dapat tampil bila modul grafik belum tersedia;
// saat tersedia, bagan tetap dibangun oleh buildBarChartSVG sesuai kontrak.
let chartModulePromise = null;
function loadChartModule() {
  if (!chartModulePromise) chartModulePromise = import('./chart.js');
  return chartModulePromise;
}

const DUE_WINDOW_MINUTES = 180;

function flatten(children, out = []) {
  for (const child of children) {
    if (Array.isArray(child)) flatten(child, out);
    else if (child !== null && child !== undefined && child !== false) out.push(child);
  }
  return out;
}

function create(tag, attrs = {}, ...children) {
  const props = {};
  let className = '';
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class' || key === 'className') {
      className = value == null ? '' : String(value);
    } else {
      props[key] = value;
    }
  }
  const node = h(tag, props, ...flatten(children));
  if (className) node.className = className;
  return node;
}

function text(value) {
  return value == null ? '' : String(value);
}

function toast(ctx, message, tone = 'info') {
  if (typeof ctx?.toast === 'function') ctx.toast(message, tone);
}

function formatDateSafe(dateISO, style = 'long') {
  try {
    return formatDateID(dateISO, style);
  } catch {
    return '';
  }
}

function greetingFor(date) {
  const hour = date instanceof Date && Number.isFinite(date.getTime()) ? date.getHours() : 9;
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function joinOr(value, fallback) {
  const list = Array.isArray(value) ? value.filter((item) => text(item).trim() !== '') : [];
  return list.length > 0 ? list.join(', ') : fallback;
}

function summaryRow(label, value, options = {}) {
  const valueNode = options.node
    ? options.node
    : create('dd', { class: options.class || '' }, text(value));
  return create(
    'div',
    { class: 'summary-row row' },
    create('dt', {}, label),
    valueNode
  );
}

function isDoseDue(dose, { reminders, nowMs }) {
  if (!reminders) return false;
  if (!dose || dose.status !== 'pending') return false;
  const scheduledMs = Date.parse(dose.scheduledAt);
  if (!Number.isFinite(scheduledMs) || scheduledMs > nowMs) return false;
  return nowMs - scheduledMs <= DUE_WINDOW_MINUTES * 60000;
}

function statusLabel(dose, due) {
  if (due) return 'Waktunya';
  switch (dose.status) {
    case 'taken': return 'Sudah diminum';
    case 'skipped': return 'Dilewati';
    case 'missed': return 'Terlewat';
    default: return 'Belum waktunya';
  }
}

function statusClass(dose, due) {
  if (due) return 'is-due';
  switch (dose.status) {
    case 'taken': return 'is-taken';
    case 'skipped': return 'is-skipped';
    case 'missed': return 'is-missed';
    default: return 'is-pending';
  }
}

function buildQuickLink({ id, href, title, description, className = '' }) {
  const link = create(
    'a',
    { id, href, class: `card quick-link ${className}`.trim() },
    create('div', { class: 'stack' },
      create('strong', { class: 'quick-link-title' }, title),
      create('span', { class: 'hint quick-link-desc' }, description))
  );
  return link;
}

function renderProfileSummary(profile, refs) {
  const { now, onEdit } = refs;
  const container = create('div', { id: 'dash-profile-summary', class: 'card profile-summary' });
  container.appendChild(create('div', { class: 'row' },
    create('h2', {}, 'Profil aktif'),
    onEdit
  ));

  if (!profile) {
    container.appendChild(create('p', { class: 'empty-state' },
      'Profil belum tersedia. Lengkapi profil terlebih dahulu.'));
    return container;
  }

  const age = ageFromBirthDate(profile.birthDate, now);
  const contact = Array.isArray(profile.emergencyContacts) ? profile.emergencyContacts[0] : null;

  const list = create('dl', { class: 'stack summary-list' });
  list.appendChild(summaryRow('Nama', profile.name || 'Saya'));
  list.appendChild(summaryRow(
    'Usia',
    age == null
      ? (profile.birthDate ? formatDateSafe(profile.birthDate) : 'Belum diisi')
      : `${age} tahun`
  ));
  list.appendChild(summaryRow('Golongan darah', profile.bloodType || 'tidak tahu'));
  list.appendChild(summaryRow(
    'Alergi',
    joinOr(profile.allergies, 'Tidak ada yang tercatat')
  ));
  list.appendChild(summaryRow(
    'Penyakit kronis',
    joinOr(profile.chronicConditions, 'Tidak ada yang tercatat')
  ));

  let contactNode = create('dd', {}, 'Belum diisi');
  if (contact && (contact.name || contact.phone)) {
    contactNode = create('dd', {});
    const nameText = [contact.name, contact.relation].filter(Boolean).join(' · ');
    if (nameText) contactNode.appendChild(create('span', {}, nameText));
    if (contact.phone) {
      if (nameText) contactNode.appendChild(document.createTextNode(' · '));
      contactNode.appendChild(create('a', { href: `tel:${contact.phone}` }, contact.phone));
    }
  }
  list.appendChild(create('div', { class: 'summary-row' }, create('dt', {}, 'Kontak darurat'), contactNode));

  const doctor = profile.doctor || {};
  if (doctor.name || doctor.facility || doctor.phone) {
    const doctorText = [doctor.name, doctor.facility, doctor.phone].filter(Boolean).join(' · ');
    list.appendChild(summaryRow('Dokter / faskes', doctorText));
  }

  container.appendChild(list);
  return container;
}

function renderTodayDoses(ctx, data) {
  const { medications, doseLogs, profileId, now } = data;
  const container = create('section', { class: 'card dashboard-section' });
  container.appendChild(create('div', { class: 'row' },
    create('h2', {}, 'Obat hari ini'),
    create('span', { class: 'muted' }, formatDateSafe(todayISO(now)))
  ));

  const list = create('ul', { id: 'dash-today-list', class: 'list' });
  let doses = [];
  try {
    doses = applyDoseLogs(
      buildDosesForDate(medications, todayISO(now), { profileId }),
      doseLogs,
      { now }
    );
  } catch {
    doses = [];
  }

  if (doses.length === 0) {
    list.appendChild(create('li', { class: 'empty-state' },
      'Belum ada obat yang dijadwalkan hari ini. ',
      create('a', { href: '#/obat' }, 'Tambah obat')));
    container.appendChild(list);
    return container;
  }

  const settings = data.settings || {};
  const nowMs = now instanceof Date ? now.getTime() : Date.now();
  const reminders = settings.reminders !== false;

  for (const dose of doses) {
    const due = isDoseDue(dose, { reminders, nowMs });
    const itemClass = `dose-item list-item ${statusClass(dose, due)}`.trim();
    const item = create('li', { class: itemClass });

    const info = create('div', { class: 'dose-info' });
    info.appendChild(create('strong', { class: 'dose-name' }, dose.name || 'Obat'));
    const detail = [dose.time, dose.dose ? `${dose.dose} ${dose.doseUnit || ''}`.trim() : '']
      .filter(Boolean)
      .join(' · ');
    info.appendChild(create('div', { class: 'hint dose-detail' }, detail || 'Tanpa dosis tertulis'));
    item.appendChild(info);

    const status = create('span', { class: `badge dose-status ${statusClass(dose, due)}` },
      statusLabel(dose, due));
    item.appendChild(status);

    if (dose.status === 'pending' || dose.status === 'missed') {
      const actions = create('div', { class: 'dose-actions' });
      const take = create('button', {
        type: 'button',
        class: 'button button--primary',
        'data-action': 'take-dose',
        'data-medication-id': dose.medicationId,
        'data-date': dose.date,
        'data-time': dose.time
      }, 'Sudah diminum');
      const skip = create('button', {
        type: 'button',
        class: 'button button--ghost',
        'data-action': 'skip-dose',
        'data-medication-id': dose.medicationId,
        'data-date': dose.date,
        'data-time': dose.time
      }, 'Lewati');

      const log = async (statusValue) => {
        take.disabled = true;
        skip.disabled = true;
        try {
          await ctx.state.logDose({
            medicationId: dose.medicationId,
            date: dose.date,
            time: dose.time,
            status: statusValue
          });
          toast(ctx, statusValue === 'taken' ? 'Dosis dicatat diminum.' : 'Dosis dilewati.', 'success');
          await ctx.refresh();
        } catch (error) {
          toast(ctx, error?.message || 'Catatan dosis gagal disimpan.', 'error');
          take.disabled = false;
          skip.disabled = false;
        }
      };
      take.addEventListener('click', () => log('taken'));
      skip.addEventListener('click', () => log('skipped'));
      actions.appendChild(take);
      actions.appendChild(skip);
      item.appendChild(actions);
    } else if (dose.status === 'taken') {
      item.appendChild(create('span', { class: 'muted dose-note' }, 'Tercatat'));
    } else if (dose.status === 'skipped') {
      item.appendChild(create('span', { class: 'muted dose-note' }, 'Tidak diminum'));
    }

    list.appendChild(item);
  }

  container.appendChild(list);
  container.appendChild(create('p', { class: 'hint' },
    'Catatan minum hanya tersimpan di perangkat ini; aplikasi tidak mengirim pengingat dari server.'));
  return container;
}

async function renderAdherence(data) {
  const container = create('section', { class: 'card dashboard-section' });
  container.appendChild(create('div', { class: 'row' },
    create('h2', {}, 'Kepatuhan minggu ini'),
    create('a', { href: '#/obat' }, 'Kelola obat')
  ));

  let adherence = null;
  try {
    adherence = weeklyAdherence({
      medications: data.medications,
      doseLogs: data.doseLogs,
      weekStartISO: startOfWeek(todayISO(data.now)),
      now: data.now,
      profileId: data.profileId
    });
  } catch {
    adherence = null;
  }

  const summary = create('div', { id: 'dash-adherence', class: 'adherence-summary' });
  if (!adherence || adherence.percent == null) {
    summary.appendChild(create('p', { class: 'empty-state' },
      'Belum ada data kepatuhan untuk dosis yang sudah jatuh tempo minggu ini.'));
  } else {
    summary.appendChild(create('div', { class: 'adherence-percent' }, `${adherence.percent}%`));
    summary.appendChild(create('div', { class: 'adherence-label' }, adherence.label));
    summary.appendChild(create('p', { class: 'hint' },
      `${adherence.taken} diminum · ${adherence.skipped} dilewati · `
      + `${adherence.missed} terlewat · ${adherence.pending} menunggu`));
  }
  container.appendChild(summary);

  const chart = create('div', { id: 'dash-adherence-chart', class: 'chart' });
  try {
    const history = adherenceHistory({
      medications: data.medications,
      doseLogs: data.doseLogs,
      weeks: 8,
      now: data.now,
      profileId: data.profileId
    });
    const bars = (Array.isArray(history) ? history : []).map((week) => ({
      label: formatDateSafe(week.weekStart, 'short') || '—',
      value: typeof week.percent === 'number' ? week.percent : 0,
      percent: typeof week.percent === 'number' ? week.percent : 0
    }));
    const chartModule = await loadChartModule();
    const buildBarChartSVG = chartModule?.buildBarChartSVG;
    if (typeof buildBarChartSVG !== 'function') throw new Error('Modul grafik tidak tersedia');
    const svg = buildBarChartSVG({
      bars,
      max: 100,
      title: 'Kepatuhan minum 8 minggu terakhir',
      unit: '%'
    });
    if (typeof svg === 'string' && svg.trim()) {
      // SVG berasal dari modul grafik internal yang sudah meng-escape teks.
      chart.innerHTML = svg;
    } else {
      chart.textContent = 'Grafik belum tersedia.';
    }
  } catch {
    chart.textContent = 'Grafik belum tersedia.';
  }
  chart.appendChild(create('p', { class: 'hint' },
    'Persentase = diminum ÷ (diminum + dilewati + terlewat) untuk dosis yang sudah jatuh tempo.'));
  container.appendChild(chart);
  return container;
}

function renderVitals(data) {
  const container = create('section', { class: 'card dashboard-section' });
  container.appendChild(create('div', { class: 'row' },
    create('h2', {}, 'Vital terakhir'),
    create('a', { href: '#/vital' }, 'Lihat semua')
  ));

  const list = create('div', { id: 'dash-vitals', class: 'list' });
  const items = [];
  for (const type of VITAL_TYPE_ORDER) {
    let vital = null;
    try {
      vital = latestFor(type, data.vitals, { profileId: data.profileId });
    } catch {
      vital = null;
    }
    if (!vital) continue;
    let overall = 'unknown';
    try {
      const flagged = flagVital(vital, data.refRanges, { profileId: data.profileId });
      overall = flagged?.overall || 'unknown';
    } catch {
      overall = 'unknown';
    }
    items.push({
      type,
      label: VITAL_TYPES[type]?.label || type,
      display: formatVital(type, vital) || '—',
      date: vital.date,
      overall
    });
  }

  if (items.length === 0) {
    list.appendChild(create('p', { class: 'empty-state' },
      'Belum ada catatan vital. ', create('a', { href: '#/vital' }, 'Catat vital atau lab')));
  } else {
    for (const item of items) {
      list.appendChild(create('div', { class: 'vital-summary-item list-item' },
        create('span', { class: 'vital-summary-label' }, item.label),
        create('strong', { class: 'vital-summary-value' }, item.display),
        create('span', { class: `flag-badge flag-${item.overall}` },
          FLAG_LABELS[item.overall] || FLAG_LABELS.unknown),
        create('span', { class: 'hint' }, formatDateSafe(item.date, 'short'))
      ));
    }
  }
  container.appendChild(list);
  return container;
}

function renderRefills(data) {
  const container = create('section', { class: 'card dashboard-section' });
  container.appendChild(create('div', { class: 'row' },
    create('h2', {}, 'Stok perlu tebus'),
    create('a', { href: '#/obat' }, 'Kelola stok')
  ));

  const list = create('div', { id: 'dash-refills', class: 'refill-summary' });
  let refills = [];
  try {
    refills = predictRefills(data.medications, {
      today: todayISO(data.now),
      profileId: data.profileId
    }).filter((item) => item.tracked && item.refillDue);
  } catch {
    refills = [];
  }

  if (refills.length === 0) {
    list.appendChild(create('p', { class: 'empty-state' },
      'Tidak ada obat yang perlu ditebus saat ini.'));
  } else {
    const ul = create('ul', { class: 'list' });
    for (const refill of refills) {
      const detailParts = [];
      if (refill.runOutDate) detailParts.push(`perkiraan habis ${formatDateSafe(refill.runOutDate, 'short')}`);
      if (typeof refill.remaining === 'number') {
        detailParts.push(`sisa ${refill.remaining} ${refill.unit || ''}`.trim());
      }
      ul.appendChild(create('li', { class: 'refill-item list-item' },
        create('strong', {}, refill.name || 'Obat'),
        create('span', { class: 'refill-detail' }, detailParts.join(' · ')),
        create('span', { class: 'flag-badge flag-high' }, 'Perlu tebus')
      ));
    }
    list.appendChild(ul);
  }
  list.appendChild(create('p', { class: 'hint' }, DISCLAIMERS.stock));
  container.appendChild(list);
  return container;
}

function renderQuickActions() {
  const section = create('section', { class: 'grid', 'aria-label': 'Pintasan' });
  section.appendChild(buildQuickLink({
    id: 'dash-quick-scan',
    href: '#/pindai',
    title: 'Pindai Resep / Rekam Medis',
    description: 'Foto atau tempel teks, lalu tinjau sebelum menyimpan.',
    className: 'quick-scan'
  }));
  section.appendChild(buildQuickLink({
    id: 'dash-quick-emergency',
    href: '#/darurat',
    title: 'Kartu Darurat',
    description: 'Nama, golongan darah, alergi, kontak darurat, dan QR.',
    className: 'quick-emergency'
  }));
  section.appendChild(buildQuickLink({
    id: 'dash-quick-report',
    href: '#/ringkasan',
    title: 'Ringkasan Dokter',
    description: 'Ringkasan satu halaman untuk dibawa saat kontrol.',
    className: 'quick-report'
  }));
  return section;
}

function renderEmptyProfile(ctx, screen) {
  screen.appendChild(create('div', { id: 'dash-profile-summary', class: 'card profile-summary' },
    create('p', { class: 'empty-state' },
      'Profil aktif tidak ditemukan. ',
      create('a', { href: '#/profil' }, 'Buka Profil'))));
}

/**
 * Render layar Beranda.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);
  const now = typeof ctx.now === 'function' ? ctx.now() : new Date();
  const state = ctx.state;
  const profile = ctx.profile || null;
  const profileId = profile?.id || null;

  let stateData = null;
  try {
    stateData = state.getState();
  } catch {
    stateData = null;
  }
  const settings = stateData?.settings || {};
  const medications = profileId ? state.list('medications', { profileId }) : [];
  const doseLogs = profileId ? state.list('doseLogs', { profileId }) : [];
  const vitals = profileId ? state.list('vitals', { profileId }) : [];
  const refRanges = profileId ? state.list('refRanges', { profileId }) : [];

  const screen = create('section', { id: 'screen-dashboard', class: 'screen dashboard' });

  const header = create('header', { class: 'screen-header' });
  const greeting = create(
    'h1',
    { id: 'dash-greeting', class: 'dash-greeting' },
    `${greetingFor(now)}, ${profile?.name || 'Saya'}`
  );
  header.appendChild(greeting);
  header.appendChild(create('p', { class: 'muted' }, formatDateSafe(todayISO(now))));
  screen.appendChild(header);

  if (profile) {
    screen.appendChild(renderProfileSummary(profile, {
      now,
      onEdit: create('a', { href: '#/profil', class: 'button button--ghost' }, 'Ubah profil')
    }));
  } else {
    renderEmptyProfile(ctx, screen);
  }

  screen.appendChild(renderTodayDoses(ctx, {
    medications,
    doseLogs,
    profileId,
    now,
    settings
  }));

  screen.appendChild(await renderAdherence({
    medications,
    doseLogs,
    now,
    profileId
  }));

  const twoColumns = create('div', { class: 'grid' });
  twoColumns.appendChild(renderVitals({ vitals, refRanges, profileId }));
  twoColumns.appendChild(renderRefills({ medications, now, profileId }));
  screen.appendChild(twoColumns);

  screen.appendChild(renderQuickActions());
  screen.appendChild(create('p', { class: 'hint' }, DISCLAIMERS.app));

  root.appendChild(screen);
  return undefined;
}

export default render;
