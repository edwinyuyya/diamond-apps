// Rekam Medisku — model data, konstanta, factory, dan validasi.
// Bebas DOM: aman diimpor node:test.

export const APP_ID = 'rawatku';
export const APP_VERSION = '1.1.0';
export const SCHEMA_VERSION = 1; // field baru bersifat aditif; versi tetap 1
export const EMERGENCY_NUMBERS = ['112', '119'];

export const DISCLAIMERS = {
  app: 'Rekam Medisku bukan alat medis. Aplikasi ini tidak mendiagnosis, tidak menyarankan dosis, dan tidak memeriksa interaksi obat. Data ditulis sendiri oleh pemilik. Konsultasikan selalu dengan dokter atau apoteker.',
  duplicate: 'Pemeriksaan ini hanya membandingkan teks bahan aktif yang Anda masukkan (huruf besar/kecil dan tanda baca diabaikan). Ini bukan pemeriksaan interaksi obat atau duplikasi resep. Konsultasikan dengan dokter atau apoteker.',
  range: 'Rentang acuan diatur sendiri oleh pemilik/dokter. Nilai di luar rentang bukan diagnosis. Konsultasikan dengan tenaga kesehatan.',
  emergency: 'Kartu ini berisi data yang Anda tulis sendiri, bukan penilaian medis. Dalam darurat, hubungi 112 atau 119.',
  summary: 'Ringkasan ini dibuat otomatis dari catatan Anda untuk membantu komunikasi dengan dokter. Ini bukan rekomendasi medis. Diskusikan dengan dokter.',
  stock: 'Perkiraan stok dihitung dari jadwal dan jumlah stok yang Anda masukkan. Pemakaian sebenarnya bisa berbeda; konsultasikan dengan apoteker/dokter.',
  privacy: 'Data hanya disimpan di perangkat ini. Tidak ada akun, cloud, atau pelacak.',
  ocr: 'Hasil pemindaian foto bisa salah, terutama tulisan tangan. Periksa setiap angka dan nama obat dengan dokumen asli. Kesalahan membaca dosis bisa berbahaya. Cocokkan dengan apoteker atau dokter.',
  resep: 'Terjemahan ini hanya membantu membaca singkatan resep; bukan saran dosis. Cocokkan dengan apoteker atau dokter sebelum diminum.',
  rekam: 'Hasil ini hanya menyalin teks dokumen, bukan diagnosis atau interpretasi. Cocokkan dengan dokumen asli dan dokter.',
  review: 'Periksa dan sunting semua bidang sebelum menyimpan. Data tidak disimpan sampai Anda mencentang "Saya sudah mencocokkan dengan resep asli".',
  photo: 'Foto sumber disimpan hanya di perangkat ini dan tidak dikirim ke layanan luar. Cadangan JSON tidak menyertakan byte foto.'
};

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'tidak tahu'];
export const SEX_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
  { value: '', label: 'Tidak disebutkan' }
];

export const VITAL_TYPES = {
  tension: { label: 'Tekanan darah', unit: 'mmHg', kind: 'dual', components: ['systolic', 'diastolic'], componentLabels: { systolic: 'Sistolik', diastolic: 'Diastolik' } },
  glucose: { label: 'Gula darah', unit: 'mg/dL', kind: 'single', components: ['value'] },
  weight: { label: 'Berat badan', unit: 'kg', kind: 'single', components: ['value'] },
  temperature: { label: 'Suhu tubuh', unit: '°C', kind: 'single', components: ['value'] },
  pulse: { label: 'Denyut nadi', unit: 'bpm', kind: 'single', components: ['value'] },
  spo2: { label: 'Saturasi oksigen (SpO₂)', unit: '%', kind: 'single', components: ['value'] }
};

