// Grafik SVG murni (tanpa library). Semua node dibuat lewat DOM API.
// Data pengguna tidak pernah dimasukkan sebagai string HTML.

import {
  formatAngka,
  formatAngkaRingkas,
  formatPersen,
  formatRupiah,
  formatRupiahRingkas,
} from "./format.js";

const NS = "http://www.w3.org/2000/svg";

function buat(tag, atribut = {}, teks) {
  const node = document.createElementNS(NS, tag);
  for (const [nama, nilai] of Object.entries(atribut)) {
    if (nilai !== undefined && nilai !== null) {
      node.setAttribute(nama, String(nilai));
    }
  }
  if (teks !== undefined) node.textContent = teks;
  return node;
}

function garis(svg, x1, y1, x2, y2, kelas) {
  const node = buat("line", { x1, y1, x2, y2 });
  if (kelas) node.setAttribute("class", kelas);
  svg.append(node);
  return node;
}

function teks(svg, x, y, isi, kelas, anchor = "start") {
  const node = buat(
    "text",
    { x, y, class: kelas, "text-anchor": anchor },
    isi,
  );
  svg.append(node);
  return node;
}

function labelSumbu(svg, x, y, isi, anchor = "middle", kelas = "app-sumbu-teks") {
  return teks(svg, x, y, isi, kelas, anchor);
}

function siapkanSvg(wadah, idJudul, judul, viewBox, deskripsi) {
  wadah.replaceChildren();
  const svg = buat("svg", {
    viewBox,
    preserveAspectRatio: "xMidYMid meet",
    class: "app-grafik-svg",
    role: "img",
    "aria-labelledby": idJudul,
    focusable: "false",
  });
  const title = buat("title", { id: idJudul }, judul);
  svg.append(title);
  if (deskripsi) {
    const desc = buat("desc", { id: `${idJudul}-deskripsi` }, deskripsi);
    svg.append(desc);
    svg.setAttribute("aria-describedby", `${idJudul}-deskripsi`);
  }
  wadah.append(svg);
  return svg;
}

function jepit(nilai, minimum, maksimum) {
  return Math.min(Math.max(nilai, minimum), maksimum);
}

/** Menampilkan keadaan kosong pada wadah grafik. */
export function tampilkanKosong(wadah, pesan = "Jalankan simulasi untuk melihat grafik.") {
  if (!wadah) return;
  wadah.replaceChildren();
  const p = document.createElement("p");
  p.className = "app-grafik-kosong";
  p.textContent = pesan;
  wadah.append(p);
}

