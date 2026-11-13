// Logika halaman: ikon, tombol WhatsApp, isi layanan, cerita 3D yang mengikuti scroll.
const WA = "6281327660660";
const ICON = (n) => `<svg viewBox="0 0 256 256" fill="currentColor">${(window.ICONS || {})[n] || ""}</svg>`;
const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

// ---------------------------------------------------------------- isi cerita per fase
const JOBS = {
  ac: { n: 1, t: "Service AC", h: "Teknisi menyemprot AC sampai bersih", p: "Unit dicuci dengan semprotan air, kotoran ditampung plastik dan ember. Setelah selesai, udara dingin kembali keluar.", tags: ["Cuci AC", "Cek freon", "Perbaikan"],
    g: { h: "Garansi 30 hari", p: "Di Rejeki Utama AC, Anda mendapat garansi 30 hari: garansi netes dan garansi tidak dingin!" } },
  pasang: { n: 2, t: "Pasang AC", h: "AC baru terpasang rapi di dinding", p: "Bracket dipasang, unit diangkat ke posisinya, outdoor ditempatkan dan pipa disambung. Begitu dinyalakan, ruangan langsung sejuk.", tags: ["Penjualan unit", "Instalasi", "Bongkar pasang"] },
  toren: { n: 3, t: "Pembersihan toren", h: "Toren dikuras sampai air kembali jernih", p: "Teknisi naik ke atap, membuka tutup toren dan menyikat endapan. Air keruh dibuang sampai yang keluar benar-benar bersih.", tags: ["Bebas endapan", "Air lebih sehat"] },
  jet: { n: 4, t: "High pressure cleaning", h: "Jalan berlumut kembali bersih", p: "Semprotan air bertekanan tinggi mengangkat lumut dan kotoran dari lantai, paving dan dinding.", tags: ["Paving", "Lantai", "Dinding", "Area industri"],
    g: { h: "Pasti bersih atau tidak dibayar!", p: "Dengan jasa kami, masalah bersih-bersih Anda beres. Kami jamin pasti bersih atau tidak dibayar!" } },
  cctv: { n: 5, t: "CCTV", h: "Kamera terpasang, area terpantau", p: "CCTV dipasang di titik yang tepat lalu diatur sudut pandangnya, supaya rumah, kantor atau area bisnis Anda terpantau.", tags: ["Paket lengkap", "Perbaikan"] },
  apar: { n: 6, t: "APAR", h: "Tabung pemadam siap dipakai", p: "Tekanan tabung diperiksa dan diisi ulang sampai jarum kembali di zona hijau, lalu APAR dipasang lagi di tempatnya.", tags: ["Penjualan", "Isi ulang", "Perawatan"],
    g: { h: "Keamanan dan kenyamanan nomor 1", p: "Pembelian tabung pemadam kami beri garansi 2 tahun, isi ulang kami garansi 6 bulan. Worry free!" } },
  solar: { n: 7, t: "Solar water heater", h: "Pemanas air tenaga surya kembali maksimal", p: "Tabung kolektor yang kusam dibersihkan satu per satu agar panas matahari terserap penuh dan air panas kembali lancar.", tags: ["Perawatan rutin", "Lebih awet"] },
  hunian: { n: 8, t: "Pembersihan hunian kosong", h: "Rumah kosong rapi dan siap ditempati", p: "Rumput liar dipangkas, sampah dikumpulkan ke kantong dan halaman dibersihkan sampai rumah siap digunakan lagi.", tags: ["Rumput liar", "Sampah", "Debu"],
    g: { h: "Pasti bersih atau tidak dibayar!", p: "Dengan jasa kami, masalah bersih-bersih Anda beres. Kami jamin pasti bersih atau tidak dibayar!" } },
};
function slideHtml(id) {
  if (id === "intro") return `<p class="eyebrow">Rejeki Utama AC, sejak 1996</p>
    <h1 class="h1">Satu pesan WhatsApp, teknisi berangkat.</h1>
    <p class="body">Scroll pelan-pelan dan lihat bagaimana pesanan pelanggan kami dikerjakan, dari chat pertama sampai beres.</p>`;
  if (id === "order") return `<p class="eyebrow"><i data-i="chat-circle-dots"></i>Pesanan masuk</p>
    <h2>Pelanggan memesan dari rumah, kantor dan toko</h2>
    <p class="body">Ada yang minta service AC, pasang AC baru, bersihkan toren, sampai cuci jalan dengan air bertekanan tinggi.</p>`;
  if (id === "cs") return `<p class="eyebrow"><i data-i="headset"></i>Customer service</p>
    <h2>Tiga admin CS siap menerima pesanan</h2>
    <p class="body">Pesanan langsung dicatat, biaya disampaikan di depan, lalu tugas dibagi ke teknisi yang tepat. Tidak ada pesan yang menunggu lama.</p>`;
  if (id === "dispatch") return `<p class="eyebrow"><i data-i="person-simple-walk"></i>Teknisi berangkat</p>
    <h2>Setiap teknisi menuju pekerjaannya masing-masing</h2>
    <p class="body">Seragam, alat dan jadwal sudah siap. Satu tim, delapan pekerjaan berbeda, berjalan bersamaan.</p>`;
  if (id === "done") return `<p class="eyebrow"><i data-i="seal-check"></i>Semua beres</p>
    <h2>Pekerjaan selesai, pelanggan tenang</h2>
    <p class="body">Lebih dari 1.000 pelanggan kami layani setiap bulan. Giliran Anda berikutnya?</p>
    <div class="row"><a class="btn btn-wa" data-wa="Halo Rejeki Utama AC, saya mau pesan layanan." href="#"><i data-i="whatsapp-logo"></i>Pesan lewat WhatsApp</a>
    <a class="btn btn-ghost" href="#layanan">Lihat layanan</a></div>`;
  const j = JOBS[id.slice(4)];
  return `<p class="eyebrow"><span class="n">${j.n}/8</span>${j.t}</p>
    <h2>${j.h}</h2><p class="body">${j.p}</p>
    <div class="tags">${j.tags.map((x) => `<span>${x}</span>`).join("")}</div>${j.g ? `<div class="gar"><i data-i="shield-check"></i><div><b>${j.g.h}</b><p>${j.g.p}</p></div></div>` : ""}`;
}

