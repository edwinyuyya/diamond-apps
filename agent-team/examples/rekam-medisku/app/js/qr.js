// Rekam Medisku — encoder QR Model 2 murni JS (tanpa DOM, tanpa library).
//
// Cakupan: byte mode, EC level M, versi 1–10, pemilihan mask otomatis
// memakai penalty rules ISO/IEC 18004. Quiet zone hanya ditambahkan saat
// dirender oleh `qrToSvg`.
//
// Referensi perilaku:
// - `modules[y][x] === true` berarti modul gelap.
// - `size = 17 + 4 * version`.
// - Kapasitas byte UTF-8 EC M versi 1–10: 14, 26, 42, 62, 84, 106, 122,
//   152, 180, 213.

export const QR_MAX_BYTES = 200;

export class QRError extends Error {
  /**
   * @param {'QR_TERLALU_PANJANG'|'QR_TIDAK_VALID'} code
   * @param {string} [message]
   */
  constructor(code, message) {
    const safeCode = code === 'QR_TERLALU_PANJANG' ? 'QR_TERLALU_PANJANG' : 'QR_TIDAK_VALID';
    super(message || (safeCode === 'QR_TERLALU_PANJANG'
      ? 'Data terlalu panjang untuk kode QR.'
      : 'Data QR tidak valid.'));
    this.name = 'QRError';
    this.code = safeCode;
  }
}

// Kapasitas byte mode EC M versi 1–10 (UTF-8).
const CAPACITY_BYTES_M = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];

// Struktur blok EC M versi 1–10:
// { ecPerBlock, groups: [[jumlahBlok, dataCodewordsPerBlok], ...] }
const BLOCKS_M = [
  null,
  { ecPerBlock: 10, groups: [[1, 16]] },              // v1  26 total
  { ecPerBlock: 16, groups: [[1, 28]] },              // v2  44
  { ecPerBlock: 26, groups: [[1, 44]] },              // v3  70
  { ecPerBlock: 18, groups: [[2, 32]] },              // v4 100
  { ecPerBlock: 24, groups: [[2, 43]] },              // v5 134
  { ecPerBlock: 16, groups: [[4, 27]] },              // v6 172
  { ecPerBlock: 18, groups: [[4, 31]] },              // v7 196
  { ecPerBlock: 22, groups: [[2, 38], [2, 39]] },     // v8 242
  { ecPerBlock: 22, groups: [[3, 36], [2, 37]] },     // v9 292
  { ecPerBlock: 26, groups: [[4, 43], [1, 44]] }      // v10 346
];

const ALIGNMENT_POSITIONS = [
  null,
  [],                 // v1
  [6, 18],            // v2
  [6, 22],            // v3
  [6, 26],            // v4
  [6, 30],            // v5
  [6, 34],            // v6
  [6, 22, 38],        // v7
  [6, 24, 42],        // v8
  [6, 26, 46],        // v9
  [6, 28, 50]         // v10
];

// EC level M memiliki bit format 00 (L=01, M=00, Q=11, H=10).
const EC_FORMAT_BITS_M = 0b00;

// ---------------------------------------------------------------------------
// UTF-8
// ---------------------------------------------------------------------------

/** Panjang byte UTF-8 dari sebuah string (surrogate tunggal -> U+FFFD). */
export function utf8Length(text) {
  const value = String(text ?? '');
  let length = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      length += 1;
    } else if (code < 0x800) {
      length += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        length += 4;
        i += 1;
      } else {
        length += 3; // U+FFFD
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      length += 3; // U+FFFD
    } else {
      length += 3;
    }
  }
  return length;
}

/** Encode string menjadi Uint8Array UTF-8 (tanpa TextEncoder). */
export function utf8Encode(text) {
  const value = String(text ?? '');
  const out = new Uint8Array(utf8Length(value));
  let offset = 0;

  const push = (byte) => {
    out[offset] = byte & 0xff;
    offset += 1;
  };

  for (let i = 0; i < value.length; i += 1) {
    let code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      } else {
        code = 0xfffd;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd;
    }

    if (code < 0x80) {
      push(code);
    } else if (code < 0x800) {
      push(0xc0 | (code >> 6));
      push(0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      push(0xe0 | (code >> 12));
      push(0x80 | ((code >> 6) & 0x3f));
      push(0x80 | (code & 0x3f));
    } else {
      push(0xf0 | (code >> 18));
      push(0x80 | ((code >> 12) & 0x3f));
      push(0x80 | ((code >> 6) & 0x3f));
      push(0x80 | (code & 0x3f));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// GF(256) & Reed–Solomon
// ---------------------------------------------------------------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function polyMultiply(a, b) {
  const out = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      out[i + j] ^= gfMul(a[i], b[j]);
    }
  }
  return out;
}