/** Histogram distribusi laba. */
export function gambarHistogram(wadah, data) {
  if (!wadah) return;
  const histogram = data?.histogram;
  const ringkasan = data?.ringkasan;
  const bin = Array.isArray(histogram?.bin) ? histogram.bin : [];

  if (bin.length === 0 || !ringkasan) {
    tampilkanKosong(wadah);
    return;
  }

  const W = 720;
  const H = 280;
  const kiri = 64;
  const kanan = 14;
  const atas = 38;
  const bawah = 238;
  const lebar = W - kiri - kanan;
  const tinggi = bawah - atas;

  const totalSimulasi = Number.isFinite(data.meta?.iterasi)
    ? data.meta.iterasi
    : bin.reduce(
        (jumlah, butir) =>
          jumlah + (Number.isFinite(butir.jumlah) ? butir.jumlah : 0),
        0,
      );

  const svg = siapkanSvg(
    wadah,
    "judul-svg-histogram",
    `Histogram distribusi laba dari ${formatAngka(totalSimulasi)} simulasi`,
    `0 0 ${W} ${H}`,
    `Histogram ${bin.length} bin laba per bulan. Median ${formatRupiah(ringkasan.labaP50)}, laba minimum ${formatRupiah(ringkasan.labaMin)}, laba maksimum ${formatRupiah(ringkasan.labaMax)}.`,
  );

  const batasBawah = Number.isFinite(histogram.batasBawah)
    ? histogram.batasBawah
    : ringkasan.labaMin;
  const batasAtas = Number.isFinite(histogram.batasAtas)
    ? histogram.batasAtas
    : ringkasan.labaMax;
  const rentang = batasAtas - batasBawah || 1;
  const skalaX = (nilai) => kiri + ((nilai - batasBawah) / rentang) * lebar;

  const maksJumlah = Math.max(...bin.map((b) => b.jumlah || 0), 1);
  const skalaY = (jumlah) => bawah - (jumlah / maksJumlah) * tinggi;

  // Garis dasar + empat garis bantu horizontal dan label sumbu Y.
  garis(svg, kiri, bawah, W - kanan, bawah, "app-garis-sumbu");
  labelSumbu(svg, kiri - 8, bawah + 4, "0", "end");
  for (let i = 1; i <= 4; i += 1) {
    const nilai = (maksJumlah * i) / 4;
    const y = skalaY(nilai);
    garis(svg, kiri, y, W - kanan, y, "app-garis-grid");
    labelSumbu(svg, kiri - 8, y + 4, formatAngkaRingkas(nilai), "end");
  }

  const nolDalamRentang = batasBawah < 0 && batasAtas > 0;
  if (nolDalamRentang) {
    const xNol = skalaX(0);
    garis(svg, xNol, atas, xNol, bawah, "app-garis-nol");
  }

  const satuBin = bin.length === 1;
  const langkah = lebar / bin.length;

  bin.forEach((butir, indeks) => {
    const mulai = Number.isFinite(butir.mulai) ? butir.mulai : batasBawah;
    const akhir = Number.isFinite(butir.akhir) ? butir.akhir : batasAtas;
    const tengah = (mulai + akhir) / 2;
    const x = satuBin ? kiri : kiri + indeks * langkah + 1;
    const lebarBatang = satuBin ? lebar : Math.max(langkah - 2, 0.75);
    const y = skalaY(butir.jumlah || 0);
    const tinggiBatang = Math.max(bawah - y, 0.5);

    const batang = buat("rect", {
      x,
      y,
      width: Math.max(lebarBatang, 0.75),
      height: tinggiBatang,
      rx: 1.5,
      class: tengah < 0 ? "app-batang app-batang--rugi" : "app-batang app-batang--untung",
    });
    const tip = buat(
      "title",
      {},
      `${formatRupiah(mulai)} sampai ${formatRupiah(akhir)}: ${formatAngkaRingkas(butir.jumlah || 0)} simulasi (${formatPersen(butir.proporsi)})`,
    );
    batang.append(tip);
    svg.append(batang);

    if (satuBin) {
      labelSumbu(
        svg,
        kiri + lebar / 2,
        y - 8,
        formatRupiah(mulai),
        "middle",
        "app-label-batang",
      );
    }
  });

  // Garis median P50.
  if (Number.isFinite(ringkasan.labaP50)) {
    const xMedian = jepit(skalaX(ringkasan.labaP50), kiri, W - kanan);
    garis(svg, xMedian, atas, xMedian, bawah, "app-garis-median");
    const anchor = xMedian < kiri + 80
      ? "start"
      : xMedian > W - kanan - 80
        ? "end"
        : "middle";
    labelSumbu(
      svg,
      xMedian,
      atas - 10,
      `P50 ${formatRupiahRingkas(ringkasan.labaP50)}`,
      anchor,
      "app-teks-median",
    );
  }

  // Label sumbu X.
  if (satuBin) {
    labelSumbu(svg, kiri + lebar / 2, bawah + 18, "Semua simulasi");
  } else {
    labelSumbu(svg, kiri, bawah + 18, formatRupiahRingkas(batasBawah), "start");
    labelSumbu(svg, W - kanan, bawah + 18, formatRupiahRingkas(batasAtas), "end");
    if (nolDalamRentang) {
      const xNol = jepit(skalaX(0), kiri + 16, W - kanan - 16);
      labelSumbu(svg, xNol, bawah + 18, "Rp0", "middle");
    }
  }

  labelSumbu(svg, kiri + lebar / 2, H - 6, "Laba per bulan");

  // Legenda rugi/untung.
  const lx = W - kanan - 158;
  const ly = 14;
  const kotakRugi = buat("rect", {
    x: lx,
    y: ly,
    width: 10,
    height: 10,
    rx: 2,
    class: "app-legenda-kotak app-legenda-kotak--rugi",
  });
  svg.append(kotakRugi);
  labelSumbu(svg, lx + 15, ly + 9, "Rugi", "start", "app-legenda-teks");
  const kotakUntung = buat("rect", {
    x: lx + 64,
    y: ly,
    width: 10,
    height: 10,
    rx: 2,
    class: "app-legenda-kotak app-legenda-kotak--untung",
  });
  svg.append(kotakUntung);
  labelSumbu(svg, lx + 79, ly + 9, "Untung", "start", "app-legenda-teks");
}