export const VITAL_TYPE_ORDER = ['tension', 'glucose', 'weight', 'temperature', 'pulse', 'spo2'];
export const RANGE_METRICS = ['systolic', 'diastolic', 'glucose', 'weight', 'temperature', 'pulse', 'spo2'];
export const SETTINGS_DEFAULTS = { fontLarge: false, highContrast: false, reminders: true };
export const MAX_ATTACHMENT_BYTES = 1048576; // 1 MiB per berkas
export const MAX_ATTACHMENTS_PER_VISIT = 10;
export const ALLOWED_ATTACHMENT_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'
];

export const SCAN_KINDS = ['resep', 'etiket', 'rekam-medis'];
export const ALLOWED_SOURCE_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_SOURCE_PHOTO_BYTES = 2097152; // 2 MiB setelah kompresi
export const MAX_SOURCE_PHOTO_DIMENSION = 2000;
export const MAX_OCR_TEXT_CHARS = 20000;
export const OCR_LOW_CONFIDENCE = 0.6;
export const PARSER_RESEP_VERSION = 'resep-v1';
export const PARSER_REKAM_VERSION = 'rekam-v1';

export const ITEM_COLLECTIONS = ['visits', 'medications', 'doseLogs', 'vitals', 'labs', 'refRanges', 'questions'];
export const ITEM_PREFIXES = {
  profiles: 'prf', visits: 'vis', medications: 'med', doseLogs: 'dose',
  vitals: 'vit', labs: 'lab', refRanges: 'ref', questions: 'q', photos: 'pho'
};

const VALIDATION_MESSAGE = 'Data belum lengkap atau tidak valid. Periksa kembali.';

export class ValidationError extends Error {
  constructor(message, { code = 'DATA_TIDAK_VALID', field = null } = {}) {
    super(message || VALIDATION_MESSAGE);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
  }
}

// ---------------------------------------------------------------------------
// Utilitas kecil
// ---------------------------------------------------------------------------

function validationError(field, message) {
  return new ValidationError(message || VALIDATION_MESSAGE, { field });
}

function assert(condition, field, message) {
  if (!condition) throw validationError(field, message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function cloneArray(value) {
  return Array.isArray(value) ? value.map((entry) => clone(entry)) : [];
}

function stringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [];
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function localTodayISO(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function isValidDateISO(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidISO(value) {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function toISO(value) {
  return isValidISO(value) ? value : null;
}

function stampFields(input) {
  const createdAt = toISO(input.createdAt) || nowISO();
  const updatedAt = toISO(input.updatedAt) || createdAt;
  return { createdAt, updatedAt };
}

function stringOr(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

function numberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function base64DecodedBytes(value) {
  if (typeof value !== 'string') return -1;
  const clean = value.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) return -1;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return (clean.length / 4) * 3 - padding;
}

// ---------------------------------------------------------------------------
// Id & waktu
// ---------------------------------------------------------------------------

export function newId(prefix = 'id') {
  const p = typeof prefix === 'string' && prefix ? prefix : 'id';
  let random;
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    random = c.randomUUID().replace(/-/g, '');
  } else {
    random = '';
    for (let i = 0; i < 4; i += 1) {
      random += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
    }
  }
  return `${p}_${random}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function makeDoseLogId(medicationId, dateISO, time) {
  const timePart = String(time ?? '').replace(':', '');
  return `dose_${medicationId}_${dateISO}_${timePart}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEmptyState({ profileName = 'Saya', now = new Date() } = {}) {
  const date = now instanceof Date ? now : new Date(now);
  const iso = Number.isNaN(date.getTime()) ? nowISO() : date.toISOString();
  const profile = createProfile({ name: profileName, createdAt: iso, updatedAt: iso });
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    createdAt: iso,
    updatedAt: iso,
    settings: { ...SETTINGS_DEFAULTS },
    activeProfileId: profile.id,
    profiles: [profile],
    visits: [],
    medications: [],
    doseLogs: [],
    vitals: [],
    labs: [],
    refRanges: [],
    questions: []
  };
}

export function createProfile(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  const doctor = isPlainObject(data.doctor) ? data.doctor : {};
  const contacts = Array.isArray(data.emergencyContacts)
    ? data.emergencyContacts.slice(0, 3).map((contact) => ({
      name: stringOr(contact?.name, ''),
      relation: stringOr(contact?.relation, ''),
      phone: stringOr(contact?.phone, '')
    }))
    : [];
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.profiles),
    name: stringOr(data.name, 'Saya'),
    birthDate: data.birthDate ?? null,
    sex: stringOr(data.sex, ''),
    bloodType: stringOr(data.bloodType, 'tidak tahu'),
    allergies: stringArray(data.allergies),
    chronicConditions: stringArray(data.chronicConditions),
    emergencyContacts: contacts,
    doctor: {
      name: stringOr(doctor.name, ''),
      facility: stringOr(doctor.facility, ''),
      phone: stringOr(doctor.phone, '')
    },
    notes: stringOr(data.notes, ''),
    createdAt,
    updatedAt
  };
}

export function createVisit(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.visits),
    profileId: data.profileId ?? null,
    date: stringOr(data.date, localTodayISO()),
    doctorName: stringOr(data.doctorName, ''),
    facility: stringOr(data.facility, ''),
    complaint: stringOr(data.complaint, ''),
    diagnosis: stringOr(data.diagnosis, ''),
    notes: stringOr(data.notes, ''),
    attachments: cloneArray(data.attachments),
    source: data.source ?? null,
    createdAt,
    updatedAt
  };
}

