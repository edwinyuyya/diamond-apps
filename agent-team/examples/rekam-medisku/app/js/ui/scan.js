// Rekam Medisku — layar Pindai: unggah/kamera + jalur ketik teks (t13).
// Layar ini TIDAK menulis state dan tidak menyimpan foto. Hasil akhir hanya
// disusun sebagai ScanDraft di memori (scanSession) lalu dibuka di #/tinjau.

import { h, clear } from '../dom.js';
import { DISCLAIMERS, OCR_LOW_CONFIDENCE } from '../model.js';
import { formatBytes } from '../logic/dates.js';
import { kenaliResep } from '../logic/resep.js';
import { kenaliRekamMedis } from '../logic/rekam.js';
import { kenaliTeks, ocrTersedia, OCR_DEFAULTS } from '../ocr/adaptor.js';
import { fileToSourcePhoto, photoDataUrl } from '../photos.js';
import { setScanDraft } from '../scanSession.js';
import {
  mulaiKamera,
  hentikanKamera,
  ambilFotoKameraFile,
  pesanErrorKamera
} from './photo-capture.js';

const MODE_LABELS = {
  resep: 'Resep / Etiket Obat',
  'rekam-medis': 'Rekam Medis Rumah Sakit'
};

const OCR_STATUS_LABELS = {
  loading: 'Memuat mesin OCR lokal…',
  recognizing: 'Membaca teks dokumen…',
  done: 'OCR selesai.'
};

function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function textOf(value) {
  return typeof value === 'string' ? value : '';
}

function parseTextFor(mode, text) {
  if (mode === 'rekam-medis') return kenaliRekamMedis(text);
  return kenaliResep(text);
}

