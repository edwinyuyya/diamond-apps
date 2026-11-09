// Rawatku — layar Ringkasan Dokter (t7).
// Ringkasan dibangun oleh `buildDoctorSummary` (logika murni t3); layar ini
// hanya menyajikannya. Diagnosis selalu berlabel "sesuai yang Anda tulis".
// Tidak ada diagnosis, saran dosis, atau klaim interaksi dari aplikasi.

import { h, clear, on } from '../dom.js';
import { DISCLAIMERS, EMERGENCY_NUMBERS } from '../model.js';
import { buildDoctorSummary } from '../logic/summary.js';
import { formatDateID, formatDateTimeID } from '../logic/dates.js';

function text(value) {
  return value == null ? '' : String(value);
}

function str(value) {
  return text(value).trim();
}

function nonEmpty(list) {
  return (Array.isArray(list) ? list : []).map(str).filter(Boolean);
}

function joinOr(list, fallback) {
  const values = nonEmpty(list);
  return values.length > 0 ? values.join(', ') : fallback;
}

function flagClass(flag) {
  return ['low', 'high', 'normal', 'unknown'].includes(flag) ? `flag-${flag}` : 'flag-unknown';
}

function dateText(dateISO, style = 'short') {
  if (!dateISO) return '';
  try {
    return formatDateID(dateISO, style);
  } catch {
    return str(dateISO);
  }
}

function oneRange(range) {
  if (!range || typeof range !== 'object') return '';
  const low = Number.isFinite(range.low) ? range.low : null;
  const high = Number.isFinite(range.high) ? range.high : null;
  if (low === null && high === null) return '';
  const unit = str(range.unit);
  return `${low === null ? '—' : low}–${high === null ? '—' : high}${unit ? ` ${unit}` : ''}`;
}

function rangeText(range) {
  if (!range || typeof range !== 'object') return '';

  // Tensi memakai dua rentang acuan (sistolik & diastolik).
  if (range.systolic || range.diastolic) {
    const parts = [];
    const systolic = oneRange(range.systolic);
    const diastolic = oneRange(range.diastolic);
    if (systolic) parts.push(`sistolik ${systolic}`);
    if (diastolic) parts.push(`diastolik ${diastolic}`);
    return parts.length > 0 ? `Rentang acuan: ${parts.join(' · ')}` : '';
  }

  const plain = oneRange(range);
  return plain ? `Rentang acuan: ${plain}` : '';
}

function statsText(stats) {
  if (!stats || !Number.isFinite(stats.count) || stats.count === 0) return '';
  const parts = [];
  if (Number.isFinite(stats.avg)) parts.push(`rata-rata ${stats.avg}`);
  if (Number.isFinite(stats.min)) parts.push(`min ${stats.min}`);
  if (Number.isFinite(stats.max)) parts.push(`max ${stats.max}`);
  return parts.length > 0 ? `${parts.join(', ')} (${stats.count} catatan)` : '';
}

function toasts(ctx, message, tone = 'info') {
  if (typeof ctx?.toast === 'function') ctx.toast(message, tone);
}

function errorMessage(error) {
  switch (error?.code) {
    case 'DATA_TIDAK_VALID': return 'Data pertanyaan tidak valid.';
    case 'PROFIL_TIDAK_DITEMUKAN': return 'Profil tidak ditemukan.';
    default: return 'Pertanyaan gagal disimpan. Coba lagi.';
  }
}

function section(title, id, children, options = {}) {
  return h('section', {
    id,
    class: `stack summary-section${options.avoidBreak === false ? '' : ' avoid-break'}`
  },
    h('h2', { class: 'card-title' }, title),
    ...children
  );
}

function emptyText(message = 'Tidak ada data.') {
  return h('p', { class: 'muted' }, message);
}

function list(items) {
  if (!Array.isArray(items) || items.length === 0) return emptyText();
  return h('ul', { class: 'list' }, items.map((item) => h('li', { class: 'list-item' }, item)));
}