export function createMedication(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  const stock = isPlainObject(data.stock) ? data.stock : {};
  const daysOfWeek = Array.isArray(data.daysOfWeek)
    ? Array.from(new Set(data.daysOfWeek.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)))
    : [0, 1, 2, 3, 4, 5, 6];
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.medications),
    profileId: data.profileId ?? null,
    name: stringOr(data.name, ''),
    activeIngredient: stringOr(data.activeIngredient, ''),
    dose: stringOr(data.dose, ''),
    doseUnit: stringOr(data.doseUnit, ''),
    instructions: stringOr(data.instructions, ''),
    times: Array.isArray(data.times) ? data.times.filter((t) => typeof t === 'string') : [],
    daysOfWeek,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    stock: {
      remaining: numberOrNull(stock.remaining),
      unit: stringOr(stock.unit, 'tablet'),
      unitsPerDose: typeof stock.unitsPerDose === 'number' && Number.isFinite(stock.unitsPerDose)
        ? stock.unitsPerDose
        : 1
    },
    refillReminderDays: Number.isInteger(data.refillReminderDays) && data.refillReminderDays >= 0
      ? data.refillReminderDays
      : 3,
    active: data.active !== false,
    notes: stringOr(data.notes, ''),
    source: data.source ?? null,
    createdAt,
    updatedAt
  };
}

export function createVital(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  const type = stringOr(data.type, '');
  const definition = VITAL_TYPES[type];
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.vitals),
    profileId: data.profileId ?? null,
    type,
    date: stringOr(data.date, localTodayISO()),
    time: stringOr(data.time, '00:00'),
    values: isPlainObject(data.values) ? clone(data.values) : {},
    unit: stringOr(data.unit, definition ? definition.unit : ''),
    note: stringOr(data.note, ''),
    createdAt,
    updatedAt
  };
}

export function createLab(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.labs),
    profileId: data.profileId ?? null,
    date: stringOr(data.date, localTodayISO()),
    name: stringOr(data.name, ''),
    value: typeof data.value === 'number' ? data.value : null,
    unit: stringOr(data.unit, ''),
    refLow: data.refLow ?? null,
    refHigh: data.refHigh ?? null,
    note: stringOr(data.note, ''),
    facility: stringOr(data.facility, ''),
    source: data.source ?? null,
    createdAt,
    updatedAt
  };
}

