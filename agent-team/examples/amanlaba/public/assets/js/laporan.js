/* AmanLaba — halaman laporan.
   Membaca skenario tersimpan, memanggil POST /api/simulasi, lalu merender
   metadata, metrik, tabel asumsi, tiga grafik SVG, rekomendasi, kesimpulan,
   dan perilaku cetak. Tanpa dependency dan tanpa request eksternal. */

const KUNCI_PENYIMPANAN = "amanlaba:skenario:v1";
const NS_SVG = "http://www.w3.org/2000/svg";
const PESAN_TIDAK_DITEMUKAN =
  "Skenario tidak ditemukan. Kembali ke aplikasi untuk memilih skenario.";
const PESAN_API_GAGAL =
  "Gagal menghitung laporan. Periksa koneksi ke server lalu muat ulang halaman.";

const parameter = new URLSearchParams(window.location.search);
const idSkenario = (parameter.get("id") || "").trim();
const cetakDiminta = parameter.get("cetak") === "1";

const pemformatRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const pemformatDesimal = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const pemformatAngka = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 1,
});
const pemformatAngkaBulat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});
const pemformatTanggal = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
});

let sudahMencetakOtomatis = false;
let pewaktuCetak = 0;

/* -------------------------------------------------------------------------
   Titik masuk
   ------------------------------------------------------------------------- */

mulai();

async function mulai() {
  const konten = document.getElementById("konten-utama");
  const tombolCetak = document.getElementById("tombol-cetak");
  const tombolMuatUlang = document.getElementById("tombol-muat-ulang");

  if (tombolCetak) {
    tombolCetak.disabled = true;
    tombolCetak.addEventListener("click", () => window.print());
  }
  if (tombolMuatUlang) {
    tombolMuatUlang.addEventListener("click", () => window.location.reload());
  }
  if (konten) konten.setAttribute("aria-busy", "true");

  tampilkanMuatan();

  if (!idSkenario) {
    tampilkanGalat(PESAN_TIDAK_DITEMUKAN, "Tautan laporan tidak menyertakan parameter id.");
    return;
  }

  const bacaan = bacaDaftarTersimpan();
  if (!bacaan.ok) {
    tampilkanGalat(PESAN_TIDAK_DITEMUKAN, bacaan.alasan);
    return;
  }

  const entri = bacaan.daftar.find(
    (item) => item && typeof item === "object" && item.id === idSkenario
  );

  if (!entri) {
    tampilkanGalat(
      PESAN_TIDAK_DITEMUKAN,
      "Skenario dengan id tersebut tidak ada di penyimpanan browser ini."
    );
    return;
  }

  if (!skenarioSah(entri.skenario)) {
    tampilkanGalat(
      PESAN_TIDAK_DITEMUKAN,
      "Data skenario tersimpan rusak atau tidak lengkap."
    );
    return;
  }

  let data;
  try {
    data = await panggilSimulasi(entri);
  } catch (kesalahan) {
    tampilkanGalat(PESAN_API_GAGAL, pesanKesalahan(kesalahan));
    return;
  }

  try {
    renderLaporan(data, entri);
  } catch (kesalahan) {
    tampilkanGalat(
      "Laporan tidak dapat disusun dari data yang diterima.",
      pesanKesalahan(kesalahan)
    );
    return;
  }

  if (konten) konten.setAttribute("aria-busy", "false");
  if (tombolCetak) tombolCetak.disabled = false;

  jadwalkanCetakOtomatis();
}

/* -------------------------------------------------------------------------
   Status halaman
   ------------------------------------------------------------------------- */

function tampilkanMuatan() {
  const muatan = document.getElementById("laporan-muatan");
  const laporan = document.getElementById("laporan");
  const galat = document.getElementById("laporan-galat");

  if (muatan) muatan.hidden = false;
  if (laporan) laporan.hidden = true;
  if (galat) galat.hidden = true;
}

function tampilkanGalat(pesan, detail) {
  const muatan = document.getElementById("laporan-muatan");
  const laporan = document.getElementById("laporan");
  const galat = document.getElementById("laporan-galat");
  const teksPesan = document.getElementById("laporan-galat-pesan");
  const teksDetail = document.getElementById("laporan-galat-detail");
  const tombolCetak = document.getElementById("tombol-cetak");
  const konten = document.getElementById("konten-utama");

  if (muatan) muatan.hidden = true;
  if (laporan) laporan.hidden = true;
  if (galat) galat.hidden = false;
  if (teksPesan) teksPesan.textContent = pesan;
  if (teksDetail) {
    if (detail) {
      teksDetail.textContent = detail;
      teksDetail.hidden = false;
    } else {
      teksDetail.textContent = "";
      teksDetail.hidden = true;
    }
  }
  if (tombolCetak) tombolCetak.disabled = true;
  if (konten) konten.setAttribute("aria-busy", "false");

  if (galat) {
    const judulGalat = galat.querySelector(".laporan-galat__judul");
    if (judulGalat) {
      judulGalat.tabIndex = -1;
      judulGalat.focus({ preventScroll: true });
    }
  }
}

/* -------------------------------------------------------------------------
   Pembacaan localStorage (tanpa menulis)
   ------------------------------------------------------------------------- */