/** Polinomial generator RS derajat `degree`, koefisien pangkat tertinggi dulu. */
function rsGenerator(degree) {
  let generator = Uint8Array.of(1);
  for (let i = 0; i < degree; i += 1) {
    generator = polyMultiply(generator, Uint8Array.of(1, GF_EXP[i]));
  }
  return generator;
}

/** Sisa pembagian polinomial data oleh generator (kode EC). */
function rsRemainder(data, degree) {
  const generator = rsGenerator(degree);
  const work = new Uint8Array(data.length + degree);
  work.set(data);
  for (let i = 0; i < data.length; i += 1) {
    const factor = work[i];
    if (factor === 0) continue;
    for (let j = 0; j < generator.length; j += 1) {
      work[i + j] ^= gfMul(generator[j], factor);
    }
  }
  return work.slice(data.length);
}

// ---------------------------------------------------------------------------
// Bit buffer & data codewords
// ---------------------------------------------------------------------------

function pushBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function buildDataCodewords(bytes, version) {
  const blockSpec = BLOCKS_M[version];
  const dataCodewords = blockSpec.groups.reduce(
    (total, [count, perBlock]) => total + count * perBlock,
    0
  );
  const capacityBits = dataCodewords * 8;
  const countBits = version <= 9 ? 8 : 16;

  const bits = [];
  pushBits(bits, 0b0100, 4); // byte mode
  pushBits(bits, bytes.length, countBits);
  for (let i = 0; i < bytes.length; i += 1) pushBits(bits, bytes[i], 8);

  // Terminator hingga 4 bit nol, lalu sejajarkan ke batas byte.
  const terminator = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    codewords.push(value);
  }

  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < dataCodewords) {
    codewords.push(padBytes[padIndex % 2]);
    padIndex += 1;
  }
  return Uint8Array.from(codewords);
}

function buildBlocks(dataCodewords, version) {
  const spec = BLOCKS_M[version];
  const blocks = [];
  let offset = 0;
  for (const [count, perBlock] of spec.groups) {
    for (let i = 0; i < count; i += 1) {
      const data = dataCodewords.slice(offset, offset + perBlock);
      offset += perBlock;
      blocks.push({ data, ec: rsRemainder(data, spec.ecPerBlock) });
    }
  }
  return blocks;
}

function interleave(blocks, version) {
  const spec = BLOCKS_M[version];
  const maxData = Math.max(...blocks.map((block) => block.data.length));
  const out = [];
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) {
      if (i < block.data.length) out.push(block.data[i]);
    }
  }
  for (let i = 0; i < spec.ecPerBlock; i += 1) {
    for (const block of blocks) out.push(block.ec[i]);
  }
  return Uint8Array.from(out);
}

function buildCodewords(bytes, version) {
  return interleave(buildBlocks(buildDataCodewords(bytes, version), version), version);
}

// ---------------------------------------------------------------------------
// Pola fungsi
// ---------------------------------------------------------------------------

function makeMatrix(size) {
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const reservedFlag = Array.from({ length: size }, () => new Array(size).fill(false));
  return { modules, reservedFlag };
}

function setFunction(matrix, x, y, dark) {
  if (x < 0 || y < 0 || y >= matrix.length || x >= matrix.length) return;
  matrix[y][x] = Boolean(dark);
  matrix.reservedFlag[y][x] = true;
}

/**
 * Matriks kerja berisi `modules` + `reservedFlag`.
 * Fungsi ini menulis pola fungsi (finder, timing, alignment, versi, format).
 */