export function createRefRange(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.refRanges),
    profileId: data.profileId ?? null,
    metric: stringOr(data.metric, ''),
    low: data.low ?? null,
    high: data.high ?? null,
    unit: stringOr(data.unit, ''),
    createdAt,
    updatedAt
  };
}

export function createQuestion(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  return {
    id: typeof data.id === 'string' && data.id ? data.id : newId(ITEM_PREFIXES.questions),
    profileId: data.profileId ?? null,
    text: stringOr(data.text, ''),
    source: 'manual',
    done: data.done === true,
    createdAt,
    updatedAt
  };
}

export function createDoseLog(input = {}) {
  const data = isPlainObject(input) ? input : {};
  const { createdAt, updatedAt } = stampFields(data);
  const medicationId = stringOr(data.medicationId, '');
  const date = stringOr(data.date, localTodayISO());
  const time = stringOr(data.time, '00:00');
  return {
    id: typeof data.id === 'string' && data.id
      ? data.id
      : makeDoseLogId(medicationId, date, time),
    profileId: data.profileId ?? null,
    medicationId,
    date,
    time,
    status: data.status === 'skipped' ? 'skipped' : 'taken',
    takenAt: toISO(data.takenAt) || nowISO(),
    createdAt,
    updatedAt
  };
}

const FACTORIES = {
  visits: createVisit,
  medications: createMedication,
  doseLogs: createDoseLog,
  vitals: createVital,
  labs: createLab,
  refRanges: createRefRange,
  questions: createQuestion
};

export function createItem(collection, input = {}) {
  const factory = FACTORIES[collection];
  if (!factory) {
    throw validationError('collection', `Koleksi "${collection}" tidak dikenal.`);
  }
  return factory(input);
}

// ---------------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------------

function validateId(item, field = 'id') {
  assert(typeof item.id === 'string' && item.id.length > 0, field, 'ID wajib diisi.');
}

function validateProfileIdIfPresent(item) {
  if (item.profileId != null) {
    assert(typeof item.profileId === 'string' && item.profileId.length > 0, 'profileId',
      'Profil tidak valid.');
  }
}

function validateAttachment(attachment, index) {
  const prefix = `attachments[${index}]`;
  assert(isPlainObject(attachment), prefix, 'Lampiran tidak valid.');
  assert(ALLOWED_ATTACHMENT_MIME.includes(attachment.mime), `${prefix}.mime`,
    'Jenis berkas lampiran tidak didukung.');
  assert(typeof attachment.dataBase64 === 'string' && attachment.dataBase64.length > 0,
    `${prefix}.dataBase64`, 'Isi lampiran kosong.');
  assert(typeof attachment.size === 'number' && Number.isFinite(attachment.size) && attachment.size >= 0,
    `${prefix}.size`, 'Ukuran lampiran tidak valid.');
  const decoded = base64DecodedBytes(attachment.dataBase64);
  assert(decoded >= 0 && decoded <= MAX_ATTACHMENT_BYTES, prefix,
    'Lampiran terlalu besar (maks. 1 MB per berkas).');
}