function bacaDaftarTersimpan() {
  let mentah;
  try {
    mentah = window.localStorage.getItem(KUNCI_PENYIMPANAN);
  } catch {
    return {
      ok: false,
      alasan: "Penyimpanan lokal browser tidak dapat diakses.",
    };
  }

  if (mentah === null) {
    return { ok: true, daftar: [] };
  }

  let data;
  try {
    data = JSON.parse(mentah);
  } catch {
    return {
      ok: false,
      alasan: "Isi penyimpanan skenario bukan JSON yang valid.",
    };
  }

  if (!Array.isArray(data)) {
    return {
      ok: false,
      alasan: "Isi penyimpanan skenario bukan daftar yang valid.",
    };
  }

  return { ok: true, daftar: data };
}

function skenarioSah(skenario) {
  if (!skenario || typeof skenario !== "object") return false;

  const distribusi = ["hargaJual", "biayaTetap", "biayaVariabel", "permintaan"];
  for (const nama of distribusi) {
    const nilai = skenario[nama];
    if (!nilai || typeof nilai !== "object") return false;
    for (const field of ["min", "mode", "max"]) {
      if (typeof nilai[field] !== "number" || !Number.isFinite(nilai[field])) {
        return false;
      }
    }
    if (nilai.min > nilai.mode || nilai.mode > nilai.max) return false;
    if (nilai.min < 0) return false;
    if (nama === "hargaJual" && nilai.min <= 0) return false;
  }

  return true;
}

function skenarioUntukApi(skenario) {
  const ambil = (distribusi) => ({
    min: distribusi.min,
    mode: distribusi.mode,
    max: distribusi.max,
  });

  return {
    nama:
      typeof skenario.nama === "string" && skenario.nama.trim()
        ? skenario.nama.trim()
        : "Skenario Tanpa Nama",
    mataUang: "IDR",
    hargaJual: ambil(skenario.hargaJual),
    biayaTetap: ambil(skenario.biayaTetap),
    biayaVariabel: ambil(skenario.biayaVariabel),
    permintaan: ambil(skenario.permintaan),
  };
}

function opsiUntukApi(opsi) {
  if (!opsi || typeof opsi !== "object") return null;

  const hasil = {};

  if (Number.isInteger(opsi.iterasi) && opsi.iterasi >= 1000 && opsi.iterasi <= 50000) {
    hasil.iterasi = opsi.iterasi;
  } else if (Number.isFinite(opsi.iterasi)) {
    hasil.iterasi = Math.round(opsi.iterasi);
  }

  if (Number.isInteger(opsi.seed) && opsi.seed >= 0) {
    hasil.seed = opsi.seed;
  } else if (Number.isFinite(opsi.seed)) {
    hasil.seed = Math.round(opsi.seed);
  }

  const sapuan = opsi.sapuanHarga;
  if (
    sapuan &&
    typeof sapuan === "object" &&
    Number.isFinite(sapuan.min) &&
    Number.isFinite(sapuan.max) &&
    Number.isFinite(sapuan.langkah)
  ) {
    hasil.sapuanHarga = {
      min: sapuan.min,
      max: sapuan.max,
      langkah: Math.round(sapuan.langkah),
    };
  }

  return Object.keys(hasil).length > 0 ? hasil : null;
}

/* -------------------------------------------------------------------------
   Pemanggilan API
   ------------------------------------------------------------------------- */

async function panggilSimulasi(entri) {
  const badan = { skenario: skenarioUntukApi(entri.skenario) };
  const opsi = opsiUntukApi(entri.opsi);
  if (opsi) badan.opsi = opsi;

  const pengendali = new AbortController();
  const pewaktu = window.setTimeout(() => pengendali.abort(), 30000);

  let respons;
  try {
    respons = await fetch("/api/simulasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(badan),
      signal: pengendali.signal,
      credentials: "same-origin",
    });
  } catch (kesalahan) {
    if (kesalahan && kesalahan.name === "AbortError") {
      throw new Error("Server tidak merespons dalam 30 detik.");
    }
    throw new Error("Tidak dapat menghubungi server simulasi. Pastikan server sedang berjalan.");
  } finally {
    window.clearTimeout(pewaktu);
  }

  let isi = null;
  try {
    isi = await respons.json();
  } catch {
    if (!respons.ok) {
      throw new Error(`Server membalas dengan status ${respons.status}.`);
    }
    throw new Error("Respons server bukan JSON yang valid.");
  }

  if (!respons.ok) {
    const pesanServer =
      isi && isi.error && typeof isi.error.pesan === "string"
        ? isi.error.pesan
        : `Server membalas dengan status ${respons.status}.`;
    throw new Error(pesanServer);
  }

  if (!isi || !isi.data || typeof isi.data !== "object") {
    throw new Error("Respons server tidak berisi data simulasi.");
  }

  return isi.data;
}