function drawFunctionPatterns(version) {
  const size = 17 + 4 * version;
  const matrix = makeMatrix(size);
  const reservedFlag = matrix.reservedFlag;

  const set = (x, y, dark) => {
    matrix.modules[y][x] = Boolean(dark);
    reservedFlag[y][x] = true;
  };

  // Timing pattern.
  for (let i = 0; i < size; i += 1) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }

  // Finder pattern + separator, pusat (3,3), (size-4,3), (3,size-4).
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, distance !== 2 && distance !== 4);
      }
    }
  }

  // Alignment pattern.
  const positions = ALIGNMENT_POSITIONS[version];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = 0; j < positions.length; j += 1) {
      const cx = positions[i];
      const cy = positions[j];
      if (
        (cx === 6 && cy === 6)
        || (cx === 6 && cy === size - 7)
        || (cx === size - 7 && cy === 6)
      ) {
        continue;
      }
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          set(cx + dx, cy + dy, distance !== 1);
        }
      }
    }
  }

  // Reservasi area format (nilai diisi ulang setelah mask dipilih).
  drawFormatBits(matrix, version, 0);

  // Info versi (v7–v10).
  if (version >= 7) drawVersionBits(matrix, version);

  return { modules: matrix.modules, reservedFlag, size };
}

function drawFormatBits(matrix, version, mask) {
  const size = 17 + 4 * version;
  const data = (EC_FORMAT_BITS_M << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  const bits = ((data << 10) | remainder) ^ 0x5412;

  const set = (x, y, bitIndex) => {
    matrix.modules[y][x] = ((bits >>> bitIndex) & 1) === 1;
    matrix.reservedFlag[y][x] = true;
  };

  // Salinan pertama di sekitar finder kiri-atas.
  for (let i = 0; i <= 5; i += 1) set(8, i, i);
  set(8, 7, 6);
  set(8, 8, 7);
  set(7, 8, 8);
  for (let i = 9; i <= 14; i += 1) set(14 - i, 8, i);

  // Salinan kedua di kanan-atas dan kiri-bawah.
  for (let i = 0; i <= 7; i += 1) set(size - 1 - i, 8, i);
  for (let i = 8; i <= 14; i += 1) set(8, size - 15 + i, i);

  // Modul gelap wajib.
  matrix.modules[size - 8][8] = true;
  matrix.reservedFlag[size - 8][8] = true;
}

function drawVersionBits(matrix, version) {
  const size = 17 + 4 * version;
  let remainder = version;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  const bits = (version << 12) | remainder;

  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >>> i) & 1) === 1;
    const a = size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    matrix.modules[b][a] = bit;
    matrix.reservedFlag[b][a] = true;
    matrix.modules[a][b] = bit;
    matrix.reservedFlag[a][b] = true;
  }
}

// ---------------------------------------------------------------------------
// Penempatan data & mask
// ---------------------------------------------------------------------------

function placeData(matrix, dataBits) {
  const size = matrix.size;
  let bitIndex = 0;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (matrix.reservedFlag[y][x]) continue;
        if (bitIndex < dataBits.length) {
          matrix.modules[y][x] = dataBits[bitIndex] === 1;
          bitIndex += 1;
        } else {
          // Modul sisa (remainder bits) tetap terang.
          matrix.modules[y][x] = false;
        }
      }
    }
  }
  return bitIndex;
}

function maskBit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0;
    case 7: return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
    default: return false;
  }
}