// ---------------------------------------------------------------- layanan, keunggulan, segmen
const SERVICES = [
  ["snowflake", "Service dan perawatan AC", "Cuci, cek freon dan perawatan rutin agar AC dingin, hemat listrik dan awet.", "service AC"],
  ["wrench", "Perbaikan AC", "AC tidak dingin, bocor atau berisik? Kami cari sumber masalahnya.", "perbaikan AC"],
  ["wind", "Penjualan dan pasang AC", "Berbagai merek dengan garansi resmi, termasuk instalasi dan bongkar pasang.", "pasang AC baru"],
  ["buildings", "Kontrak perawatan gedung", "Preventive maintenance terjadwal untuk kantor, hotel, rumah sakit dan pabrik.", "kontrak perawatan AC gedung"],
  ["drop", "Pembersihan toren", "Toren dikuras dan disikat agar air bersih, sehat dan bebas endapan.", "pembersihan toren"],
  ["drop-half", "High pressure cleaning", "Air bertekanan tinggi untuk lantai, paving, dinding dan area industri.", "high pressure cleaning"],
  ["security-camera", "CCTV", "Paket CCTV lengkap dan perbaikan untuk rumah, kantor dan area bisnis.", "pasang CCTV"],
  ["fire-extinguisher", "APAR", "Penjualan, perawatan dan isi ulang alat pemadam api ringan.", "APAR"],
  ["sun", "Solar water heater", "Perawatan rutin agar pemanas air bekerja maksimal, efisien dan awet.", "perawatan solar water heater"],
  ["broom", "Pembersihan hunian kosong", "Rumput liar, sampah dan debu dibersihkan sampai rapi dan siap digunakan.", "pembersihan hunian kosong"],
];
const WHY = [
  ["user-gear", "Teknisi berpengalaman", "Ditangani teknisi yang paham pekerjaannya."],
  ["sparkle", "Pekerjaan rapi", "Hasil kerja bersih, rapi dan tahan lama."],
  ["clock", "Cepat dan tepat waktu", "Datang sesuai jadwal, kerja cepat."],
  ["tag", "Harga transparan", "Harga jelas di depan, tanpa biaya tersembunyi."],
];
const SEGMEN = ["Rumah tinggal", "Gedung", "Hotel", "Rumah sakit", "Kantor", "Pabrik", "Kampus", "Instansi pemerintah", "BUMN dan BUMD", "Perusahaan"];

document.getElementById("svcGrid").innerHTML = SERVICES.map(([ic, h, p, wa]) =>
  `<a class="card reveal" data-wa="Halo Rejeki Utama AC, saya mau pesan ${wa}." href="#"><i data-i="${ic}"></i><h3 class="h3">${h}</h3><p>${p}</p><span class="go">Pesan sekarang<i data-i="arrow-right"></i></span></a>`).join("");
document.getElementById("whyGrid").innerHTML = WHY.map(([ic, h, p]) => `<div class="card reveal"><i data-i="${ic}"></i><h3 class="h3">${h}</h3><p>${p}</p></div>`).join("");
document.getElementById("segmen").innerHTML = SEGMEN.map((s) => `<span class="reveal"><i data-i="check-circle"></i>${s}</span>`).join("");

// ---------------------------------------------------------------- tagline kata per kata
const lit = document.getElementById("lit");
lit.innerHTML = lit.textContent.trim().split(/\s+/).map((w) => `<span>${w}</span>`).join(" ");
const litWords = [...lit.children];