function pesanKesalahan(kesalahan) {
  if (kesalahan && typeof kesalahan.message === "string" && kesalahan.message) {
    return kesalahan.message;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

/* -------------------------------------------------------------------------
   Render laporan
   ------------------------------------------------------------------------- */

function renderLaporan(data, entri) {
  if (!data || typeof data !== "object") {
    throw new Error("Data simulasi kosong.");
  }

  const meta = data.meta && typeof data.meta === "object" ? data.meta : {};
  const ringkasan =
    data.ringkasan && typeof data.ringkasan === "object" ? data.ringkasan : {};

  const laporan = document.getElementById("laporan");
  const muatan = document.getElementById("laporan-muatan");
  const galat = document.getElementById("laporan-galat");

  const namaSkenario =
    (typeof entri.nama === "string" && entri.nama.trim()) ||
    (entri.skenario && typeof entri.skenario.nama === "string" && entri.skenario.nama.trim()) ||
    "Skenario Tanpa Nama";

  const tanggalCetak = pemformatTanggal.format(new Date());

  setTeks("laporan-nama", namaSkenario);
  setTeks("laporan-tanggal", tanggalCetak);
  setTeks("laporan-seed", formatAngka(meta.seed));
  setTeks(
    "laporan-iterasi",
    Number.isFinite(meta.iterasi)
      ? `${pemformatAngkaBulat.format(meta.iterasi)} iterasi`
      : "—"
  );
  setTeks("laporan-versi", meta.versiMesin ? String(meta.versiMesin) : "—");
  setTeks("laporan-tanggal-kaki", `Dicetak ${tanggalCetak}`);

  setTeks("laporan-peluang-rugi", formatPersen(ringkasan.peluangRugi));
  setTeks("laporan-peluang-untung", formatPersen(ringkasan.peluangUntung));
  setTeks("laporan-p5", formatRupiah(ringkasan.labaP5));
  setTeks("laporan-p50", formatRupiah(ringkasan.labaP50));
  setTeks("laporan-p95", formatRupiah(ringkasan.labaP95));

  isiTitikImpas(data.titikImpas);
  isiTabelAsumsi(entri.skenario);
  isiRekomendasi(data.harga);
  isiKesimpulan(data, entri.skenario);

  const wadahHistogram = document.getElementById("laporan-histogram");
  if (wadahHistogram) renderHistogram(wadahHistogram, data);

  const wadahTornado = document.getElementById("laporan-tornado");
  if (wadahTornado) renderTornado(wadahTornado, data);

  const wadahHarga = document.getElementById("laporan-harga");
  if (wadahHarga) renderHarga(wadahHarga, data, entri.skenario);

  if (muatan) muatan.hidden = true;
  if (galat) galat.hidden = true;
  if (laporan) laporan.hidden = false;
}

function setTeks(id, teks) {
  const elemen = document.getElementById(id);
  if (elemen) elemen.textContent = teks;
}

function isiTitikImpas(titikImpas) {
  const nilai = document.getElementById("laporan-impas");
  const keterangan = document.getElementById("laporan-impas-ket");

  if (!titikImpas || titikImpas.valid !== true) {
    if (nilai) nilai.textContent = "Tidak valid";
    if (keterangan) {
      keterangan.textContent =
        (titikImpas && typeof titikImpas.catatan === "string" && titikImpas.catatan) ||
        "Harga jual harus lebih besar dari biaya variabel per unit.";
    }
    return;
  }

  if (nilai) {
    nilai.textContent = Number.isFinite(titikImpas.unit)
      ? `${pemformatAngkaBulat.format(titikImpas.unit)} unit`
      : "—";
  }
  if (keterangan) {
    keterangan.textContent = Number.isFinite(titikImpas.pendapatan)
      ? `Pendapatan impas ${formatRupiah(titikImpas.pendapatan)}`
      : "Unit yang harus terjual agar laba tidak negatif.";
  }
}

function isiTabelAsumsi(skenario) {
  const tabel = document.getElementById("laporan-asumsi");
  if (!tabel) return;
  const tbody = tabel.querySelector("tbody");
  if (!tbody) return;

  const baris = [
    { label: "Harga Jual", kunci: "hargaJual", format: formatRupiah },
    {
      label: "Biaya Tetap (per bulan)",
      kunci: "biayaTetap",
      format: formatRupiah,
    },
    {
      label: "Biaya Variabel (per unit)",
      kunci: "biayaVariabel",
      format: formatRupiah,
    },
    {
      label: "Permintaan (unit, pada harga mode)",
      kunci: "permintaan",
      format: formatUnit,
    },
  ];

  tbody.replaceChildren();

  for (const item of baris) {
    const distribusi = skenario[item.kunci] || {};
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = item.label;
    tr.appendChild(th);

    for (const field of ["min", "mode", "max"]) {
      const td = document.createElement("td");
      td.className = "angka";
      td.textContent = item.format(distribusi[field]);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
}

function isiRekomendasi(harga) {
  const terbaik = harga && harga.terbaik ? harga.terbaik : null;
  const teraman = harga && harga.teraman ? harga.teraman : null;

  isiSatuRekomendasi("terbaik", terbaik);
  isiSatuRekomendasi("teraman", teraman);
}

function isiSatuRekomendasi(awalan, item) {
  setTeks(`laporan-${awalan}-harga`, item ? formatRupiah(item.harga) : "Tidak tersedia");
  setTeks(
    `laporan-${awalan}-rugi`,
    item ? formatPersen(item.peluangRugi) : "—"
  );
  setTeks(
    `laporan-${awalan}-alasan`,
    item && typeof item.alasan === "string" && item.alasan
      ? item.alasan
      : "Rekomendasi tidak tersedia pada hasil ini."
  );
}

function isiKesimpulan(data, skenario) {
  const ringkasan = data.ringkasan || {};
  const hargaMode = skenario && skenario.hargaJual ? skenario.hargaJual.mode : null;
  const teraman = data.harga && data.harga.teraman ? data.harga.teraman : null;

  const kalimat = [];

  if (Number.isFinite(hargaMode) && Number.isFinite(ringkasan.peluangRugi)) {
    kalimat.push(
      `Dengan harga ${formatRupiah(hargaMode)}, peluang rugi ${formatPersen(
        ringkasan.peluangRugi
      )} dan laba tengah ${formatRupiah(ringkasan.labaP50)} per bulan.`
    );
  } else {
    kalimat.push(
      `Peluang rugi pada simulasi ini ${formatPersen(ringkasan.peluangRugi)} dengan laba tengah ${formatRupiah(
        ringkasan.labaP50
      )}.`
    );
  }

  if (teraman && Number.isFinite(teraman.harga) && Number.isFinite(teraman.peluangRugi)) {
    kalimat.push(
      `Harga ${formatRupiah(teraman.harga)} memiliki peluang rugi terendah, yaitu ${formatPersen(
        teraman.peluangRugi
      )}.`
    );
  } else if (data.titikImpas && data.titikImpas.valid === true) {
    kalimat.push(
      `Titik impas berada pada ${pemformatAngkaBulat.format(data.titikImpas.unit)} unit atau ${formatRupiah(
        data.titikImpas.pendapatan
      )}.`
    );
  } else {
    kalimat.push(
      "Periksa kembali asumsi biaya dan permintaan sebelum mengambil keputusan."
    );
  }

  setTeks("laporan-kesimpulan", kalimat.join(" "));
}

/* -------------------------------------------------------------------------
   Format angka
   ------------------------------------------------------------------------- */

function formatRupiah(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai)
    ? pemformatRupiah.format(nilai)
    : "—";
}

function formatPersen(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai)
    ? `${pemformatDesimal.format(nilai * 100)}%`
    : "—";
}

function formatAngka(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai)
    ? pemformatAngkaBulat.format(nilai)
    : "—";
}

function formatUnit(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai)
    ? pemformatAngka.format(nilai)
    : "—";
}