/** Diagram tornado sensitivitas (P10–P90). */
export function gambarTornado(wadah, sensitivitas) {
  if (!wadah) return;
  const daftar = Array.isArray(sensitivitas) ? sensitivitas.filter(Boolean) : [];
  if (daftar.length === 0) {
    tampilkanKosong(wadah);
    return;
  }

  const W = 720;
  const H = 280;
  const kiri = 132;
  const kanan = 706;
  const atas = 34;
  const bawah = 244;

  const svg = siapkanSvg(
    wadah,
    "judul-svg-tornado",
    "Diagram tornado: variabel yang paling memengaruhi laba",
    `0 0 ${W} ${H}`,
    "Diagram tornado empat variabel usaha. Batang kiri menunjukkan laba pada kondisi rendah (P10), batang kanan pada kondisi tinggi (P90); variabel teratas paling besar pengaruhnya.",
  );

  const urut = [...daftar]
    .sort((a, b) => (b.dampak || 0) - (a.dampak || 0))
    .slice(0, 4);

  const nilaiSemua = [0];
  for (const item of urut) {
    if (Number.isFinite(item.labaRendah)) nilaiSemua.push(item.labaRendah);
    if (Number.isFinite(item.labaTinggi)) nilaiSemua.push(item.labaTinggi);
  }
  const maxAbs = Math.max(...nilaiSemua.map((nilai) => Math.abs(nilai)), 1);

  const tengah = (kiri + kanan) / 2;
  const setengah = (kanan - kiri) / 2;
  const skalaX = (nilai) => tengah + (nilai / maxAbs) * setengah;

  const tinggiBaris = (bawah - atas) / urut.length;
  const tinggiBatang = Math.min(22, tinggiBaris * 0.44);

  // Garis nol vertikal di tengah area batang.
  garis(svg, tengah, atas - 4, tengah, bawah + 2, "app-garis-nol app-garis-nol--tornado");
  labelSumbu(svg, tengah, bawah + 18, "Rp0", "middle", "app-sumbu-teks");

  urut.forEach((item, indeks) => {
    const yTengah = atas + tinggiBaris * (indeks + 0.5);
    const yBatang = yTengah - tinggiBatang / 2;

    garis(
      svg,
      kiri,
      yTengah + tinggiBaris / 2,
      kanan,
      yTengah + tinggiBaris / 2,
      "app-garis-pemisah",
    );

    const rendah = Number.isFinite(item.labaRendah) ? item.labaRendah : 0;
    const tinggi = Number.isFinite(item.labaTinggi) ? item.labaTinggi : 0;
    const bawahNilai = Math.min(rendah, tinggi);
    const atasNilai = Math.max(rendah, tinggi);

    if (bawahNilai < 0) {
      const x1 = skalaX(bawahNilai);
      const x2 = skalaX(Math.min(atasNilai, 0));
      const batang = buat("rect", {
        x: Math.min(x1, x2),
        y: yBatang,
        width: Math.max(Math.abs(x2 - x1), 1),
        height: tinggiBatang,
        rx: 3,
        class: "app-batang app-batang--rugi",
      });
      batang.append(
        buat(
          "title",
          {},
          `${item.label || item.kunci}: ${formatRupiah(rendah)} sampai ${formatRupiah(tinggi)}`,
        ),
      );
      svg.append(batang);
    }

    if (atasNilai > 0) {
      const x1 = skalaX(Math.max(bawahNilai, 0));
      const x2 = skalaX(atasNilai);
      const batang = buat("rect", {
        x: Math.min(x1, x2),
        y: yBatang,
        width: Math.max(Math.abs(x2 - x1), 1),
        height: tinggiBatang,
        rx: 3,
        class: "app-batang app-batang--untung",
      });
      batang.append(
        buat(
          "title",
          {},
          `${item.label || item.kunci}: ${formatRupiah(rendah)} sampai ${formatRupiah(tinggi)}`,
        ),
      );
      svg.append(batang);
    }

    teks(
      svg,
      kiri - 12,
      yTengah + 4,
      item.label || item.kunci || "Variabel",
      "app-tornado-label",
      "end",
    );

    const xRendah = jepit(skalaX(rendah), kiri, kanan);
    const xTinggi = jepit(skalaX(tinggi), kiri, kanan);

    teks(
      svg,
      xRendah - 5,
      yTengah + 4,
      formatRupiahRingkas(rendah),
      "app-tornado-nilai",
      "end",
    );
    teks(
      svg,
      xTinggi + 5,
      yTengah + 4,
      formatRupiahRingkas(tinggi),
      "app-tornado-nilai",
      "start",
    );
  });

  labelSumbu(svg, kiri, H - 6, "Laba lebih rendah (P10)", "start");
  labelSumbu(svg, kanan, H - 6, "Laba lebih tinggi (P90)", "end");
}