function renderProfile(profile) {
  const rows = [];
  const add = (label, value) => {
    const clean = str(value);
    if (clean) rows.push(h('div', { class: 'summary-row row' }, h('dt', {}, label), h('dd', {}, clean)));
  };

  add('Nama', profile.name);
  if (Number.isFinite(profile.age)) add('Umur', `${profile.age} tahun`);
  add('Jenis kelamin', profile.sexLabel);
  add('Tanggal lahir', profile.birthDate ? dateText(profile.birthDate, 'long') : '');
  add('Golongan darah', profile.bloodType);
  add('Dokter', profile.doctor?.name);
  add('Fasilitas', profile.doctor?.facility);
  add('Telepon dokter', profile.doctor?.phone);

  return h('div', { id: 'summary-profile', class: 'stack' },
    rows.length > 0
      ? h('dl', { class: 'summary-grid' }, rows)
      : emptyText('Data profil belum lengkap.')
  );
}

function renderMedications(summary) {
  const children = [];

  if (Array.isArray(summary.duplicates) && summary.duplicates.length > 0) {
    children.push(h('div', { class: 'warning-box' },
      h('strong', {}, 'Bahan aktif yang sama: '),
      h('ul', { class: 'list' },
        summary.duplicates.map((group) => h('li', { class: 'list-item' },
          `${str(group.displayName) || str(group.key)} — ${joinOr(group.medicationNames, '-')}`
        ))
      ),
      h('p', { class: 'hint' }, DISCLAIMERS.duplicate)
    ));
  }

  const meds = Array.isArray(summary.activeMedications) ? summary.activeMedications : [];
  if (meds.length === 0) {
    children.push(emptyText('Tidak ada obat aktif yang tercatat.'));
  } else {
    children.push(h('ul', { class: 'list' },
      meds.map((med) => {
        const details = [];
        if (str(med.doseText)) details.push(str(med.doseText));
        if (str(med.scheduleText)) details.push(str(med.scheduleText));
        if (Number.isFinite(med.stock?.remaining)) {
          details.push(`sisa ${med.stock.remaining} ${str(med.stock.unit)}`);
        }
        if (med.stock?.runOutDate) {
          details.push(`perkiraan habis ${dateText(med.stock.runOutDate, 'short')}`);
        }
        if (med.stock?.refillDue) details.push('perkiraan perlu tebus');
        return h('li', { class: 'list-item' },
          h('strong', {}, str(med.name) || 'Obat'),
          details.length > 0 ? ` — ${details.join(', ')}` : ''
        );
      })
    ));
  }

  return children;
}

function renderVitals(summary) {
  const vitals = Array.isArray(summary.vitals) ? summary.vitals : [];
  if (vitals.length === 0) return [emptyText('Belum ada catatan vital.')];
  return [h('ul', { class: 'list' },
    vitals.map((vital) => {
      const range = rangeText(vital.range);
      const stats = statsText(vital.stats);
      return h('li', { class: 'list-item', style: 'display:block' },
        h('div', { class: 'row' },
          h('strong', {}, str(vital.label) || str(vital.type)),
          h('span', { class: `badge ${flagClass(vital.flag)}` }, str(vital.flagLabel) || 'Tanpa rentang')
        ),
        h('div', {}, str(vital.display)),
        h('div', { class: 'muted' },
          [dateText(vital.date, 'short'), range, stats].filter(Boolean).join(' · '))
      );
    })
  )];
}

function renderLabs(summary) {
  const labs = Array.isArray(summary.labs) ? summary.labs : [];
  if (labs.length === 0) return [emptyText('Belum ada hasil lab.')];
  return [h('ul', { class: 'list' },
    labs.map((lab) => {
      const value = `${str(lab.value)}${str(lab.unit) ? ` ${str(lab.unit)}` : ''}`;
      const range = rangeText(lab.range);
      return h('li', { class: 'list-item', style: 'display:block' },
        h('div', { class: 'row' },
          h('strong', {}, str(lab.name) || 'Pemeriksaan'),
          h('span', { class: `badge ${flagClass(lab.flag)}` }, str(lab.flagLabel) || 'Tanpa rentang')
        ),
        h('div', {}, value),
        h('div', { class: 'muted' },
          [dateText(lab.date, 'short'), range].filter(Boolean).join(' · '))
      );
    })
  )];
}