function applyMask(modules, reservedFlag, mask) {
  const size = modules.length;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!reservedFlag[y][x] && maskBit(mask, x, y)) {
        modules[y][x] = !modules[y][x];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Penalty
// ---------------------------------------------------------------------------

const FINDER_LIKE_PATTERNS = [
  [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]
];

function penaltyScore(modules) {
  const size = modules.length;
  let penalty = 0;

  const linePenalty = (getter) => {
    for (let line = 0; line < size; line += 1) {
      let runColor = null;
      let runLength = 0;
      for (let i = 0; i < size; i += 1) {
        const color = getter(line, i);
        if (color === runColor) {
          runLength += 1;
        } else {
          if (runLength >= 5) penalty += 3 + (runLength - 5);
          runColor = color;
          runLength = 1;
        }
      }
      if (runLength >= 5) penalty += 3 + (runLength - 5);
    }
  };

  linePenalty((y, x) => modules[y][x]);
  linePenalty((x, y) => modules[y][x]);

  // Blok 2x2 sewarna.
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y][x];
      if (
        modules[y][x + 1] === color
        && modules[y + 1][x] === color
        && modules[y + 1][x + 1] === color
      ) {
        penalty += 3;
      }
    }
  }

  // Pola mirip finder 11 modul.
  const matches = (values) => {
    for (let offset = 0; offset + 11 <= values.length; offset += 1) {
      for (const pattern of FINDER_LIKE_PATTERNS) {
        let equal = true;
        for (let i = 0; i < 11; i += 1) {
          const value = values[offset + i] ? 1 : 0;
          if (value !== pattern[i]) {
            equal = false;
            break;
          }
        }
        if (equal) penalty += 40;
      }
    }
  };

  for (let y = 0; y < size; y += 1) matches(modules[y]);
  for (let x = 0; x < size; x += 1) {
    matches(modules.map((row) => row[x]));
  }

  // Keseimbangan gelap/terang.
  let dark = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) if (modules[y][x]) dark += 1;
  }
  const total = size * size;
  const percent = (dark * 100) / total;
  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return penalty;
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/**
 * Encode teks menjadi matriks QR Model 2 byte mode, EC M, versi 1–10.
 *
 * @param {string} text
 * @param {{ec?: string, minVersion?: number, maxVersion?: number}} [options]
 * @returns {{version:number,size:number,ec:string,modules:boolean[][],byteLength:number}}
 */
export function encodeQR(text, { ec = 'M', minVersion = 1, maxVersion = 10 } = {}) {
  if (typeof text !== 'string') {
    throw new QRError('QR_TIDAK_VALID', 'Teks QR harus berupa string.');
  }
  if (ec !== 'M') {
    throw new QRError('QR_TIDAK_VALID', 'Hanya EC level M yang didukung.');
  }
  const minV = Number.isInteger(minVersion) ? minVersion : 1;
  const maxV = Number.isInteger(maxVersion) ? maxVersion : 10;
  if (minV < 1 || maxV > 10 || minV > maxV) {
    throw new QRError('QR_TIDAK_VALID', 'Rentang versi QR tidak valid.');
  }

  const bytes = utf8Encode(text);
  const byteLength = bytes.length;

  let version = null;
  for (let candidate = minV; candidate <= maxV; candidate += 1) {
    if (byteLength <= CAPACITY_BYTES_M[candidate - 1]) {
      version = candidate;
      break;
    }
  }
  if (version === null) {
    throw new QRError(
      'QR_TERLALU_PANJANG',
      `Data ${byteLength} byte melebihi kapasitas QR versi ${maxV} (EC M).`
    );
  }

  const codewords = buildCodewords(bytes, version);
  const dataBits = [];
  for (let i = 0; i < codewords.length; i += 1) {
    for (let bit = 7; bit >= 0; bit -= 1) dataBits.push((codewords[i] >>> bit) & 1);
  }

  const base = drawFunctionPatterns(version);
  const placedBits = placeData(base, dataBits);
  if (placedBits !== dataBits.length) {
    // Pengaman internal: jangan pernah menghasilkan QR yang datanya terpotong.
    throw new QRError('QR_TIDAK_VALID', 'Kapasitas matriks QR tidak konsisten.');
  }

  let best = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = base.modules.map((row) => row.slice());
    applyMask(candidate, base.reservedFlag, mask);
    const candidateMatrix = {
      modules: candidate,
      reservedFlag: base.reservedFlag,
      size: base.size
    };
    drawFormatBits(candidateMatrix, version, mask);
    const score = penaltyScore(candidate);
    if (best === null || score < best.score) {
      best = { mask, modules: candidate, score };
    }
  }

  return {
    version,
    size: base.size,
    ec: 'M',
    modules: best.modules,
    byteLength,
    mask: best.mask
  };
}

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return character;
    }
  });
}

/**
 * Render QR menjadi string SVG aksesibel. Quiet zone hanya ditambahkan di sini.
 *
 * @param {{size:number,modules:boolean[][]}} qr
 * @param {{margin?:number,moduleSize?:number,dark?:string,light?:string,ariaLabel?:string}} [options]
 * @returns {string}
 */