function validateProfile(item) {
  assert(isPlainObject(item), 'profile', 'Profil tidak valid.');
  validateId(item);
  assert(typeof item.name === 'string' && item.name.trim().length > 0, 'name',
    'Nama profil wajib diisi.');
  if (item.birthDate != null) {
    assert(isValidDateISO(item.birthDate), 'birthDate', 'Tanggal lahir tidak valid.');
  }
  if (item.sex != null && item.sex !== '') {
    assert(item.sex === 'L' || item.sex === 'P', 'sex', 'Jenis kelamin tidak valid.');
  }
  if (item.bloodType != null) {
    assert(BLOOD_TYPES.includes(item.bloodType), 'bloodType', 'Golongan darah tidak valid.');
  }
  for (const field of ['allergies', 'chronicConditions']) {
    assert(Array.isArray(item[field]), field, 'Daftar wajib berupa array.');
    assert(item[field].every((entry) => typeof entry === 'string'), field,
      'Daftar wajib berisi teks.');
  }
  assert(Array.isArray(item.emergencyContacts), 'emergencyContacts',
    'Kontak darurat wajib berupa array.');
  assert(item.emergencyContacts.length <= 3, 'emergencyContacts',
    'Kontak darurat maksimal 3.');
  item.emergencyContacts.forEach((contact, index) => {
    assert(isPlainObject(contact), `emergencyContacts[${index}]`, 'Kontak darurat tidak valid.');
    assert(typeof contact.name === 'string', `emergencyContacts[${index}].name`,
      'Nama kontak darurat tidak valid.');
    assert(typeof contact.relation === 'string', `emergencyContacts[${index}].relation`,
      'Hubungan kontak darurat tidak valid.');
    assert(typeof contact.phone === 'string', `emergencyContacts[${index}].phone`,
      'Nomor kontak darurat tidak valid.');
  });
  if (item.doctor != null) {
    assert(isPlainObject(item.doctor), 'doctor', 'Data dokter tidak valid.');
    for (const key of ['name', 'facility', 'phone']) {
      assert(typeof item.doctor[key] === 'string', `doctor.${key}`, 'Data dokter tidak valid.');
    }
  }
  if (item.notes != null) {
    assert(typeof item.notes === 'string', 'notes', 'Catatan tidak valid.');
  }
}

function validateVisit(item) {
  assert(isPlainObject(item), 'visit', 'Kunjungan tidak valid.');
  validateId(item);
  validateProfileIdIfPresent(item);
  assert(isValidDateISO(item.date), 'date', 'Tanggal kunjungan tidak valid.');
  for (const key of ['doctorName', 'facility', 'complaint', 'diagnosis', 'notes']) {
    if (item[key] != null) assert(typeof item[key] === 'string', key, 'Teks kunjungan tidak valid.');
  }
  assert(Array.isArray(item.attachments), 'attachments', 'Lampiran wajib berupa array.');
  assert(item.attachments.length <= MAX_ATTACHMENTS_PER_VISIT, 'attachments',
    'Lampiran maksimal 10 per kunjungan.');
  item.attachments.forEach(validateAttachment);
  if (item.source != null) validateSourceMeta(item.source);
}

function validateMedication(item) {
  assert(isPlainObject(item), 'medication', 'Obat tidak valid.');
  validateId(item);
  validateProfileIdIfPresent(item);
  assert(typeof item.name === 'string' && item.name.trim().length > 0, 'name',
    'Nama obat wajib diisi.');
  for (const key of ['activeIngredient', 'dose', 'doseUnit', 'instructions', 'notes']) {
    if (item[key] != null) assert(typeof item[key] === 'string', key, 'Teks obat tidak valid.');
  }
  assert(Array.isArray(item.times), 'times', 'Jadwal minum wajib berupa array.');
  assert(item.times.every((time) => isValidTime(time)), 'times',
    'Format jam harus HH:mm.');
  assert(Array.isArray(item.daysOfWeek), 'daysOfWeek', 'Hari minum wajib berupa array.');
  assert(item.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    'daysOfWeek', 'Hari minum harus 0–6.');
  assert(new Set(item.daysOfWeek).size === item.daysOfWeek.length, 'daysOfWeek',
    'Hari minum tidak boleh duplikat.');
  for (const key of ['startDate', 'endDate']) {
    if (item[key] != null) {
      assert(isValidDateISO(item[key]), key, 'Tanggal obat tidak valid.');
    }
  }
  if (item.stock != null) {
    assert(isPlainObject(item.stock), 'stock', 'Data stok tidak valid.');
    if (item.stock.remaining != null) {
      assert(typeof item.stock.remaining === 'number' && Number.isFinite(item.stock.remaining)
        && item.stock.remaining >= 0, 'stock.remaining', 'Sisa stok tidak valid.');
    }
    if (item.stock.unitsPerDose != null) {
      assert(typeof item.stock.unitsPerDose === 'number'
        && Number.isFinite(item.stock.unitsPerDose) && item.stock.unitsPerDose > 0,
        'stock.unitsPerDose', 'Jumlah per dosis harus lebih dari 0.');
    }
  }
  if (item.refillReminderDays != null) {
    assert(Number.isInteger(item.refillReminderDays) && item.refillReminderDays >= 0,
      'refillReminderDays', 'Pengingat tebus harus bilangan bulat ≥ 0.');
  }
  if (item.active != null) {
    assert(typeof item.active === 'boolean', 'active', 'Status aktif tidak valid.');
  }
  if (item.source != null) validateSourceMeta(item.source);
}