/**
 * Grafik sapuan harga.
 * @param {HTMLElement} wadah
 * @param {object} harga objek data.harga
 * @param {{hargaImpas?:number}} konteks
 */
export function gambarHarga(wadah, harga, konteks = {}) {
  if (!wadah) return;
  const sapuan = Array.isArray(harga?.sapuan) ? harga.sapuan : [];
  const titikValid = sapuan.filter(
    (butir) =>
      Number.isFinite(butir?.harga) && Number.isFinite(butir?.labaRataRata),
  );
  if (titikValid.length < 2) {
    tampilkanKosong(wadah);
    return;
  }

  const W = 720;
  const H = 300;
  const kiri = 64;
  const kanan = 16;
  const atas = 36;
  const bawah = 238;
  const lebar = W - kiri - kanan;
  const tinggi = bawah - atas;

  const svg = siapkanSvg(
    wadah,
    "judul-svg-harga",
    "Pencari harga jual: laba rata-rata dan risiko pada setiap harga",
    `0 0 ${W} ${H}`,
    "Grafik garis laba rata-rata per bulan pada setiap titik harga jual, dengan penanda harga laba terbaik, harga risiko terendah, dan harga impas bila tersedia.",
  );

  const hargaMin = Math.min(...titikValid.map((titik) => titik.harga));
  const hargaMax = Math.max(...titikValid.map((titik) => titik.harga));
  const labaMin = Math.min(0, ...titikValid.map((titik) => titik.labaRataRata));
  const labaMax = Math.max(0, ...titikValid.map((titik) => titik.labaRataRata));
  const selisihHarga = hargaMax - hargaMin || 1;
  const selisihLaba = labaMax - labaMin || 1;

  const skalaX = (nilai) => kiri + ((nilai - hargaMin) / selisihHarga) * lebar;
  const skalaY = (nilai) => bawah - ((nilai - labaMin) / selisihLaba) * tinggi;

  // Garis bantu horizontal.
  for (let i = 0; i <= 4; i += 1) {
    const nilai = labaMin + (selisihLaba * i) / 4;
    const y = skalaY(nilai);
    garis(
      svg,
      kiri,
      y,
      W - kanan,
      y,
      i === 0 ? "app-garis-sumbu" : "app-garis-grid",
    );
    labelSumbu(svg, kiri - 8, y + 4, formatRupiahRingkas(nilai), "end");
  }

  if (labaMin < 0 && labaMax > 0) {
    const yNol = skalaY(0);
    garis(svg, kiri, yNol, W - kanan, yNol, "app-garis-nol");
  }

  const titik = titikValid.map((butir) => ({
    ...butir,
    x: skalaX(butir.harga),
    y: skalaY(butir.labaRataRata),
  }));

  // Area di bawah garis.
  const pathArea = [
    `M ${titik[0].x} ${bawah}`,
    ...titik.map((butir) => `L ${butir.x} ${butir.y}`),
    `L ${titik[titik.length - 1].x} ${bawah}`,
    "Z",
  ].join(" ");
  svg.append(buat("path", { d: pathArea, class: "app-harga-luas" }));

  // Garis laba rata-rata.
  const pathGaris = titik
    .map((butir, indeks) => `${indeks === 0 ? "M" : "L"} ${butir.x} ${butir.y}`)
    .join(" ");
  svg.append(buat("path", { d: pathGaris, class: "app-harga-garis" }));

  for (const butir of titik) {
    const bulatan = buat("circle", {
      cx: butir.x,
      cy: butir.y,
      r: 2.4,
      class: "app-harga-titik",
    });
    bulatan.append(
      buat(
        "title",
        {},
        `${formatRupiah(butir.harga)}: laba rata-rata ${formatRupiah(butir.labaRataRata)}, peluang rugi ${formatPersen(butir.peluangRugi)}`,
      ),
    );
    svg.append(bulatan);
  }

  // Garis harga impas bila tersedia.
  if (Number.isFinite(konteks.hargaImpas) && konteks.hargaImpas > 0) {
    const xImpas = skalaX(konteks.hargaImpas);
    if (xImpas >= kiri - 1 && xImpas <= W - kanan + 1) {
      garis(svg, xImpas, atas, xImpas, bawah, "app-garis-impas");
      teks(
        svg,
        jepit(xImpas + 4, kiri, W - kanan - 4),
        atas + 12,
        "Harga impas",
        "app-label-impas",
        xImpas > W - kanan - 100 ? "end" : "start",
      );
    }
  }

  const terbaik = harga?.terbaik;
  const teraman = harga?.teraman;

  const posisiTerbaik =
    terbaik &&
    Number.isFinite(terbaik.harga) &&
    Number.isFinite(terbaik.labaRataRata)
      ? { x: skalaX(terbaik.harga), y: skalaY(terbaik.labaRataRata), data: terbaik }
      : null;
  const posisiTeraman =
    teraman &&
    Number.isFinite(teraman.harga) &&
    Number.isFinite(teraman.labaRataRata)
      ? { x: skalaX(teraman.harga), y: skalaY(teraman.labaRataRata), data: teraman }
      : null;

  const hargaSama =
    posisiTerbaik &&
    posisiTeraman &&
    Math.abs(posisiTerbaik.data.harga - posisiTeraman.data.harga) < 1;

  function labelTitik(posisi, isi, kelas, arah) {
    if (!posisi) return;
    let anchor = "middle";
    let x = posisi.x;
    if (posisi.x > W - kanan - 96) {
      anchor = "end";
      x = posisi.x - 7;
    } else if (posisi.x < kiri + 96) {
      anchor = "start";
      x = posisi.x + 7;
    }
    const y = jepit(posisi.y + arah, atas + 12, bawah - 4);
    teks(svg, x, y, isi, kelas, anchor);
  }

  if (posisiTerbaik) {
    svg.append(
      buat("circle", {
        cx: posisiTerbaik.x,
        cy: posisiTerbaik.y,
        r: 6.5,
        class: "app-titik-terbaik",
      }),
    );
  }
  if (posisiTeraman) {
    svg.append(
      buat("circle", {
        cx: posisiTeraman.x,
        cy: posisiTeraman.y,
        r: hargaSama ? 9.5 : 6.5,
        class: "app-titik-teraman",
      }),
    );
  }

  if (hargaSama && posisiTerbaik) {
    labelTitik(
      posisiTerbaik,
      `Terbaik & teraman ${formatRupiah(posisiTerbaik.data.harga)}`,
      "app-label-titik app-label-titik--terbaik",
      -13,
    );
  } else {
    if (posisiTerbaik) {
      labelTitik(
        posisiTerbaik,
        `Terbaik ${formatRupiah(posisiTerbaik.data.harga)}`,
        "app-label-titik app-label-titik--terbaik",
        -13,
      );
    }
    if (posisiTeraman) {
      labelTitik(
        posisiTeraman,
        `Teraman ${formatRupiah(posisiTeraman.data.harga)}`,
        "app-label-titik app-label-titik--teraman",
        22,
      );
    }
  }

  // Label sumbu X (5 titik).
  for (let i = 0; i <= 4; i += 1) {
    const nilai = hargaMin + (selisihHarga * i) / 4;
    const x = skalaX(nilai);
    const anchor = i === 0 ? "start" : i === 4 ? "end" : "middle";
    labelSumbu(svg, x, bawah + 18, formatRupiahRingkas(nilai), anchor);
  }
  labelSumbu(svg, kiri + lebar / 2, H - 6, "Harga jual");

  const labelY = teks(
    svg,
    -((atas + bawah) / 2),
    16,
    "Laba rata-rata",
    "app-sumbu-judul",
    "middle",
  );
  labelY.setAttribute("transform", `rotate(-90)`);
}