export function qrToSvg(qr, {
  margin = 4,
  moduleSize = 4,
  dark = '#111827',
  light = '#ffffff',
  ariaLabel = 'Kode QR Kartu Darurat Rekam Medisku'
} = {}) {
  if (!qr || !Number.isInteger(qr.size) || !Array.isArray(qr.modules)) {
    throw new QRError('QR_TIDAK_VALID', 'Matriks QR tidak valid.');
  }
  const size = qr.size;
  if (qr.modules.length !== size || qr.modules.some((row) => !Array.isArray(row) || row.length !== size)) {
    throw new QRError('QR_TIDAK_VALID', 'Matriks QR tidak valid.');
  }

  const marginModules = Number.isFinite(margin) ? Math.max(0, Math.floor(margin)) : 4;
  const scale = Number.isFinite(moduleSize) && moduleSize > 0 ? moduleSize : 4;
  const dimension = (size + marginModules * 2) * scale;

  const darkPaths = [];
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (!qr.modules[y][x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < size && qr.modules[y][x]) x += 1;
      const dx = (start + marginModules) * scale;
      const dy = (y + marginModules) * scale;
      const width = (x - start) * scale;
      darkPaths.push(`M${dx} ${dy}h${width}v${scale}h-${width}z`);
    }
  }

  const label = escapeXml(ariaLabel);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}"`,
    ` width="${dimension}" height="${dimension}" role="img" aria-label="${label}"`,
    ' shape-rendering="crispEdges">',
    `<title>${label}</title>`,
    `<rect width="${dimension}" height="${dimension}" fill="${escapeXml(light)}"/>`,
    darkPaths.length > 0 ? `<path fill="${escapeXml(dark)}" d="${darkPaths.join('')}"/>` : '',
    '</svg>'
  ].join('');
}

// ---------------------------------------------------------------------------
// Payload kartu darurat
// ---------------------------------------------------------------------------

const DEFAULT_EMERGENCY_NUMBERS = ['112', '119'];
const NOTE_LINE = 'Catatan: Data ditulis pemilik, bukan diagnosis.';

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncateChars(value, limit) {
  const text = String(value ?? '');
  const characters = Array.from(text);
  if (characters.length <= limit) return { text, truncated: false };
  return {
    text: characters.slice(0, limit).join('').trimEnd(),
    truncated: true
  };
}

function formatMedication(med) {
  const name = cleanText(med?.name) || 'Obat';
  const dose = cleanText(med?.dose);
  const unit = cleanText(med?.doseUnit);
  const times = Array.isArray(med?.times)
    ? med.times.filter((time) => typeof time === 'string' && /^\d{2}:\d{2}$/.test(time))
    : [];

  let text = name;
  if (dose) text += ` ${dose}${unit ? ` ${unit}` : ''}`;
  if (times.length > 0) text += ` (${times.join(', ')})`;
  return text;
}

function formatContact(contact) {
  const name = cleanText(contact?.name);
  const relation = cleanText(contact?.relation);
  const phone = cleanText(contact?.phone);
  let text = name;
  if (relation) text += name ? ` (${relation})` : relation;
  if (phone) text += text ? ` ${phone}` : phone;
  return text.trim();
}

/**
 * Susun teks darurat UTF-8 ≤ `maxBytes` untuk dipindai tanpa aplikasi.
 * Hanya obat `active !== false`, maksimal 3 obat.
 *
 * @param {object} profile
 * @param {object[]} [medications]
 * @param {{maxBytes?:number,emergencyNumbers?:string[]}} [options]
 * @returns {{text:string,truncated:boolean,bytes:number,fields:object}}
 */