function angkaRingkas(nilai) {
  if (typeof nilai !== "number" || !Number.isFinite(nilai)) return "—";
  const tanda = nilai < 0 ? "-" : "";
  const absolut = Math.abs(nilai);

  if (absolut >= 1e12) return `${tanda}${pemformatAngka.format(absolut / 1e12)} T`;
  if (absolut >= 1e9) return `${tanda}${pemformatAngka.format(absolut / 1e9)} M`;
  if (absolut >= 1e6) return `${tanda}${pemformatAngka.format(absolut / 1e6)} jt`;
  if (absolut >= 1e3) return `${tanda}${pemformatAngka.format(absolut / 1e3)} rb`;
  return `${tanda}${pemformatAngkaBulat.format(absolut)}`;
}

function rupiahRingkas(nilai) {
  if (typeof nilai !== "number" || !Number.isFinite(nilai)) return "—";
  const tanda = nilai < 0 ? "-" : "";
  const absolut = Math.abs(nilai);

  if (absolut >= 1e12) return `${tanda}Rp${pemformatAngka.format(absolut / 1e12)} T`;
  if (absolut >= 1e9) return `${tanda}Rp${pemformatAngka.format(absolut / 1e9)} M`;
  if (absolut >= 1e6) return `${tanda}Rp${pemformatAngka.format(absolut / 1e6)} jt`;
  if (absolut >= 1e3) return `${tanda}Rp${pemformatAngka.format(absolut / 1e3)} rb`;
  return `${tanda}Rp${pemformatAngkaBulat.format(absolut)}`;
}

/* -------------------------------------------------------------------------
   Utilitas SVG
   ------------------------------------------------------------------------- */