export async function render(root, ctx) {
  clear(root);

  const screen = h('section', { id: 'screen-scan', class: 'screen scan' });
  let mode = 'resep';
  let activeSource = 'foto';
  let currentPhoto = null;
  let ocrResult = null;
  let cameraStream = null;
  let ocrController = null;
  let ocrRunning = false;
  let previewTimer = null;
  let disposed = false;

  // -------------------------------------------------------------------------
  // Header & mode
  // -------------------------------------------------------------------------
  screen.appendChild(h('header', { class: 'screen-header' },
    h('h1', {}, 'Pindai Dokumen'),
    h('p', { class: 'muted' },
      'Foto dokumen atau tempel teks resep. Semua proses berjalan di perangkat ini.')));

  const modeSelect = h('select', { id: 'scan-mode', name: 'scan-mode' },
    h('option', { value: 'resep' }, MODE_LABELS.resep),
    h('option', { value: 'rekam-medis' }, MODE_LABELS['rekam-medis']));
  modeSelect.value = mode;
  const modeField = h('div', { class: 'field' },
    h('label', { for: 'scan-mode' }, 'Jenis dokumen'),
    modeSelect);

  // -------------------------------------------------------------------------
  // Tab sumber
  // -------------------------------------------------------------------------
  const tabPhoto = h('button', {
    id: 'scan-tab-photo',
    type: 'button',
    role: 'tab',
    'aria-selected': 'true',
    'aria-controls': 'scan-panel-photo'
  }, 'Foto / Kamera');
  const tabText = h('button', {
    id: 'scan-tab-text',
    type: 'button',
    role: 'tab',
    'aria-selected': 'false',
    'aria-controls': 'scan-panel-text'
  }, 'Ketik / Tempel teks resep');
  const tabs = h('div', {
    id: 'scan-source-tabs',
    class: 'scan-tabs',
    role: 'tablist',
    'aria-label': 'Sumber dokumen'
  }, tabPhoto, tabText);

  // -------------------------------------------------------------------------
  // Panel foto
  // -------------------------------------------------------------------------
  const fileInput = h('input', {
    id: 'scan-file-input',
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    capture: 'environment'
  });

  const cameraButton = h('button', {
    id: 'scan-camera-button',
    type: 'button',
    class: 'button'
  }, 'Nyalakan kamera');

  const cameraVideo = h('video', {
    id: 'scan-camera-video',
    class: 'scan-video',
    playsinline: '',
    autoplay: '',
    muted: true,
    hidden: true,
    'aria-label': 'Pratinjau kamera'
  });
  const cameraCanvas = h('canvas', {
    id: 'scan-camera-canvas',
    'aria-hidden': 'true'
  });
  const captureButton = h('button', {
    id: 'btn-capture',
    type: 'button',
    class: 'button button--primary',
    hidden: true
  }, 'Ambil foto');

  const imagePreview = h('img', {
    id: 'scan-image-preview',
    class: 'scan-preview',
    alt: 'Pratinjau foto dokumen',
    hidden: true
  });
  const photoMeta = h('p', { id: 'scan-photo-meta' }, 'Belum ada foto.');

  const runOcrButton = h('button', {
    id: 'btn-run-ocr',
    type: 'button',
    class: 'button button--primary',
    disabled: true
  }, 'Jalankan OCR');

  const ocrConfidence = h('p', { id: 'scan-ocr-confidence' }, 'Kepercayaan OCR: —');

  const ocrText = h('textarea', {
    id: 'scan-ocr-text',
    class: 'scan-ocr-text',
    rows: 8,
    readOnly: true,
    'aria-label': 'Teks mentah hasil OCR'
  });

  const photoPanel = h('div', {
    id: 'scan-panel-photo',
    class: 'scan-panel',
    role: 'tabpanel',
    'aria-labelledby': 'scan-tab-photo'
  },
  h('div', { class: 'card' },
    h('div', { class: 'field' },
      h('label', { for: 'scan-file-input' }, 'Unggah foto dokumen'),
      fileInput,
      h('p', { class: 'hint' },
        'Gunakan JPEG, PNG, atau WebP. Foto dikecilkan otomatis hingga maksimal 2 MiB.')),
    h('div', { class: 'scan-actions' }, cameraButton),
    h('div', { class: 'scan-camera' }, cameraVideo, cameraCanvas, captureButton),
    imagePreview,
    photoMeta,
    h('div', { class: 'scan-actions' }, runOcrButton),
    h('p', { class: 'scan-status' },
      'Mesin OCR: ', h('strong', { id: 'scan-ocr-engine' },
        ocrTersedia() ? 'Tesseract.js lokal' : 'Tidak tersedia')),
    ocrConfidence,
    h('label', { for: 'scan-ocr-text', class: 'muted' }, 'Teks mentah hasil OCR'),
    ocrText));

  // -------------------------------------------------------------------------
  // Panel teks
  // -------------------------------------------------------------------------
  const textInput = h('textarea', {
    id: 'scan-text-input',
    rows: 10,
    placeholder: 'Contoh:\nAmlodipin 5 mg\n3 dd 1 tab sesudah makan\n\natau tempel teks rekam medis…',
    'aria-describedby': 'scan-text-preview'
  });
  const textPreview = h('div', {
    id: 'scan-text-preview',
    class: 'stack',
    'aria-live': 'polite'
  });
  const parseTextButton = h('button', {
    id: 'btn-parse-text',
    type: 'button',
    class: 'button button--primary'
  }, 'Terjemahkan teks');

  const textPanel = h('div', {
    id: 'scan-panel-text',
    class: 'scan-panel',
    role: 'tabpanel',
    'aria-labelledby': 'scan-tab-text',
    hidden: true
  },
  h('div', { class: 'card' },
    h('div', { class: 'field' },
      h('label', { for: 'scan-text-input' }, 'Ketik atau tempel teks resep / rekam medis'),
      textInput,
      h('p', { class: 'hint' },
        'Tidak ada foto yang diunggah pada jalur ini. Teks hanya diproses di perangkat.')),
    h('div', { class: 'scan-actions' }, parseTextButton),
    h('h2', { class: 'card-title' }, 'Pratinjau terjemahan'),
    textPreview));

  // -------------------------------------------------------------------------
  // Status, error, peringatan, aksi bersama
  // -------------------------------------------------------------------------
  const progressBar = h('div', {
    id: 'scan-progress',
    class: 'scan-progress',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': '0',
    'aria-label': 'Kemajuan pemindaian'
  }, h('span', { style: 'width: 0%' }));

  const statusLine = h('p', { id: 'scan-status', class: 'scan-status', role: 'status' },
    'Pilih sumber dokumen untuk memulai.');
  const errorBox = h('p', { id: 'scan-error', class: 'error-text', role: 'alert' });

  const warning = h('div', { id: 'scan-warning', class: 'scan-warning' },
    h('p', {}, 'Hasil pindai bisa salah, terutama tulisan tangan. Periksa setiap nama obat, dosis, dan angka dengan dokumen asli sebelum menyimpan.'),
    h('p', {}, DISCLAIMERS.ocr),
    h('p', {}, DISCLAIMERS.photo));

  const toReviewButton = h('button', {
    id: 'btn-to-review',
    type: 'button',
    class: 'button button--primary',
    disabled: true
  }, 'Tinjau hasil pindai');

  screen.appendChild(modeField);
  screen.appendChild(tabs);
  screen.appendChild(photoPanel);
  screen.appendChild(textPanel);
  screen.appendChild(h('div', { class: 'card' },
    progressBar,
    statusLine,
    errorBox,
    h('div', { class: 'scan-actions' }, toReviewButton),
    warning));

  root.appendChild(screen);

  // -------------------------------------------------------------------------
  // Utilitas UI
  // -------------------------------------------------------------------------
  function setError(message) {
    errorBox.textContent = textOf(message);
  }

  function setStatus(message) {
    statusLine.textContent = textOf(message);
  }

  function setProgress(value) {
    const percent = clampProgress(value);
    progressBar.setAttribute('aria-valuenow', String(percent));
    const fill = progressBar.firstElementChild;
    if (fill) fill.style.width = `${percent}%`;
  }

  function setConfidence(confidence, label) {
    const number = Number(confidence);
    const hasValue = Number.isFinite(number);
    const percent = hasValue ? Math.round(Math.max(0, Math.min(1, number)) * 100) : null;
    ocrConfidence.textContent = percent === null
      ? `${label}: —`
      : `${label}: ${percent}%`;
    ocrConfidence.classList.toggle('is-low-confidence', hasValue && number < OCR_LOW_CONFIDENCE);
  }

  function canReview() {
    if (activeSource === 'foto') {
      if (!currentPhoto || !ocrResult) return false;
      return textOf(ocrText.value).trim() !== '';
    }
    return textInput.value.trim() !== '';
  }

  function updateReviewButton() {
    toReviewButton.disabled = !canReview();
  }

  function setTab(source) {
    activeSource = source;
    const isPhoto = source === 'foto';
    tabPhoto.setAttribute('aria-selected', isPhoto ? 'true' : 'false');
    tabText.setAttribute('aria-selected', isPhoto ? 'false' : 'true');
    photoPanel.hidden = !isPhoto;
    textPanel.hidden = isPhoto;
    updateReviewButton();
  }

  // -------------------------------------------------------------------------
  // Pratinjau teks (langsung, debounce 200 ms)
  // -------------------------------------------------------------------------
  function renderTextPreview() {
    if (disposed) return;
    const text = textInput.value;
    clear(textPreview);
    if (text.trim() === '') {
      textPreview.appendChild(h('p', { class: 'muted' },
        'Teks masih kosong. Tempel atau ketik teks dokumen untuk melihat pratinjau.'));
      return;
    }

    let parsed;
    try {
      parsed = parseTextFor(mode, text);
    } catch {
      textPreview.appendChild(h('p', { class: 'error-text' },
        'Teks tidak dapat diurai. Periksa kembali isinya.'));
      return;
    }

    if (mode === 'resep') {
      const items = Array.isArray(parsed.obat) ? parsed.obat : [];
      textPreview.appendChild(h('p', { class: 'muted' },
        items.length === 0
          ? 'Belum ada obat yang dikenali dari teks ini.'
          : `${items.length} obat dikenali.`));
      if (items.length > 0) {
        const list = h('ul', { class: 'list' });
        for (const item of items) {
          const label = [item.nama, item.kekuatan].filter(Boolean).join(' ');
          list.appendChild(h('li', {},
            h('strong', {}, label || 'Obat tanpa nama'),
            item.teksTerjemahan ? ` — ${item.teksTerjemahan}` : ''));
        }
        textPreview.appendChild(list);
      }
      if (Array.isArray(parsed.bagianTidakDipahami) && parsed.bagianTidakDipahami.length > 0) {
        textPreview.appendChild(h('p', { class: 'warning-text' },
          `Bagian yang belum dipahami: ${parsed.bagianTidakDipahami.join('; ')}`));
      }
    } else {
      const draf = parsed.draf || {};
      const dl = h('dl', { class: 'summary-list' });
      const rows = [
        ['Tanggal', draf.tanggal || '—'],
        ['Fasilitas', draf.faskes || '—'],
        ['Dokter', draf.dokter || '—'],
        ['Diagnosis (sesuai dokumen)', Array.isArray(draf.diagnosisTertulis)
          ? (draf.diagnosisTertulis.join(', ') || '—')
          : '—'],
        ['Hasil lab', `${Array.isArray(parsed.hasilLab) ? parsed.hasilLab.length : 0} baris`]
      ];
      for (const [label, value] of rows) {
        dl.appendChild(h('dt', {}, label));
        dl.appendChild(h('dd', {}, value));
      }
      textPreview.appendChild(dl);
      if (Array.isArray(parsed.bagianTidakDipahami) && parsed.bagianTidakDipahami.length > 0) {
        textPreview.appendChild(h('p', { class: 'warning-text' },
          `Bagian yang belum dipahami: ${parsed.bagianTidakDipahami.join('; ')}`));
      }
    }
    textPreview.appendChild(h('p', { class: 'hint' },
      mode === 'resep' ? DISCLAIMERS.resep : DISCLAIMERS.rekam));
  }

  function scheduleTextPreview() {
    if (previewTimer !== null) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      previewTimer = null;
      renderTextPreview();
      updateReviewButton();
    }, 200);
  }

  // -------------------------------------------------------------------------
  // Kamera
  // -------------------------------------------------------------------------
  function stopCamera() {
    if (cameraStream) {
      hentikanKamera(cameraStream);
      cameraStream = null;
    }
    cameraVideo.hidden = true;
    try {
      cameraVideo.srcObject = null;
    } catch {
      // abaikan
    }
    captureButton.hidden = true;
    cameraButton.textContent = 'Nyalakan kamera';
  }

  async function toggleCamera() {
    if (cameraStream) {
      stopCamera();
      setStatus('Kamera dihentikan.');
      return;
    }
    setError('');
    cameraButton.disabled = true;
    try {
      const session = await mulaiKamera({ video: cameraVideo });
      if (disposed) {
        session.stop();
        return;
      }
      cameraStream = session.stream;
      cameraVideo.hidden = false;
      captureButton.hidden = false;
      cameraButton.textContent = 'Hentikan kamera';
      setStatus('Kamera aktif. Arahkan ke dokumen lalu tekan "Ambil foto".');
    } catch (error) {
      stopCamera();
      setError(error?.message || pesanErrorKamera(error));
      setStatus('Kamera tidak dapat dipakai. Unggah foto dari galeri sebagai gantinya.');
    } finally {
      cameraButton.disabled = false;
    }
  }

  // -------------------------------------------------------------------------
  // Foto & OCR
  // -------------------------------------------------------------------------
  function applyPhoto(photo) {
    currentPhoto = {
      mime: photo.mime,
      dataBase64: photo.dataBase64,
      bytes: photo.bytes,
      width: photo.width,
      height: photo.height
    };
    ocrResult = null;
    ocrText.value = '';
    setConfidence(null, 'Kepercayaan OCR');
    imagePreview.src = photoDataUrl(currentPhoto);
    imagePreview.hidden = false;
    const dimensions = currentPhoto.width && currentPhoto.height
      ? `${currentPhoto.width}×${currentPhoto.height} px`
      : 'dimensi tidak diketahui';
    photoMeta.textContent = `${formatBytes(currentPhoto.bytes)} • ${dimensions} • JPEG`;
    runOcrButton.disabled = false;
    setProgress(0);
    setError('');
    setStatus('Foto siap. Jalankan OCR untuk membaca teks.');
    updateReviewButton();
  }

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setStatus('Mengompres foto…');
    setProgress(5);
    try {
      const photo = await fileToSourcePhoto(file);
      if (disposed) return;
      applyPhoto(photo);
    } catch (error) {
      if (disposed) return;
      const message = error?.code === 'FOTO_TERLALU_BESAR'
        ? 'Foto masih terlalu besar setelah dikompres. Pilih foto lain atau perkecil ukurannya.'
        : (error?.message || 'Foto tidak dapat diproses. Coba foto lain.');
      setError(message);
      setStatus('Foto gagal diproses.');
      setProgress(0);
    }
  }

  async function capturePhoto() {
    setError('');
    try {
      const file = ambilFotoKameraFile(cameraVideo, cameraCanvas);
      stopCamera();
      await handleFile(file);
    } catch (error) {
      setError(error?.message || 'Gambar kamera gagal diambil. Coba lagi.');
    }
  }

  function applyOcrResult(hasil) {
    ocrResult = {
      kepercayaan: Number.isFinite(Number(hasil?.kepercayaan)) ? Number(hasil.kepercayaan) : 0,
      baris: Array.isArray(hasil?.baris) ? hasil.baris : [],
      mesin: hasil?.mesin || 'tesseract',
      bahasa: Array.isArray(hasil?.bahasa) ? hasil.bahasa : [...OCR_DEFAULTS.languages]
    };
    ocrText.value = textOf(hasil?.teks);
    setConfidence(ocrResult.kepercayaan, 'Kepercayaan OCR');
    setStatus('OCR selesai. Periksa teks mentah dan hasil terjemahan sebelum meninjau.');
    setProgress(100);
    updateReviewButton();
  }

  async function runOcr() {
    if (ocrRunning) return;
    if (!currentPhoto) {
      setError('Ambil atau unggah foto terlebih dahulu.');
      return;
    }
    if (!ocrTersedia()) {
      setError('OCR tidak tersedia di peramban ini. Gunakan tab "Ketik / Tempel teks resep" untuk menyalin teks secara manual.');
      setStatus('OCR tidak tersedia.');
      return;
    }

    setError('');
    ocrRunning = true;
    runOcrButton.disabled = true;
    setProgress(1);
    setStatus('Menyiapkan OCR lokal…');
    ocrController = typeof AbortController === 'function' ? new AbortController() : null;

    try {
      const hasil = await kenaliTeks(photoDataUrl(currentPhoto), {
        onProgress: ({ status, progress }) => {
          if (disposed) return;
          if (Number.isFinite(Number(progress))) setProgress(Number(progress) * 100);
          setStatus(OCR_STATUS_LABELS[status] || `OCR: ${status}`);
        },
        signal: ocrController ? ocrController.signal : null
      });
      if (disposed) return;
      applyOcrResult(hasil);
    } catch (error) {
      if (disposed) return;
      const message = error?.code === 'OCR_TIDAK_TERSEDIA'
        ? 'OCR tidak tersedia di peramban ini. Gunakan tab "Ketik / Tempel teks resep".'
        : (error?.message || 'OCR gagal. Coba foto yang lebih jelas atau gunakan jalur teks.');
      setError(message);
      setStatus('OCR gagal.');
      setProgress(0);
    } finally {
      ocrRunning = false;
      ocrController = null;
      if (!disposed) {
        runOcrButton.disabled = false;
        updateReviewButton();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Jalur teks
  // -------------------------------------------------------------------------
  function parseTypedText() {
    const text = textInput.value;
    if (text.trim() === '') {
      setError('Teks masih kosong. Ketik atau tempel teks dokumen terlebih dahulu.');
      updateReviewButton();
      return null;
    }
    let parsed;
    try {
      parsed = parseTextFor(mode, text);
    } catch {
      setError('Teks tidak dapat diurai. Periksa kembali isinya.');
      return null;
    }
    setError('');
    setProgress(100);
    setConfidence(parsed?.kepercayaan, 'Kepercayaan parser');
    setStatus('Teks berhasil diurai. Periksa pratinjau terjemahan.');
    updateReviewButton();
    return parsed;
  }

  // -------------------------------------------------------------------------
  // Draf → Tinjau
  // -------------------------------------------------------------------------
  function handleReview() {
    setError('');
    if (activeSource === 'foto') {
      if (!currentPhoto) {
        setError('Ambil atau unggah foto terlebih dahulu.');
        return;
      }
      if (!ocrResult) {
        setError('Jalankan OCR terlebih dahulu sebelum meninjau hasil.');
        return;
      }
      const rawText = textOf(ocrText.value);
      if (rawText.trim() === '') {
        setError('Teks OCR kosong. Coba foto yang lebih jelas atau gunakan jalur teks.');
        return;
      }
      const parsed = parseTextFor(mode, rawText);
      const draft = {
        mode,
        source: 'foto',
        teksAsli: rawText,
        foto: { ...currentPhoto },
        ocr: {
          kepercayaan: ocrResult.kepercayaan,
          baris: ocrResult.baris.map((baris) => ({ ...baris })),
          mesin: ocrResult.mesin,
          bahasa: [...ocrResult.bahasa]
        },
        terjemahan: mode === 'resep' ? parsed : null,
        rekam: mode === 'rekam-medis' ? parsed : null,
        createdAt: new Date().toISOString()
      };
      setScanDraft(draft);
      ctx.navigate('#/tinjau');
      return;
    }

    const text = textInput.value;
    if (text.trim() === '') {
      setError('Teks masih kosong. Ketik atau tempel teks dokumen terlebih dahulu.');
      return;
    }
    const parsed = parseTextFor(mode, text);
    const draft = {
      mode,
      source: 'teks',
      teksAsli: text,
      foto: null,
      ocr: null,
      terjemahan: mode === 'resep' ? parsed : null,
      rekam: mode === 'rekam-medis' ? parsed : null,
      createdAt: new Date().toISOString()
    };
    setScanDraft(draft);
    ctx.navigate('#/tinjau');
  }

  // -------------------------------------------------------------------------
  // Peristiwa
  // -------------------------------------------------------------------------
  tabPhoto.addEventListener('click', () => setTab('foto'));
  tabText.addEventListener('click', () => setTab('teks'));

  modeSelect.addEventListener('change', () => {
    mode = modeSelect.value === 'rekam-medis' ? 'rekam-medis' : 'resep';
    ocrResult = null;
    setConfidence(null, mode === 'resep' ? 'Kepercayaan OCR' : 'Kepercayaan parser');
    setError('');
    setStatus(`Mode ${MODE_LABELS[mode]} dipilih.`);
    renderTextPreview();
    updateReviewButton();
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (file) handleFile(file);
  });

  cameraButton.addEventListener('click', toggleCamera);
  captureButton.addEventListener('click', capturePhoto);
  runOcrButton.addEventListener('click', runOcr);

  textInput.addEventListener('input', scheduleTextPreview);
  textInput.addEventListener('change', scheduleTextPreview);

  parseTextButton.addEventListener('click', () => {
    parseTypedText();
    renderTextPreview();
  });

  toReviewButton.addEventListener('click', handleReview);

  // -------------------------------------------------------------------------
  // Keadaan awal
  // -------------------------------------------------------------------------
  runOcrButton.disabled = false;
  renderTextPreview();
  updateReviewButton();

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  return function cleanup() {
    disposed = true;
    if (previewTimer !== null) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
    if (ocrController) {
      try {
        ocrController.abort();
      } catch {
        // abaikan
      }
      ocrController = null;
    }
    stopCamera();
  };
}