function renderVisits(summary) {
  const visits = Array.isArray(summary.recentVisits) ? summary.recentVisits : [];
  if (visits.length === 0) return [emptyText('Belum ada catatan kunjungan.')];

  return [h('div', { class: 'stack' },
    visits.map((visit) => h('article', { class: 'list-item avoid-break', style: 'display:block' },
      h('h3', {}, [dateText(visit.date, 'long') || 'Tanggal tidak dicatat',
        str(visit.facility) ? ` — ${str(visit.facility)}` : '',
        str(visit.doctorName) ? ` (${str(visit.doctorName)})` : ''].join('')),
      h('dl', { class: 'summary-grid' },
        h('div', { class: 'summary-row row' },
          h('dt', {}, 'Keluhan'),
          h('dd', {}, str(visit.complaint) || '—')
        ),
        h('div', { class: 'summary-row row' },
          h('dt', {}, 'Diagnosis (sesuai yang Anda tulis)'),
          h('dd', {}, str(visit.diagnosis) || '—')
        ),
        h('div', { class: 'summary-row row' },
          h('dt', {}, 'Catatan (sesuai yang Anda tulis)'),
          h('dd', {}, str(visit.notes) || '—')
        ),
        Number.isFinite(visit.attachmentCount) && visit.attachmentCount > 0
          ? h('div', { class: 'summary-row row' },
              h('dt', {}, 'Lampiran'),
              h('dd', {}, `${visit.attachmentCount} berkas`))
          : null
      )
    ))
  )];
}

function renderAdherence(adherence) {
  if (!adherence || typeof adherence !== 'object') {
    return [emptyText('Belum ada data kepatuhan.')];
  }
  const week = [
    dateText(adherence.weekStart, 'short'),
    dateText(adherence.weekEnd, 'short')
  ].filter(Boolean).join('–');

  const percent = Number.isFinite(adherence.percent)
    ? `${adherence.percent}%`
    : 'Belum ada jadwal';

  return [h('div', { class: 'stack' },
    week ? h('p', { class: 'muted' }, `Minggu berjalan: ${week}`) : null,
    h('p', {}, h('strong', {}, `Kepatuhan tercatat: ${percent}`)),
    h('p', { class: 'muted' },
      `Dosis tercatat diminum/dilewati: ${Number.isFinite(adherence.taken) ? adherence.taken : 0} `
      + `dari ${Number.isFinite(adherence.due) ? adherence.due : 0} dosis. `
      + (str(adherence.label) ? str(adherence.label) : '')),
    h('p', { class: 'hint' },
      'Angka ini hanya dihitung dari catatan yang Anda masukkan, bukan penilaian medis.')
  )];
}

function manualQuestionNode(item, state, ctx) {
  const checkbox = h('input', {
    type: 'checkbox',
    checked: item.done === true,
    'data-action': 'toggle-question',
    'data-question-id': item.id,
    'aria-label': `Tandai selesai: ${str(item.text) || 'pertanyaan'}`
  });

  const handler = async () => {
    const done = checkbox.checked;
    checkbox.disabled = true;
    try {
      await state.upsert('questions', { ...item, done });
      toasts(ctx, done ? 'Pertanyaan ditandai selesai.' : 'Pertanyaan dibuka kembali.', 'success');
      if (typeof ctx.refresh === 'function') await ctx.refresh();
    } catch (error) {
      checkbox.checked = !done;
      checkbox.disabled = false;
      toasts(ctx, errorMessage(error), 'error');
    }
  };

  const cleanup = on(checkbox, 'change', handler);
  return {
    node: h('li', { class: 'list-item' },
      h('label', { class: 'checkbox-row' }, checkbox, h('span', {}, str(item.text) || 'Pertanyaan tanpa teks'))
    ),
    cleanup
  };
}