function buatSvg(viewBox, judul) {
  const svg = document.createElementNS(NS_SVG, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  const title = document.createElementNS(NS_SVG, "title");
  title.textContent = judul;
  svg.appendChild(title);
  return svg;
}

function tambah(induk, tag, atribut = {}) {
  const node = document.createElementNS(NS_SVG, tag);
  for (const [nama, nilai] of Object.entries(atribut)) {
    if (nilai !== undefined && nilai !== null) {
      node.setAttribute(nama, String(nilai));
    }
  }
  induk.appendChild(node);
  return node;
}

function tambahTeks(induk, x, y, isi, kelas, atribut = {}) {
  const node = tambah(induk, "text", {
    x,
    y,
    class: kelas,
    ...atribut,
  });
  node.textContent = isi;
  return node;
}

function kosongkanGrafik(wadah, pesan = "Jalankan simulasi untuk melihat grafik.") {
  wadah.replaceChildren();
  const p = document.createElement("p");
  p.className = "laporan-grafik-kosong";
  p.textContent = pesan;
  wadah.appendChild(p);
}

function bilangan(nilai) {
  return typeof nilai === "number" && Number.isFinite(nilai) ? nilai : 0;
}

function dampakBaris(baris) {
  if (baris && typeof baris.dampak === "number" && Number.isFinite(baris.dampak)) {
    return Math.abs(baris.dampak);
  }
  if (baris && typeof baris.delta === "number" && Number.isFinite(baris.delta)) {
    return Math.abs(baris.delta);
  }
  return Math.abs(bilangan(baris && baris.labaTinggi) - bilangan(baris && baris.labaRendah));
}

/* -------------------------------------------------------------------------
   Grafik 1 — histogram laba (viewBox 720 × 280)
   ------------------------------------------------------------------------- */

function renderHistogram(wadah, data) {
  const histogram = data && data.histogram ? data.histogram : null;
  const bin = histogram && Array.isArray(histogram.bin) ? histogram.bin : null;

  if (!bin || bin.length === 0) {
    kosongkanGrafik(wadah);
    return;
  }

  const ringkasan = data.ringkasan || {};
  const meta = data.meta || {};
  const iterasi = Number.isFinite(meta.iterasi) ? meta.iterasi : null;

  const batasBawah = Number.isFinite(histogram.batasBawah)
    ? histogram.batasBawah
    : Math.min(...bin.map((b) => bilangan(b.mulai)));
  const batasAtas = Number.isFinite(histogram.batasAtas)
    ? histogram.batasAtas
    : Math.max(...bin.map((b) => bilangan(b.akhir)));

  const jumlahMaks = Math.max(1, ...bin.map((b) => bilangan(b.jumlah)));

  const LEBAR = 720;
  const TINGGI = 280;
  const kiri = 64;
  const kanan = 16;
  const atas = 30;
  const bawah = 46;
  const lebarPlot = LEBAR - kiri - kanan;
  const tinggiPlot = TINGGI - atas - bawah;
  const dasar = atas + tinggiPlot;
  const skalaX = (nilai) =>
    kiri +
    ((nilai - batasBawah) / (batasAtas - batasBawah || 1)) * lebarPlot;

  wadah.replaceChildren();

  const judul = iterasi
    ? `Histogram distribusi laba dari ${pemformatAngkaBulat.format(iterasi)} simulasi`
    : "Histogram distribusi laba";
  const svg = buatSvg(`0 0 ${LEBAR} ${TINGGI}`, judul);

  /* 4 garis bantu horizontal + label sumbu Y. */
  for (let i = 1; i <= 4; i += 1) {
    const y = dasar - (tinggiPlot * i) / 4;
    const nilai = (jumlahMaks * i) / 4;
    tambah(svg, "line", {
      x1: kiri,
      y1: y,
      x2: kiri + lebarPlot,
      y2: y,
      class: "graf-grid",
    });
    tambahTeks(svg, kiri - 10, y + 4, angkaRingkas(Math.round(nilai)), "graf-teks-kecil", {
      "text-anchor": "end",
    });
  }

  tambahTeks(svg, kiri, 13, "Jumlah simulasi", "graf-teks-kecil");

  tambah(svg, "line", {
    x1: kiri,
    y1: dasar,
    x2: kiri + lebarPlot,
    y2: dasar,
    class: "graf-sumbu",
  });

  /* Batang. */
  const lebarBatang = lebarPlot / bin.length;
  const celah = Math.min(2, lebarBatang * 0.2);

  bin.forEach((b, indeks) => {
    const jumlah = bilangan(b.jumlah);
    if (jumlah <= 0) return;
    const tinggi = Math.max((jumlah / jumlahMaks) * tinggiPlot, 1.5);
    const x = kiri + indeks * lebarBatang + celah / 2;
    const y = dasar - tinggi;
    const mulai = bilangan(b.mulai);

    tambah(svg, "rect", {
      x,
      y,
      width: Math.max(lebarBatang - celah, 0.5),
      height: tinggi,
      rx: 1.2,
      class: mulai < 0 ? "graf-rugi" : "graf-untung",
    });
  });

  /* Kasus satu bin: seluruh laba sama. */
  if (bin.length === 1) {
    const b = bin[0];
    const nilaiTengah =
      bilangan(b.mulai) === bilangan(b.akhir)
        ? bilangan(b.mulai)
        : (bilangan(b.mulai) + bilangan(b.akhir)) / 2;
    tambahTeks(svg, kiri + lebarPlot / 2, atas + 16, formatRupiah(nilaiTengah), "graf-teks-kuat", {
      "text-anchor": "middle",
    });
  }

  /* Garis nol. */
  if (batasBawah < 0 && batasAtas > 0) {
    const xNol = skalaX(0);
    tambah(svg, "line", {
      x1: xNol,
      y1: atas,
      x2: xNol,
      y2: dasar,
      class: "graf-nol",
    });
  }

  /* Garis median P50. */
  const p50 = ringkasan.labaP50;
  if (Number.isFinite(p50) && p50 >= batasBawah && p50 <= batasAtas) {
    const xMedian = skalaX(p50);
    tambah(svg, "line", {
      x1: xMedian,
      y1: atas,
      x2: xMedian,
      y2: dasar,
      class: "graf-median",
    });
    const diKanan = xMedian > kiri + lebarPlot * 0.72;
    tambahTeks(
      svg,
      diKanan ? xMedian - 6 : xMedian + 6,
      atas + 4,
      `P50 ${rupiahRingkas(p50)}`,
      "graf-teks-kecil",
      { "text-anchor": diKanan ? "end" : "start" }
    );
  }

  /* Label sumbu X: minimum, nol (jika dalam rentang), maksimum. */
  const yLabelX = dasar + 18;
  tambahTeks(svg, kiri, yLabelX, rupiahRingkas(batasBawah), "graf-teks", {
    "text-anchor": "start",
  });
  tambahTeks(svg, kiri + lebarPlot, yLabelX, rupiahRingkas(batasAtas), "graf-teks", {
    "text-anchor": "end",
  });

  if (batasBawah < 0 && batasAtas > 0) {
    const xNol = skalaX(0);
    if (xNol - kiri > 58 && kiri + lebarPlot - xNol > 58) {
      tambahTeks(svg, xNol, yLabelX, "Rp0", "graf-teks", {
        "text-anchor": "middle",
      });
    }
  }

  /* Legenda. */
  const legendaX = kiri + lebarPlot - 146;
  const legendaY = 13;
  tambah(svg, "rect", {
    x: legendaX,
    y: legendaY - 9,
    width: 10,
    height: 10,
    rx: 2,
    class: "graf-rugi",
  });
  tambahTeks(svg, legendaX + 15, legendaY, "Rugi", "graf-legend");
  tambah(svg, "rect", {
    x: legendaX + 62,
    y: legendaY - 9,
    width: 10,
    height: 10,
    rx: 2,
    class: "graf-untung",
  });
  tambahTeks(svg, legendaX + 77, legendaY, "Untung", "graf-legend");

  const caption = document.createElement("figcaption");
  caption.textContent = `Distribusi laba dari ${formatAngka(iterasi)} simulasi. P5 ${formatRupiah(
    ringkasan.labaP5
  )}, P50 ${formatRupiah(p50)}, P95 ${formatRupiah(ringkasan.labaP95)}.`;

  wadah.append(svg, caption);
}

/* -------------------------------------------------------------------------
   Grafik 2 — tornado sensitivitas (viewBox 720 × 280)
   ------------------------------------------------------------------------- */

function renderTornado(wadah, data) {
  /* Urutkan sendiri secara defensif: kontrak meminta dampak menurun. */
  const item = (Array.isArray(data.sensitivitas) ? data.sensitivitas : [])
    .filter((baris) => baris && typeof baris === "object")
    .slice()
    .sort((a, b) => dampakBaris(b) - dampakBaris(a))
    .slice(0, 4);

  if (item.length === 0) {
    kosongkanGrafik(wadah);
    return;
  }

  const LEBAR = 720;
  const TINGGI = 280;
  const kiri = 140;
  const kanan = 108;
  const atas = 34;
  const bawah = 40;
  const lebarPlot = LEBAR - kiri - kanan;
  const tinggiPlot = TINGGI - atas - bawah;
  const tengah = kiri + lebarPlot / 2;

  const semuaNilai = item.flatMap((baris) => [baris.labaRendah, baris.labaTinggi]);
  const maksAbsolut = Math.max(1, ...semuaNilai.map((nilai) => Math.abs(bilangan(nilai))));
  const skala = (nilai) => tengah + (nilai / maksAbsolut) * (lebarPlot / 2 - 6);
  const tinggiBaris = tinggiPlot / item.length;

  wadah.replaceChildren();

  const svg = buatSvg(
    `0 0 ${LEBAR} ${TINGGI}`,
    "Diagram tornado: variabel yang paling memengaruhi laba"
  );

  /* Garis nol vertikal di tengah area batang. */
  tambah(svg, "line", {
    x1: tengah,
    y1: atas - 8,
    x2: tengah,
    y2: atas + tinggiPlot + 6,
    class: "graf-nol",
  });

  tambahTeks(svg, kiri, 14, "Laba pada P10 dan P90", "graf-teks-kecil");

  for (const nilai of [-maksAbsolut, 0, maksAbsolut]) {
    const x = skala(nilai);
    const anchor = nilai < 0 ? "end" : nilai > 0 ? "start" : "middle";
    tambahTeks(
      svg,
      nilai === 0 ? x : x + (nilai < 0 ? -4 : 4),
      atas + tinggiPlot + 20,
      rupiahRingkas(nilai),
      "graf-teks-kecil",
      { "text-anchor": anchor }
    );
  }

  item.forEach((baris, indeks) => {
    const y = atas + tinggiBaris * (indeks + 0.5);
    const tebal = Math.min(26, tinggiBaris * 0.54);
    const rendah = bilangan(baris.labaRendah);
    const tinggiNilai = bilangan(baris.labaTinggi);
    const xRendah = skala(rendah);
    const xTinggi = skala(tinggiNilai);
    const xNol = skala(0);

    /* Batang dipecah pada titik nol agar warna rugi/untung benar. */
    if (rendah >= 0) {
      tambah(svg, "rect", {
        x: Math.min(xRendah, xTinggi),
        y: y - tebal / 2,
        width: Math.max(Math.abs(xTinggi - xRendah), 1),
        height: tebal,
        rx: 4,
        class: "graf-untung",
      });
    } else if (tinggiNilai <= 0) {
      tambah(svg, "rect", {
        x: Math.min(xRendah, xTinggi),
        y: y - tebal / 2,
        width: Math.max(Math.abs(xTinggi - xRendah), 1),
        height: tebal,
        rx: 4,
        class: "graf-rugi",
      });
    } else {
      tambah(svg, "rect", {
        x: Math.min(xRendah, xNol),
        y: y - tebal / 2,
        width: Math.max(Math.abs(xNol - xRendah), 1),
        height: tebal,
        rx: 4,
        class: "graf-rugi",
      });
      tambah(svg, "rect", {
        x: Math.min(xNol, xTinggi),
        y: y - tebal / 2,
        width: Math.max(Math.abs(xTinggi - xNol), 1),
        height: tebal,
        rx: 4,
        class: "graf-untung",
      });
    }

    tambahTeks(
      svg,
      kiri - 12,
      y + 4,
      baris.label || baris.kunci || "Variabel",
      "graf-teks-kuat",
      { "text-anchor": "end" }
    );

    /* Nilai di ujung batang. */
    tambahTeks(
      svg,
      xRendah < xTinggi ? xRendah - 6 : xRendah + 6,
      y + 4,
      rupiahRingkas(rendah),
      "graf-teks-kecil",
      { "text-anchor": xRendah < xTinggi ? "end" : "start" }
    );
    tambahTeks(
      svg,
      xTinggi < xRendah ? xTinggi - 6 : xTinggi + 6,
      y + 4,
      rupiahRingkas(tinggiNilai),
      "graf-teks-kecil",
      { "text-anchor": xTinggi < xRendah ? "end" : "start" }
    );
  });

  const teratas = item[0];
  const caption = document.createElement("figcaption");
  caption.textContent = `Dampak terbesar: ${teratas.label || teratas.kunci} (${formatRupiah(
    teratas.dampak
  )}). Batang menunjukkan laba pada posisi P10 dan P90 setiap variabel.`;

  wadah.append(svg, caption);
}

/* -------------------------------------------------------------------------
   Grafik 3 — sapuan harga (viewBox 720 × 300)
   ------------------------------------------------------------------------- */

function renderHarga(wadah, data, skenario) {
  const hasilHarga = data && data.harga ? data.harga : null;
  const sapuan = hasilHarga && Array.isArray(hasilHarga.sapuan) ? hasilHarga.sapuan : null;

  if (!sapuan || sapuan.length === 0) {
    kosongkanGrafik(wadah);
    return;
  }

  const titik = sapuan
    .filter((baris) => baris && Number.isFinite(baris.harga))
    .slice()
    .sort((a, b) => a.harga - b.harga);

  if (titik.length === 0) {
    kosongkanGrafik(wadah);
    return;
  }

  const LEBAR = 720;
  const TINGGI = 300;
  const kiri = 72;
  const kanan = 24;
  const atas = 36;
  const bawah = 50;
  const lebarPlot = LEBAR - kiri - kanan;
  const tinggiPlot = TINGGI - atas - bawah;
  const dasar = atas + tinggiPlot;

  const hargaMin = Math.min(...titik.map((baris) => baris.harga));
  const hargaMaks = Math.max(...titik.map((baris) => baris.harga));
  const nilaiLaba = titik
    .map((baris) => baris.labaRataRata)
    .filter((nilai) => Number.isFinite(nilai));

  const minimum = Math.min(0, ...nilaiLaba);
  const maksimum = Math.max(0, ...nilaiLaba);
  const rentang = maksimum - minimum || 1;
  const yMin = minimum - rentang * 0.12;
  const yMax = maksimum + rentang * 0.12;

  const skalaX = (harga) =>
    kiri + ((harga - hargaMin) / (hargaMaks - hargaMin || 1)) * lebarPlot;
  const skalaY = (nilai) =>
    dasar - ((nilai - yMin) / (yMax - yMin || 1)) * tinggiPlot;

  wadah.replaceChildren();

  const svg = buatSvg(
    `0 0 ${LEBAR} ${TINGGI}`,
    "Pencari harga jual: laba rata-rata dan risiko pada setiap harga"
  );

  /* Grid horizontal + label sumbu Y. */
  const posisiGridY = [];
  for (let i = 1; i <= 4; i += 1) {
    const nilai = yMin + ((yMax - yMin) * i) / 4;
    const y = skalaY(nilai);
    posisiGridY.push(y);
    tambah(svg, "line", {
      x1: kiri,
      y1: y,
      x2: kiri + lebarPlot,
      y2: y,
      class: "graf-grid",
    });
    tambahTeks(svg, kiri - 10, y + 4, rupiahRingkas(nilai), "graf-teks-kecil", {
      "text-anchor": "end",
    });
  }

  tambahTeks(svg, kiri, 14, "Laba rata-rata per bulan", "graf-teks-kecil");

  /* Area di bawah garis, dengan opasitas rendah. */
  const yNol = skalaY(0);
  const titikGaris = titik.map(
    (baris) => `${skalaX(baris.harga)},${skalaY(baris.labaRataRata)}`
  );
  const titikArea = [
    `${skalaX(hargaMin)},${yNol}`,
    ...titikGaris,
    `${skalaX(hargaMaks)},${yNol}`,
  ].join(" ");

  tambah(svg, "polygon", { points: titikArea, class: "graf-area" });
  tambah(svg, "polyline", { points: titikGaris.join(" "), class: "graf-garis" });

  /* Garis nol. */
  if (yMin < 0 && yMax > 0) {
    tambah(svg, "line", {
      x1: kiri,
      y1: yNol,
      x2: kiri + lebarPlot,
      y2: yNol,
      class: "graf-nol",
    });
    tambahTeks(svg, kiri - 10, yNol + 4, "Rp0", "graf-teks-kecil", {
      "text-anchor": "end",
    });
  }

  tambah(svg, "line", {
    x1: kiri,
    y1: dasar,
    x2: kiri + lebarPlot,
    y2: dasar,
    class: "graf-sumbu",
  });

  /* Label sumbu X. */
  const yLabelX = dasar + 20;
  tambahTeks(svg, kiri, yLabelX, rupiahRingkas(hargaMin), "graf-teks", {
    "text-anchor": "start",
  });
  tambahTeks(
    svg,
    kiri + lebarPlot / 2,
    yLabelX,
    rupiahRingkas((hargaMin + hargaMaks) / 2),
    "graf-teks",
    { "text-anchor": "middle" }
  );
  tambahTeks(svg, kiri + lebarPlot, yLabelX, rupiahRingkas(hargaMaks), "graf-teks", {
    "text-anchor": "end",
  });

  /* Garis vertikal putus-putus untuk harga impas, bila dihitung dari asumsi mode. */
  const hargaImpas = hitungHargaImpas(skenario);
  if (
    Number.isFinite(hargaImpas) &&
    hargaImpas >= hargaMin &&
    hargaImpas <= hargaMaks
  ) {
    const xImpas = skalaX(hargaImpas);
    tambah(svg, "line", {
      x1: xImpas,
      y1: atas,
      x2: xImpas,
      y2: dasar,
      class: "graf-median",
    });
    const anchorImpas = xImpas > kiri + lebarPlot * 0.7 ? "end" : "start";
    tambahTeks(
      svg,
      anchorImpas === "end" ? xImpas - 5 : xImpas + 5,
      dasar - 8,
      `Impas ${rupiahRingkas(hargaImpas)}`,
      "graf-teks-kecil",
      { "text-anchor": anchorImpas }
    );
  }

  /* Penanda rekomendasi. */
  gambarPenanda(svg, hasilHarga.terbaik, "terbaik", {
    skalaX,
    skalaY,
    kiri,
    lebarPlot,
    atas,
    tinggiPlot,
  });
  gambarPenanda(svg, hasilHarga.teraman, "teraman", {
    skalaX,
    skalaY,
    kiri,
    lebarPlot,
    atas,
    tinggiPlot,
  });

  const caption = document.createElement("figcaption");
  const bagian = ["Garis menunjukkan laba rata-rata pada setiap titik harga."];
  if (Number.isFinite(hargaImpas)) {
    bagian.push(`Garis putus-putus menandai harga impas sekitar ${rupiahRingkas(hargaImpas)}.`);
  }
  if (hasilHarga.terbaik && Number.isFinite(hasilHarga.terbaik.harga)) {
    bagian.push(
      `Laba terbaik pada ${formatRupiah(hasilHarga.terbaik.harga)}; risiko terendah pada ${
        hasilHarga.teraman && Number.isFinite(hasilHarga.teraman.harga)
          ? formatRupiah(hasilHarga.teraman.harga)
          : "—"
      }.`
    );
  }
  caption.textContent = bagian.join(" ");

  wadah.append(svg, caption);
}

function gambarPenanda(svg, item, jenis, geometri) {
  if (!item || !Number.isFinite(item.harga) || !Number.isFinite(item.labaRataRata)) {
    return;
  }

  const { skalaX, skalaY, kiri, lebarPlot, atas, tinggiPlot } = geometri;
  const x = skalaX(item.harga);
  const y = skalaY(item.labaRataRata);

  tambah(svg, "circle", {
    cx: x,
    cy: y,
    r: 5,
    class: jenis === "terbaik" ? "graf-titik-terbaik" : "graf-titik-teraman",
  });

  const label = `${jenis === "terbaik" ? "Terbaik" : "Teraman"} ${rupiahRingkas(item.harga)}`;
  const lebarLabel = Math.min(180, label.length * 6.4 + 14);
  const tinggiLabel = 18;

  let xLabel = x - lebarLabel / 2;
  xLabel = Math.max(kiri, Math.min(xLabel, kiri + lebarPlot - lebarLabel));

  let yLabel = jenis === "terbaik" ? y - 30 : y + 14;
  yLabel = Math.max(atas, Math.min(yLabel, atas + tinggiPlot - tinggiLabel));

  tambah(svg, "rect", {
    x: xLabel,
    y: yLabel,
    width: lebarLabel,
    height: tinggiLabel,
    rx: 4,
    class: jenis === "terbaik" ? "graf-tanda-terbaik" : "graf-tanda-teraman",
  });

  tambahTeks(
    svg,
    xLabel + lebarLabel / 2,
    yLabel + 12.5,
    label,
    "graf-teks-kecil",
    { "text-anchor": "middle" }
  );
}

function hitungHargaImpas(skenario) {
  if (!skenario || typeof skenario !== "object") return null;
  const variabel = skenario.biayaVariabel ? skenario.biayaVariabel.mode : null;
  const tetap = skenario.biayaTetap ? skenario.biayaTetap.mode : null;
  const permintaan = skenario.permintaan ? skenario.permintaan.mode : null;

  if (
    !Number.isFinite(variabel) ||
    !Number.isFinite(tetap) ||
    !Number.isFinite(permintaan) ||
    permintaan <= 0
  ) {
    return null;
  }

  /* Sama dengan CONTRACT §3.9: bagi dengan max(permintaan.mode, 1). */
  return variabel + tetap / Math.max(permintaan, 1);
}

/* -------------------------------------------------------------------------
   Cetak
   ------------------------------------------------------------------------- */

function jadwalkanCetakOtomatis() {
  if (!cetakDiminta || sudahMencetakOtomatis) return;
  sudahMencetakOtomatis = true;
  window.clearTimeout(pewaktuCetak);
  /* Beri kesempatan grafik dan font sistem selesai dilukis. */
  pewaktuCetak = window.setTimeout(() => {
    window.print();
  }, 400);
}