function validateVital(item) {
  assert(isPlainObject(item), 'vital', 'Data vital tidak valid.');
  validateId(item);
  validateProfileIdIfPresent(item);
  const definition = VITAL_TYPES[item.type];
  assert(Boolean(definition), 'type', 'Jenis vital tidak dikenal.');
  assert(isValidDateISO(item.date), 'date', 'Tanggal vital tidak valid.');
  if (item.time != null && item.time !== '') {
    assert(isValidTime(item.time), 'time', 'Jam vital tidak valid.');
  }
  assert(isPlainObject(item.values), 'values', 'Nilai vital tidak valid.');
  for (const component of definition.components) {
    assert(typeof item.values[component] === 'number' && Number.isFinite(item.values[component]),
      `values.${component}`, 'Nilai vital harus berupa angka.');
  }
  if (item.unit != null) assert(typeof item.unit === 'string', 'unit', 'Satuan vital tidak valid.');
  if (item.note != null) assert(typeof item.note === 'string', 'note', 'Catatan vital tidak valid.');
}

function validateLab(item) {
  assert(isPlainObject(item), 'lab', 'Hasil lab tidak valid.');
  validateId(item);
  validateProfileIdIfPresent(item);
  assert(typeof item.name === 'string' && item.name.trim().length > 0, 'name',
    'Nama pemeriksaan wajib diisi.');
  assert(typeof item.value === 'number' && Number.isFinite(item.value), 'value',
    'Nilai lab harus berupa angka.');
  for (const key of ['refLow', 'refHigh']) {
    if (item[key] != null) {
      assert(typeof item[key] === 'number' && Number.isFinite(item[key]), key,
        'Nilai rujukan tidak valid.');
    }
  }
  if (item.refLow != null && item.refHigh != null) {
    assert(item.refLow <= item.refHigh, 'refLow', 'Rentang rujukan terbalik.');
  }
  if (item.date != null && item.date !== '') {
    assert(isValidDateISO(item.date), 'date', 'Tanggal lab tidak valid.');
  }
  for (const key of ['unit', 'note', 'facility']) {
    if (item[key] != null) assert(typeof item[key] === 'string', key, 'Teks lab tidak valid.');
  }
  if (item.source != null) validateSourceMeta(item.source);
}

function validateRefRange(item) {
  assert(isPlainObject(item), 'refRange', 'Rentang acuan tidak valid.');
  validateId(item);
  validateProfileIdIfPresent(item);
  assert(RANGE_METRICS.includes(item.metric), 'metric', 'Metrik rentang tidak dikenal.');
  for (const key of ['low', 'high']) {
    if (item[key] != null) {
      assert(typeof item[key] === 'number' && Number.isFinite(item[key]), key,
        'Nilai rentang tidak valid.');
    }
  }
  assert(item.low != null || item.high != null, 'low', 'Minimal satu batas rentang harus diisi.');
  if (item.low != null && item.high != null) {
    assert(item.low <= item.high, 'low', 'Rentang acuan terbalik.');
  }
  if (item.unit != null) assert(typeof item.unit === 'string', 'unit', 'Satuan rentang tidak valid.');
}