function renderQuestions(summary, manualQuestions, state, ctx) {
  const cleanups = [];
  const container = h('div', { id: 'questions-list', class: 'stack' });

  const manualNodes = [];
  const manualTexts = new Set();
  for (const item of manualQuestions) {
    const key = str(item.text).toLowerCase();
    if (key) manualTexts.add(key);
    const entry = manualQuestionNode(item, state, ctx);
    manualNodes.push(entry.node);
    cleanups.push(entry.cleanup);
  }

  if (manualNodes.length > 0) {
    container.appendChild(h('h3', {}, 'Pertanyaan manual Anda'));
    container.appendChild(h('ul', { class: 'list' }, manualNodes));
  }

  const generated = (Array.isArray(summary.questions) ? summary.questions : [])
    .map(str)
    .filter((question) => question && !manualTexts.has(question.toLowerCase()));

  if (generated.length > 0) {
    container.appendChild(h('h3', {}, 'Pertanyaan dari catatan'));
    container.appendChild(h('ul', { class: 'list' },
      generated.map((question) => h('li', { class: 'list-item' }, question))));
  }

  if (manualNodes.length === 0 && generated.length === 0) {
    container.appendChild(emptyText('Belum ada pertanyaan. Tambahkan pertanyaan manual di bawah.'));
  }

  return { node: container, cleanups };
}

function renderEmergencyNumbers(summary) {
  const numbers = (Array.isArray(summary.emergencyNumbers) && summary.emergencyNumbers.length > 0)
    ? summary.emergencyNumbers
    : EMERGENCY_NUMBERS;

  const parts = [];
  numbers.forEach((number, index) => {
    const value = str(number);
    if (!value) return;
    if (parts.length > 0) parts.push(' / ');
    parts.push(h('a', { href: `tel:${value}` }, value));
  });

  return h('p', { id: 'summary-emergency-numbers', class: 'emergency-numbers' },
    h('strong', {}, 'Dalam darurat: '),
    parts.length > 0 ? parts : '-');
}