export function emergencyPayload(profile, medications = [], {
  maxBytes = QR_MAX_BYTES,
  emergencyNumbers = DEFAULT_EMERGENCY_NUMBERS
} = {}) {
  if (!profile || typeof profile !== 'object') {
    throw new QRError('QR_TIDAK_VALID', 'Profil darurat tidak valid.');
  }
  const limit = Number.isFinite(maxBytes) && maxBytes > 0
    ? Math.floor(maxBytes)
    : QR_MAX_BYTES;

  let truncated = false;
  const cut = (value, length) => {
    const result = truncateChars(value, length);
    if (result.truncated) truncated = true;
    return result.text;
  };

  const name = cut(cleanText(profile.name) || 'Tidak disebutkan', 30);
  const bloodType = cleanText(profile.bloodType) || 'tidak tahu';

  const allergyList = Array.isArray(profile.allergies)
    ? profile.allergies.map(cleanText).filter(Boolean)
    : [];
  const chronicList = Array.isArray(profile.chronicConditions)
    ? profile.chronicConditions.map(cleanText).filter(Boolean)
    : [];
  const contacts = Array.isArray(profile.emergencyContacts)
    ? profile.emergencyContacts.map(formatContact).filter(Boolean)
    : [];

  let allergies = cut(allergyList.join(', ') || '-', 40);
  let chronic = cut(chronicList.join(', ') || '', 50);
  let contact = cut(contacts.join('; ') || '-', 30);

  const activeMedications = (Array.isArray(medications) ? medications : [])
    .filter((med) => med && med.active !== false)
    .slice(0, 3);
  const medicationTexts = activeMedications.map(formatMedication);
  let medicationText = cut(medicationTexts.join('; '), 50);

  const numbers = (Array.isArray(emergencyNumbers) ? emergencyNumbers : [])
    .map((number) => cleanText(number))
    .filter(Boolean);
  const numbersText = (numbers.length > 0 ? numbers : DEFAULT_EMERGENCY_NUMBERS).join(' / ');

  const optional = {
    chronic: chronic !== '',
    medications: medicationText !== '',
    note: true
  };

  const render = () => {
    // Urutan tetap sesuai kontrak: Penyakit sebelum Kontak, Obat setelahnya.
    const lines = [
      'REKAM-MEDISKU-DARURAT v1',
      `Nama: ${name}`,
      `Gol darah: ${bloodType}`,
      `Alergi: ${allergies}`
    ];
    if (optional.chronic) lines.push(`Penyakit: ${chronic}`);
    lines.push(`Kontak: ${contact}`);
    if (optional.medications) lines.push(`Obat: ${medicationText}`);
    lines.push(`Darurat: ${numbersText}`);
    if (optional.note) lines.push(NOTE_LINE);
    return lines.join('\n');
  };

  let text = render();
  let bytes = utf8Length(text);

  // 1) Buang baris opsional satu per satu sampai muat.
  if (bytes > limit && optional.chronic) {
    optional.chronic = false;
    truncated = true;
    text = render();
    bytes = utf8Length(text);
  }
  if (bytes > limit && optional.medications) {
    optional.medications = false;
    truncated = true;
    text = render();
    bytes = utf8Length(text);
  }
  if (bytes > limit && optional.note) {
    optional.note = false;
    truncated = true;
    text = render();
    bytes = utf8Length(text);
  }

  // 2) Potong alergi/kontak lebih pendek.
  const allergyShrinks = [24, 16, 8, 0];
  const contactShrinks = [20, 12, 6, 0];
  for (let i = 0; i < allergyShrinks.length && bytes > limit; i += 1) {
    const nextAllergy = cut(allergies, allergyShrinks[i]);
    if (nextAllergy !== allergies) {
      allergies = nextAllergy;
      truncated = true;
      text = render();
      bytes = utf8Length(text);
    }
    if (bytes <= limit) break;
    const nextContact = cut(contact, contactShrinks[i]);
    if (nextContact !== contact) {
      contact = nextContact;
      truncated = true;
      text = render();
      bytes = utf8Length(text);
    }
  }

  if (bytes > limit) {
    throw new QRError(
      'QR_TERLALU_PANJANG',
      `Data darurat minimum ${bytes} byte melebihi batas ${limit} byte.`
    );
  }

  return {
    text,
    truncated,
    bytes,
    fields: {
      header: 'REKAM-MEDISKU-DARURAT v1',
      name,
      bloodType,
      allergies,
      chronicConditions: optional.chronic ? chronic : '',
      contact,
      medications: optional.medications ? medicationText : '',
      medicationNames: medicationTexts,
      emergencyNumbers: numbers.length > 0 ? numbers : [...DEFAULT_EMERGENCY_NUMBERS],
      note: optional.note ? NOTE_LINE.slice('Catatan: '.length) : ''
    }
  };
}