function validateDoseLog(item) {
  assert(isPlainObject(item), 'doseLog', 'Catatan minum tidak valid.');
  if (typeof item.id !== 'string' || item.id.length === 0) {
    assert(typeof item.medicationId === 'string' && item.medicationId.length > 0
      && isValidDateISO(item.date) && isValidTime(item.time), 'id',
      'ID catatan minum tidak dapat dibuat.');
    item.id = makeDoseLogId(item.medicationId, item.date, item.time);
  }
  validateProfileIdIfPresent(item);
  assert(item.status === 'taken' || item.status === 'skipped', 'status',
    'Status harus taken atau skipped.');
  assert(isValidDateISO(item.date), 'date', 'Tanggal catatan minum tidak valid.');
  assert(isValidTime(item.time), 'time', 'Jam catatan minum tidak valid.');
  if (item.takenAt != null) {
    assert(isValidISO(item.takenAt), 'takenAt', 'Waktu pencatatan tidak valid.');
  }
}

function validateQuestion(item) {
  assert(isPlainObject(item), 'question', 'Pertanyaan tidak valid.');
  validateId(item);
  validateProfileIdIfPresent(item);
  assert(typeof item.text === 'string' && item.text.trim().length > 0, 'text',
    'Pertanyaan wajib diisi.');
  if (item.done != null) assert(typeof item.done === 'boolean', 'done', 'Status pertanyaan tidak valid.');
}

const VALIDATORS = {
  profiles: validateProfile,
  visits: validateVisit,
  medications: validateMedication,
  doseLogs: validateDoseLog,
  vitals: validateVital,
  labs: validateLab,
  refRanges: validateRefRange,
  questions: validateQuestion
};

export function validateItem(collection, item) {
  const validator = VALIDATORS[collection];
  if (!validator) {
    throw validationError('collection', `Koleksi "${collection}" tidak dikenal.`);
  }
  validator(item);
  return item;
}

export function validateSourceMeta(source) {
  assert(isPlainObject(source), 'source', 'Metadata sumber tidak valid.');
  assert(SCAN_KINDS.includes(source.kind), 'source.kind', 'Jenis sumber tidak dikenal.');
  if (source.photoId != null) {
    assert(typeof source.photoId === 'string' && source.photoId.length > 0, 'source.photoId',
      'ID foto tidak valid.');
  }
  if (source.photoMime != null) {
    assert(ALLOWED_SOURCE_PHOTO_MIME.includes(source.photoMime), 'source.photoMime',
      'Jenis foto sumber tidak didukung.');
  }
  assert(typeof source.ocrText === 'string', 'source.ocrText', 'Teks OCR tidak valid.');
  assert(source.ocrText.length <= MAX_OCR_TEXT_CHARS, 'source.ocrText',
    'Teks OCR terlalu panjang.');
  assert(typeof source.translatedText === 'string', 'source.translatedText',
    'Teks terjemahan tidak valid.');
  assert(source.translatedText.length <= MAX_OCR_TEXT_CHARS, 'source.translatedText',
    'Teks terjemahan terlalu panjang.');
  if (source.ocrConfidence != null) {
    assert(typeof source.ocrConfidence === 'number' && Number.isFinite(source.ocrConfidence)
      && source.ocrConfidence >= 0 && source.ocrConfidence <= 1, 'source.ocrConfidence',
      'Kepercayaan OCR harus 0–1.');
  }
  assert(typeof source.verifiedByUser === 'boolean', 'source.verifiedByUser',
    'Status verifikasi tidak valid.');
  if (source.verifiedByUser) {
    assert(isValidISO(source.verifiedAt), 'source.verifiedAt',
      'Waktu verifikasi wajib diisi.');
  } else if (source.verifiedAt != null) {
    assert(isValidISO(source.verifiedAt), 'source.verifiedAt', 'Waktu verifikasi tidak valid.');
  }
  assert(typeof source.parserVersion === 'string' && source.parserVersion.length > 0,
    'source.parserVersion', 'Versi parser wajib diisi.');
}