/**
 * Render ringkasan dokter.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  const state = ctx?.state;
  const profile = ctx?.profile || null;
  const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
  const cleanups = [];

  const sectionNode = h('section', { id: 'screen-report', class: 'screen report' });

  if (!state || !profile) {
    sectionNode.appendChild(h('header', { class: 'screen-header' },
      h('h1', {}, 'Ringkasan Dokter'),
      h('p', { class: 'muted' }, 'Profil aktif tidak ditemukan.')
    ));
    sectionNode.appendChild(h('p', { class: 'empty-state' },
      h('a', { href: '#/profil' }, 'Buka Profil')));
    root.appendChild(sectionNode);
    return () => {};
  }

  const profileId = profile.id;

  let stateData = null;
  try {
    stateData = state.getState();
  } catch (error) {
    stateData = null;
    void error;
  }

  let summary = null;
  try {
    summary = buildDoctorSummary(stateData, { profileId, now });
  } catch (error) {
    summary = null;
    void error;
  }

  if (!summary) {
    sectionNode.appendChild(h('header', { class: 'screen-header' },
      h('h1', {}, 'Ringkasan Dokter')));
    sectionNode.appendChild(h('p', { class: 'warning-box', role: 'alert' },
      'Ringkasan tidak dapat dibuat. Muat ulang layar atau periksa data Anda.'));
    root.appendChild(sectionNode);
    return () => {};
  }

  let manualQuestions = [];
  try {
    manualQuestions = state.list('questions', { profileId }).filter(Boolean);
  } catch {
    manualQuestions = [];
  }

  // ---------------------------------------------------------------------
  // Header & tombol cetak
  // ---------------------------------------------------------------------
  sectionNode.appendChild(h('header', { class: 'screen-header' },
    h('h1', {}, 'Ringkasan Dokter'),
    h('p', { class: 'muted' },
      'Ringkasan otomatis dari catatan Anda untuk membantu komunikasi dengan dokter. '
      + 'Bukan rekomendasi medis.')
  ));

  const printButton = h('button', {
    id: 'btn-print-report',
    class: 'button button--primary no-print',
    type: 'button'
  }, 'Cetak ringkasan');
  cleanups.push(on(printButton, 'click', () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }));
  sectionNode.appendChild(h('div', { class: 'actions no-print' }, printButton));

  // ---------------------------------------------------------------------
  // Isi ringkasan
  // ---------------------------------------------------------------------
  const generatedAt = summary.generatedAt
    ? formatDateTimeID(new Date(summary.generatedAt))
    : formatDateTimeID(now);

  const questions = renderQuestions(summary, manualQuestions, state, ctx);
  cleanups.push(...questions.cleanups);

  const reportRoot = h('article', { id: 'report-root', class: 'card stack report-root avoid-break' },
    h('header', { class: 'stack' },
      h('h2', { class: 'card-title' }, `Ringkasan untuk dokter — ${str(summary.profile?.name) || 'Pasien'}`),
      h('p', { id: 'summary-generated-at', class: 'muted' },
        `Dibuat: ${generatedAt || '-'}`)
    ),

    renderProfile(summary.profile || {}),

    h('p', { id: 'summary-disclaimer', class: 'info-box' }, DISCLAIMERS.summary),

    h('div', { class: 'grid' },
      section('Alergi', 'summary-allergies',
        [list(nonEmpty(summary.profile?.allergies))]),
      section('Penyakit kronis', 'summary-chronic',
        [list(nonEmpty(summary.profile?.chronicConditions))])
    ),

    section('Obat aktif', 'summary-medications', renderMedications(summary)),
    section('Vital terakhir', 'summary-vitals', renderVitals(summary)),
    section('Hasil lab terakhir', 'summary-labs', renderLabs(summary)),
    section('Kunjungan terakhir', 'summary-visits', renderVisits(summary)),
    section('Kepatuhan minum obat', 'summary-adherence', renderAdherence(summary.adherence)),

    h('section', { id: 'summary-questions', class: 'stack avoid-break' },
      h('h2', { class: 'card-title' }, 'Pertanyaan untuk dokter'),
      questions.node
    ),

    renderEmergencyNumbers(summary)
  );

  sectionNode.appendChild(reportRoot);

  // ---------------------------------------------------------------------
  // Form pertanyaan manual (tidak ikut dicetak)
  // ---------------------------------------------------------------------
  const questionInput = h('input', {
    id: 'manual-question',
    name: 'manual-question',
    type: 'text',
    maxlength: '300',
    autocomplete: 'off',
    required: true,
    placeholder: 'Contoh: Apakah obat ini perlu dilanjutkan?'
  });
  const formError = h('p', {
    id: 'manual-question-error',
    class: 'error-text',
    role: 'alert',
    hidden: true
  }, '');
  const addButton = h('button', {
    id: 'btn-add-question',
    class: 'button button--primary',
    type: 'submit'
  }, 'Tambah pertanyaan');

  const form = h('form', {
    id: 'manual-question-form',
    class: 'card stack no-print'
  },
    h('h2', { class: 'card-title' }, 'Tambah pertanyaan manual'),
    h('p', { class: 'hint' },
      'Pertanyaan ini hanya disimpan di perangkat dan akan muncul di daftar pertanyaan untuk dokter.'),
    h('div', { class: 'form-row' },
      h('label', { for: 'manual-question' }, 'Pertanyaan'),
      questionInput
    ),
    formError,
    h('div', { class: 'actions' }, addButton)
  );

  const submitHandler = async (event) => {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const value = str(questionInput.value);
    if (!value) {
      formError.textContent = 'Tulis pertanyaan terlebih dahulu.';
      formError.hidden = false;
      questionInput.focus();
      return;
    }

    addButton.disabled = true;
    formError.hidden = true;
    try {
      await state.upsert('questions', {
        profileId,
        text: value,
        source: 'manual',
        done: false
      });
      questionInput.value = '';
      toasts(ctx, 'Pertanyaan ditambahkan.', 'success');
      if (typeof ctx.refresh === 'function') await ctx.refresh();
    } catch (error) {
      formError.textContent = errorMessage(error);
      formError.hidden = false;
    } finally {
      addButton.disabled = false;
    }
  };

  cleanups.push(on(form, 'submit', submitHandler));
  sectionNode.appendChild(form);

  root.appendChild(sectionNode);

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