// ---------------------------------------------------------------- isi ikon & tautan WA (dipanggil ulang setelah konten dinamis)
function hydrate(root = document) {
  root.querySelectorAll("i[data-i]:not(.ok)").forEach((el) => { el.innerHTML = ICON(el.dataset.i); el.classList.add("ok"); el.setAttribute("aria-hidden", "true"); });
  root.querySelectorAll("[data-wa]:not(.ok)").forEach((el) => { el.href = waLink(el.dataset.wa); el.target = "_blank"; el.rel = "noopener"; el.classList.add("ok"); });
}
if (window.RU_LOGO) ["navLogo", "footLogo"].forEach((id) => (document.getElementById(id).src = window.RU_LOGO));
if (window.NX_LOGO) document.getElementById("nxLogo").src = window.NX_LOGO;
document.getElementById("yr").textContent = new Date().getFullYear();

// ---------------------------------------------------------------- muncul saat terlihat
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el, i) => { el.style.transitionDelay = (i % 4) * 80 + "ms"; io.observe(el); });

// ---------------------------------------------------------------- cerita 3D
const story = document.getElementById("cerita");
const canvas = document.getElementById("scene");
const panel = document.getElementById("panel");
const stepsEl = document.getElementById("steps");
const hint = document.getElementById("hint");
const mobile = () => window.innerWidth <= 860;
let world = null, phases = null, total = 1;

try {
  const mod = await import("./world.js");
  phases = mod.PHASES; total = mod.PHASES.total;
  world = mod.createWorld(canvas, { mobile: mobile(), offsetFn: (w, h) => (w > 860 ? 1 : 0) });
} catch (err) {
  console.error(err);
  canvas.hidden = true; document.getElementById("fallback").hidden = false;
}

// tinggi area cerita: 60vh per unit waktu cerita
const UNIT_VH = 62;
story.style.setProperty("--story-h", `calc(${(total * UNIT_VH).toFixed(0)}vh + 100vh)`);

const ids = phases ? phases.map((p) => p.id) : ["intro"];
panel.innerHTML = ids.map((id) => `<div class="slide" data-id="${id}">${slideHtml(id)}</div>`).join("");
const slides = [...panel.children];
stepsEl.innerHTML = ids.map(() => "<b></b>").join("");
const dots = [...stepsEl.children];
hydrate();

function sizePanel() { // tinggi panel di HP = slide tertinggi
  if (!mobile()) { panel.style.removeProperty("--panel-h"); return; }
  panel.style.setProperty("--panel-h", Math.max(...slides.map((s) => s.offsetHeight)) + "px");
}
function resize() {
  sizePanel();
  if (world) world.resize(canvas.clientWidth, canvas.clientHeight);
}
addEventListener("resize", resize);
resize();

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let tTarget = 0, tSmooth = 0, active = -1;
const pointer = { x: 0, y: 0 }, pointerS = { x: 0, y: 0 };
addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; } });

function readScroll() {
  const r = story.getBoundingClientRect();
  const range = story.offsetHeight - innerHeight;
  tTarget = Math.min(1, Math.max(0, -r.top / range)) * total;
  // tagline
  const lr = lit.getBoundingClientRect();
  const k = Math.min(1, Math.max(0, (innerHeight * 0.85 - lr.top) / (lr.height + innerHeight * 0.35)));
  const n = Math.round(k * litWords.length);
  litWords.forEach((w, i) => w.classList.toggle("on", i < n));
}
addEventListener("scroll", readScroll, { passive: true });
readScroll(); tSmooth = tTarget;

function setActive(t) {
  if (!phases) return;
  let i = phases.findIndex((p) => t < p.end); if (i < 0) i = phases.length - 1;
  const ph = phases[i], u = (t - ph.start) / (ph.end - ph.start);
  slides[i].classList.toggle("g-on", u > 0.5);
  if (i === active) return;
  active = i;
  slides.forEach((s, j) => s.classList.toggle("on", j === i));
  dots.forEach((d, j) => d.classList.toggle("on", j === i));
}

function frame() {
  tSmooth += (tTarget - tSmooth) * (reduce ? 1 : 0.1);
  if (Math.abs(tTarget - tSmooth) < 0.0005) tSmooth = tTarget;
  pointerS.x += (pointer.x - pointerS.x) * 0.05; pointerS.y += (pointer.y - pointerS.y) * 0.05;
  setActive(tSmooth);
  hint.style.opacity = tSmooth > 0.4 ? 0 : 1;
  const r = story.getBoundingClientRect();
  if (world && r.bottom > 0 && r.top < innerHeight) world.render(tSmooth, pointerS);
  document.body.classList.toggle("instory", r.bottom > innerHeight * 0.6);
  requestAnimationFrame(frame);
}
if (!world) { slides.forEach((s, j) => s.classList.toggle("on", j === 0)); }
requestAnimationFrame(frame);

// untuk pengujian
window.__story = { setT: (t) => { tTarget = tSmooth = t; }, total, phases };