// ---------------------------------------------------------------------------
// Normalisasi state
// ---------------------------------------------------------------------------

function versionError() {
  const error = new Error('Versi berkas tidak didukung aplikasi ini.');
  error.code = 'VERSI_TIDAK_DIDUKUNG';
  return error;
}

function normalizeCollection(collection, rawItems) {
  if (!Array.isArray(rawItems)) return [];
  const result = [];
  for (const rawItem of rawItems) {
    if (!isPlainObject(rawItem)) continue;
    let item = clone(rawItem);
    // Item lama tanpa source diisi null; source tidak valid di-reset null,
    // item-nya tetap dipertahankan.
    if (VALIDATORS[collection] && ['visits', 'medications', 'labs'].includes(collection)) {
      if (!Object.prototype.hasOwnProperty.call(item, 'source') || item.source == null) {
        item.source = null;
      } else {
        try {
          validateSourceMeta(item.source);
        } catch {
          item.source = null;
        }
      }
    }
    try {
      validateItem(collection, item);
      result.push(item);
    } catch {
      // Item yang tetap tidak valid dilewati agar data lain tidak hilang.
    }
  }
  return result;
}

export function normalizeState(raw) {
  if (!isPlainObject(raw) || raw.app !== APP_ID || raw.schemaVersion !== SCHEMA_VERSION) {
    throw versionError();
  }
  const fallbackNow = nowISO();
  const state = {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    createdAt: toISO(raw.createdAt) || fallbackNow,
    updatedAt: toISO(raw.updatedAt) || fallbackNow,
    settings: { ...SETTINGS_DEFAULTS },
    activeProfileId: typeof raw.activeProfileId === 'string' ? raw.activeProfileId : null,
    profiles: normalizeCollection('profiles', raw.profiles),
    visits: normalizeCollection('visits', raw.visits),
    medications: normalizeCollection('medications', raw.medications),
    doseLogs: normalizeCollection('doseLogs', raw.doseLogs),
    vitals: normalizeCollection('vitals', raw.vitals),
    labs: normalizeCollection('labs', raw.labs),
    refRanges: normalizeCollection('refRanges', raw.refRanges),
    questions: normalizeCollection('questions', raw.questions)
  };
  if (isPlainObject(raw.settings)) {
    for (const key of Object.keys(SETTINGS_DEFAULTS)) {
      if (typeof raw.settings[key] === 'boolean') state.settings[key] = raw.settings[key];
    }
  }
  if (state.profiles.length === 0) {
    state.profiles.push(createProfile({ name: 'Saya', createdAt: state.createdAt, updatedAt: state.updatedAt }));
  }
  if (!state.profiles.some((profile) => profile.id === state.activeProfileId)) {
    state.activeProfileId = state.profiles[0].id;
  }
  return state;
}

export function cloneState(state) {
  return clone(state);
}

export function profileById(state, id) {
  if (!state || !Array.isArray(state.profiles)) return null;
  return state.profiles.find((profile) => profile.id === id) || null;
}

export function activeProfile(state) {
  if (!state || !Array.isArray(state.profiles) || state.profiles.length === 0) return null;
  return profileById(state, state.activeProfileId) || state.profiles[0] || null;
}

export function ageFromBirthDate(birthDate, now = new Date()) {
  if (!isValidDateISO(birthDate)) return null;
  const reference = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(reference.getTime())) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  let age = reference.getFullYear() - year;
  const currentMonth = reference.getMonth() + 1;
  if (currentMonth < month || (currentMonth === month && reference.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
